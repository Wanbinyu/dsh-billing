/**
 * Pure types of the billing domain: the ONE home of the `billing`
 * projection-key declaration, free of this package's host-side value imports
 * (cordis context, schemastery config, zod). Two namespace projections serve
 * it — `./types` for host consumers, `./client` for client aggregates —
 * with zero content duplication.
 *
 * @module @deepseek-ai/dsh-billing/types
 */

// Marks this file a module so the declaration below AUGMENTS the projection
// table instead of declaring an ambient module.
export {}

/** One model's prices in `currency` per one million tokens. */
export interface BillingModelPrice {
  /** Currency per 1M uncached input tokens. */
  input: number
  /** Currency per 1M output tokens. */
  output: number
  /** Currency per 1M cache-read tokens; absent prices cache reads at zero. */
  cacheRead?: number
  /** Currency per 1M cache-write tokens; absent prices cache writes at zero. */
  cacheWrite?: number
}

/** Deployment-configured billing rules (the plugin Config). */
export interface BillingConfig {
  /**
   * Prices keyed by `provider/model` for an exact route, or by model id as a
   * backwards-compatible fallback for every provider. A model without an
   * entry prices at zero and joins `unpricedModels`.
   */
  models: Record<string, BillingModelPrice>
  /** ISO 4217 currency code the prices and the quota are denominated in. */
  currency: string
  /** Optional per-session cost cap whose progress rides the projection view. */
  quota?: {
    /** Cost cap in `currency` for one session. */
    limit: number
  }
}

/** One model's accumulated accounting row in the projection view. */
export interface BillingModelRow {
  /** Provider route that supplied the usage. */
  provider: string
  /** Provider-owned model id the usage was attributed to. */
  model: string
  /** Monetary cost of this model's reported usage, rounded to six decimals. */
  cost: number
  /** Reported uncached input tokens. */
  uncachedInputTokens: number
  /** Reported output tokens. */
  outputTokens: number
  /** Reported cache-read tokens. */
  cacheReadTokens: number
  /** Reported cache-write tokens. */
  cacheWriteTokens: number
}

/** Quota progress served when the plugin configures `quota`. */
export interface BillingQuotaProgress {
  /** Configured cap in `currency`. */
  limit: number
  /** Cost accrued so far (the same figure as `totalCost`). */
  used: number
  /** `limit - used`, floored at zero. */
  remaining: number
  /** `used / limit` clamped to the closed unit interval. */
  percent: number
  /** True when one or more unpriced model buckets are excluded from `used`. */
  estimated: boolean
}

/** Cost and token usage attributed to the latest turn that reported usage. */
export interface BillingTurnSummary {
  /** One-based turn number from the session event stream. */
  turn: number
  /** Known cost for this turn, rounded to six decimals. */
  cost: number
  /** Reported uncached input tokens in this turn. */
  uncachedInputTokens: number
  /** Reported output tokens in this turn. */
  outputTokens: number
  /** Reported cache-read tokens in this turn. */
  cacheReadTokens: number
  /** Reported cache-write tokens in this turn. */
  cacheWriteTokens: number
  /** Models used in this turn that have no resolved price, ascending. */
  unpricedModels: string[]
}

/** Whole-value `billing` projection: per-model cost accounting and optional quota progress. */
export interface BillingProjection {
  /** ISO 4217 currency code prices and costs are denominated in. */
  currency: string
  /** Sum of every model row's cost, rounded to six decimals. */
  totalCost: number
  /** One row per provider/model route with any reported usage, ascending by route. */
  models: BillingModelRow[]
  /** Model ids with usage but no configured price, ascending; the `'(unknown)'` fallback model appears here too. */
  unpricedModels: string[]
  /** Latest turn that reported usage; absent before the first usage sample. */
  latestTurn?: BillingTurnSummary
  /** Quota progress; absent unless the plugin configures `quota`. `estimated` is true when pricing is incomplete. */
  quota?: BillingQuotaProgress
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Whole-session per-model cost accounting and optional quota progress; see {@link BillingProjection}. */
    billing: BillingProjection
  }
}
