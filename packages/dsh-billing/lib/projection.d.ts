/**
 * The `billing` projection unit: a pure fold of request headers and
 * provider-reported usage into per-model token buckets, priced by the
 * plugin's resolved config at view time. Attribution follows the request
 * header: usage samples inside one step belong to the model of the
 * `request/header` event that opened it, and a later header (a model switch
 * or resume) redirects subsequent samples.
 *
 * The fold keeps state config-independent — token buckets only — so a
 * price, currency, or quota change at runtime remounts the unit with the
 * same `stateVersion` and the persisted projection cache stays valid: the
 * old rows replay the same buckets and only the view re-prices them.
 *
 * @module @deepseek-ai/dsh-billing/projection
 */
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection';
import type { BillingModelPrice } from './types.ts';
/** Fallback model id for usage with no preceding `request/header` event. */
export declare const UNKNOWN_MODEL = "(unknown)";
/** Per-model token buckets; prices never enter the fold state. */
interface ModelBuckets {
    uncachedInputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
}
/** The last usage sample's step coordinates, for same-step replacement. */
interface UsageSample {
    turn: number;
    step: number;
    model: string;
    buckets: ModelBuckets;
}
/** Fold state (plain JSON per the unit contract). */
interface BillingState {
    /** Model id of the newest `request/header`; undefined before the first. */
    headerModel: string | undefined;
    /** Token buckets per model id. */
    buckets: Record<string, ModelBuckets>;
    /** Model ids with usage but no configured price, ascending. */
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
 */ /**
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
    currency: string;
    quotaLimit: number | undefined;
}) => ProjectionDefinition<"billing", BillingState>;
export {};
