/**
 * Function plugin registering the `billing` projection unit: per-model cost
 * accounting from provider-reported token usage, priced by validated config,
 * served through the session-projection seam (registry snapshot, change feed,
 * and every projection carrier). The plugin owns only pricing and the fold;
 * delivery is the seam's. Without a configured price a model's tokens still
 * count but cost zero and the model joins `unpricedModels`; with no
 * `quota` the view carries no quota progress.
 *
 * @module @deepseek-ai/dsh-billing
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { BillingConfig } from './types.ts'
import { billingProjectionDefinition } from './projection.ts'

export type * from './types.ts'

/** Cordis plugin name. */
export const name = 'billing'

/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export const inject = ['sessionProjections']

/**
 * Plugin config: per-model prices, the currency, and an optional per-session
 * cost cap. Cache-read/cache-write prices default to zero when omitted; an
 * empty `models` map prices every model at zero while still counting its
 * tokens.
 */
export const Config: z<BillingConfig> = z.object({
  models: z.dict(z.object({
    input: z.number().min(0),
    output: z.number().min(0),
    cacheRead: z.number().min(0).default(0),
    cacheWrite: z.number().min(0).default(0),
  })),
  currency: z.string().default('USD'),
  quota: z.object({ limit: z.number().min(0) }),
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
}

/**
 * Register the `billing` unit with the resolved config; the registration is
 * an effect on this plugin's fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - the loader-validated plugin config.
 */
export function apply(ctx: Context, config: BillingConfig = { models: {}, currency: 'USD' }): void {
  validateConfigKeys(config)
  ctx.sessionProjections.register(billingProjectionDefinition({
    prices: config.models,
    currency: config.currency,
    quotaLimit: config.quota?.limit,
  }))
}
