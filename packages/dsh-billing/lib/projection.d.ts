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
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection';
import type { BillingModelPrice } from './types.ts';
import type { CatalogEntry } from './catalog.ts';
/** Fallback identity for usage with no preceding `request/header` event. */
export declare const UNKNOWN_MODEL = "(unknown)";
/** Per-provider/model token buckets; prices never enter the fold state. */
interface ModelBuckets {
    uncachedInputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
}
/** One bucket: token totals plus the header identity that owns them. */
interface Bucket extends ModelBuckets {
    provider: string;
    model: string;
}
/** The last usage sample's step coordinates, for same-step replacement. */
interface UsageSample {
    turn: number;
    step: number;
    key: string;
    provider: string;
    model: string;
    buckets: ModelBuckets;
}
/** Fold state (plain JSON per the unit contract). */
interface BillingState {
    /** Provider/model of the newest `request/header`; null before the first. */
    header: {
        provider: string;
        model: string;
    } | null;
    /** Token buckets keyed by provider + KEY_SEPARATOR + model. */
    buckets: Record<string, Bucket>;
    /** Model ids with usage but no resolved price, ascending. */
    unpriced: string[];
    /** Newest usage sample; null before the first. */
    last: UsageSample | null;
}
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
export declare const billingProjectionDefinition: (resolved: {
    prices: Record<string, BillingModelPrice>;
    catalog: Record<string, Record<string, CatalogEntry>>;
    currency: string;
    quotaLimit: number | undefined;
}) => ProjectionDefinition<"billing", BillingState>;
export {};
