/**
 * Function plugin registering the `billing` projection unit: per-provider/model cost
 * accounting from provider-reported token usage, priced by validated config,
 * served through the session-projection seam (registry snapshot, change feed,
 * and every projection carrier). The plugin owns only pricing and the fold;
 * delivery is the seam's. Without a configured price a model's tokens still
 * count but cost zero and the model joins `unpricedModels`; with no
 * `quota` the view carries no quota progress. A model absent from both the
 * Config and the built-in catalog (generated from the installed pi-ai model
 * catalog) prices at zero and joins `unpricedModels` too.
 *
 * @module @deepseek-ai/dsh-billing
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { BillingConfig } from './types.ts'
import { BUILTIN_CATALOG } from './catalog.ts'
import { billingProjectionDefinition } from './projection.ts'

export type * from './types.ts'

/** Cordis plugin name. */
export const name = 'billing'

/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export const inject = ['sessionProjections']

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf('currency'))

/** Normalize and validate the ISO 4217 code before it reaches the client formatter. */
function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase()
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    throw new Error(`BillingConfig: currency must be a supported ISO 4217 code: "${value}"`)
  }
  return currency
}

/**
 * Plugin config: provider/model prices (with a model-only fallback), the currency, and an optional per-session
 * cost cap. Cache-read/cache-write prices default to zero when omitted; an
 * empty `models` map prices every model at zero while still counting its
 * tokens. The quota limit is strictly positive because the projection reports
 * a percentage of that limit.
 */
export const Config: z<BillingConfig> = z.object({
  models: z.dict(z.object({
    input: z.number().min(0),
    output: z.number().min(0),
    cacheRead: z.number().min(0).default(0),
    cacheWrite: z.number().min(0).default(0),
  })),
  currency: z.transform(z.string(), normalizeCurrency).default('USD'),
  // Schemastery exposes an inclusive minimum; the smallest positive finite
  // number gives this field the intended strictly-positive contract.
  quota: z.object({ limit: z.number().min(Number.MIN_VALUE) }),
})

/** Reject stale or misspelled keys before defaults can hide them. */
function validateConfigKeys(config: BillingConfig): void {
  for (const key of Object.keys(config)) {
    if (key !== 'models' && key !== 'currency' && key !== 'quota') {
      throw new Error(`BillingConfig: unknown key "${key}"`)
    }
  }
  for (const [model, price] of Object.entries(config.models)) {
    for (const key of Object.keys(price)) {
      if (key !== 'input' && key !== 'output' && key !== 'cacheRead' && key !== 'cacheWrite') {
        throw new Error(`BillingConfig: unknown key "${key}" in models["${model}"]`)
      }
    }
  }
  for (const key of Object.keys(config.quota ?? {})) {
    if (key !== 'limit') throw new Error(`BillingConfig: unknown key "${key}" in quota`)
  }
  const quotaLimit = config.quota?.limit
  if (quotaLimit !== undefined && !(quotaLimit > 0)) {
    throw new Error('BillingConfig: quota.limit must be greater than 0')
  }
}

/**
 * Register the `billing` unit with the resolved config; the registration is
 * an effect on this plugin's fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - the loader-validated plugin config.
 */
export function apply(ctx: Context, config: BillingConfig = { models: {}, currency: 'USD' }): void {
  validateConfigKeys(config)
  const currency = normalizeCurrency(config.currency)
  ctx.sessionProjections.register(billingProjectionDefinition({
    prices: config.models,
    catalog: BUILTIN_CATALOG,
    currency,
    quotaLimit: config.quota?.limit,
  }))
}
