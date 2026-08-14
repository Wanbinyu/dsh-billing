/**
 * The `billing` projection unit: a pure fold of request headers and
 * provider-reported usage into per-provider/per-model token buckets, priced
 * at view time by the plugin's resolved config with the built-in USD catalog as
 * fallback when the projection currency is USD. Attribution follows the
 * request header: usage samples inside one step belong to the provider/model
 * of the `request/header` event that opened it, and a later header (a provider
 * or model switch, or a resume) redirects subsequent samples.
 *
 * The fold keeps state config-independent — token buckets only — so a
 * price, currency, quota, or catalog change at runtime remounts the unit
 * and the persisted projection cache stays valid: the old rows replay the
 * same buckets and only the view re-prices them.
 *
 * @module dsh-billing/projection
 */

import { z } from 'zod'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { BillingModelPrice, BillingProjection } from './types.ts'
import type { CatalogEntry } from './catalog.ts'

/** Fallback identity for usage with no preceding `request/header` event. */
export const UNKNOWN_MODEL = '(unknown)'

/** Currency used by the generated built-in catalog. */
const BUILTIN_CATALOG_CURRENCY = 'USD'

/** Separator joining provider and model into one bucket key (JSON-safe, never in ids). */
const KEY_SEPARATOR = '\u0001'

/** Per-model token buckets; prices never enter the fold state. */
interface ModelBuckets {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** One bucket: token totals plus the header identity that owns them. */
interface Bucket extends ModelBuckets {
  provider: string
  model: string
}

/** The last usage sample's step coordinates, for same-step replacement. */
interface UsageSample {
  turn: number
  step: number
  key: string
  provider: string
  model: string
  buckets: ModelBuckets
}

/** Fold state (plain JSON per the unit contract). */
interface BillingState {
  /** Provider/model of the newest `request/header`; null before the first. */
  header: { provider: string; model: string } | null
  /** Token buckets keyed by provider + KEY_SEPARATOR + model. */
  buckets: Record<string, Bucket>
  /** Model ids with usage but no resolved price, ascending. */
  unpriced: string[]
  /** Newest usage sample; null before the first. */
  last: UsageSample | null
}

const zeroBuckets = (): ModelBuckets => ({
  uncachedInputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
})

const bucketsFrom = (usage: TokenUsage): ModelBuckets => ({
  uncachedInputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  cacheReadTokens: usage.cacheReadTokens ?? 0,
  cacheWriteTokens: usage.cacheWriteTokens ?? 0,
})

const bucketsEqual = (left: ModelBuckets, right: ModelBuckets): boolean =>
  left.uncachedInputTokens === right.uncachedInputTokens
  && left.outputTokens === right.outputTokens
  && left.cacheReadTokens === right.cacheReadTokens
  && left.cacheWriteTokens === right.cacheWriteTokens

/** The usage a chunk or finalized message reports for its step, if any. */
const usageOf = (event: SessionEvent): TokenUsage | undefined =>
  event.type === 'assistant/chunk' && event.data.chunk.type === 'usage'
    ? event.data.chunk.usage
    : event.type === 'assistant/message'
      ? event.data.usage
      : undefined

const keyOf = (provider: string, model: string): string => provider + KEY_SEPARATOR + model

/**
 * Add `buckets` (signed) to the bucket's running total without mutating
 * `state` — the caller spreads the result into the next state.
 */
const addBuckets = (
  state: BillingState,
  key: string,
  provider: string,
  model: string,
  buckets: ModelBuckets,
  sign: 1 | -1,
): BillingState => {
  const previous = state.buckets[key] ?? { provider, model, ...zeroBuckets() }
  const next: Bucket = {
    provider,
    model,
    uncachedInputTokens: previous.uncachedInputTokens + sign * buckets.uncachedInputTokens,
    outputTokens: previous.outputTokens + sign * buckets.outputTokens,
    cacheReadTokens: previous.cacheReadTokens + sign * buckets.cacheReadTokens,
    cacheWriteTokens: previous.cacheWriteTokens + sign * buckets.cacheWriteTokens,
  }
  return { ...state, buckets: { ...state.buckets, [key]: next } }
}

/** Insert `model` into the ascending `unpriced` list when absent. */
const noteUnpriced = (state: BillingState, model: string): BillingState => {
  if (state.unpriced.includes(model)) return state
  const next = [...state.unpriced, model].sort()
  return { ...state, unpriced: next }
}

/**
 * Round a money figure to six decimals so every snapshot is deterministic
 * and schema-stable at micro-unit precision.
 */
const roundMoney = (value: number): number => Math.round(value * 1e6) / 1e6

/** Price one bucket set; an unresolvable price prices at zero. */
const costOf = (price: BillingModelPrice | CatalogEntry | undefined, buckets: ModelBuckets): number =>
  price === undefined
    ? 0
    : (price.input * buckets.uncachedInputTokens
      + price.output * buckets.outputTokens
      + (price.cacheRead ?? 0) * buckets.cacheReadTokens
      + (price.cacheWrite ?? 0) * buckets.cacheWriteTokens) / 1e6

/**
 * Resolve one bucket's price: the deployment's Config (keyed by model id)
 * wins over the built-in USD catalog (keyed by provider/model). The catalog
 * is disabled for other currencies so its USD figures cannot be mislabeled.
 */
const resolvePrice = (
  prices: Record<string, BillingModelPrice>,
  catalog: Record<string, Record<string, CatalogEntry>>,
  currency: string,
  provider: string,
  model: string,
): BillingModelPrice | CatalogEntry | undefined =>
  prices[model] ?? (currency === BUILTIN_CATALOG_CURRENCY ? catalog[provider]?.[model] : undefined)

/**
 * Billing's session projection unit.
 *
 * A usage chunk provides an early sample that survives a later request
 * failure; an assistant message provides the final sample for the same
 * turn/step and replaces the earlier one instead of double counting. The
 * single `last` slot relies on the session-log invariant that usage reports
 * for one turn/step are adjacent: once a later step begins, a legal log
 * never reports usage for an earlier step again.
 */
export const billingProjectionDefinition = (
  resolved: {
    prices: Record<string, BillingModelPrice>
    catalog: Record<string, Record<string, CatalogEntry>>
    currency: string
    quotaLimit: number | undefined
  },
): ProjectionDefinition<'billing', BillingState> => {
  const schema = z.object({
    currency: z.string(),
    totalCost: z.number().nonnegative(),
    models: z.array(z.object({
      model: z.string(),
      cost: z.number().nonnegative(),
      uncachedInputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
      cacheReadTokens: z.number().int().nonnegative(),
      cacheWriteTokens: z.number().int().nonnegative(),
    }).strict()),
    unpricedModels: z.array(z.string()),
    quota: z.object({
      limit: z.number().positive(),
      used: z.number().nonnegative(),
      remaining: z.number().nonnegative(),
      percent: z.number().min(0).max(1),
    }).strict().optional(),
  }).strict() as unknown as z.ZodType<BillingProjection>

  return {
    key: 'billing',
    schema,
    init: () => ({ header: null, buckets: {}, unpriced: [], last: null }),
    apply: (state, event) => {
      if (event.type === 'request/header') {
        const header = { provider: event.data.header.config.provider, model: event.data.header.config.model }
        if (state.header !== null && state.header.provider === header.provider && state.header.model === header.model) {
          return state
        }
        return { ...state, header }
      }

      if (event.type !== 'assistant/chunk' && event.type !== 'assistant/message') return state
      const usage = usageOf(event)
      if (usage === undefined) return state
      const { turn, step } = event.data
      const provider = state.header?.provider ?? UNKNOWN_MODEL
      const model = state.header?.model ?? UNKNOWN_MODEL
      const key = keyOf(provider, model)
      const buckets = bucketsFrom(usage)

      const previous = state.last !== null && state.last.turn === turn && state.last.step === step
        ? state.last
        : null
      if (previous !== null && bucketsEqual(previous.buckets, buckets)) return state

      let next = state
      if (previous !== null) next = addBuckets(next, previous.key, previous.provider, previous.model, previous.buckets, -1)
      next = addBuckets(next, key, provider, model, buckets, 1)
      next = { ...next, last: { turn, step, key, provider, model, buckets } }
      return resolvePrice(resolved.prices, resolved.catalog, resolved.currency, provider, model) === undefined
        ? noteUnpriced(next, model)
        : next
    },
    view: (state) => {
      const grouped = new Map<string, { model: string; cost: number } & ModelBuckets>()
      for (const bucket of Object.values(state.buckets)) {
        const price = resolvePrice(resolved.prices, resolved.catalog, resolved.currency, bucket.provider, bucket.model)
        const cost = roundMoney(costOf(price, bucket))
        const row = grouped.get(bucket.model)
        if (row === undefined) {
          grouped.set(bucket.model, {
            model: bucket.model,
            cost,
            uncachedInputTokens: bucket.uncachedInputTokens,
            outputTokens: bucket.outputTokens,
            cacheReadTokens: bucket.cacheReadTokens,
            cacheWriteTokens: bucket.cacheWriteTokens,
          })
        } else {
          row.cost = roundMoney(row.cost + cost)
          row.uncachedInputTokens += bucket.uncachedInputTokens
          row.outputTokens += bucket.outputTokens
          row.cacheReadTokens += bucket.cacheReadTokens
          row.cacheWriteTokens += bucket.cacheWriteTokens
        }
      }
      const models = [...grouped.values()].sort((a, b) => a.model.localeCompare(b.model))
      const totalCost = roundMoney(models.reduce((sum, row) => sum + row.cost, 0))
      const quota = resolved.quotaLimit === undefined ? undefined : {
        limit: resolved.quotaLimit,
        used: totalCost,
        remaining: Math.max(0, resolved.quotaLimit - totalCost),
        percent: Math.min(1, totalCost / resolved.quotaLimit),
      }
      const projection: BillingProjection = {
        currency: resolved.currency,
        totalCost,
        models,
        unpricedModels: [...state.unpriced],
        ...quota === undefined ? {} : { quota },
      }
      return projection
    },
    stateVersion: 2,
  }
}
