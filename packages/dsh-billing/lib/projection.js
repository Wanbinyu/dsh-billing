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
import { z } from 'zod';
/** Fallback model id for usage with no preceding `request/header` event. */
export const UNKNOWN_MODEL = '(unknown)';
const zeroBuckets = () => ({
    uncachedInputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
});
const bucketsFrom = (usage) => ({
    uncachedInputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteTokens ?? 0,
});
const bucketsEqual = (left, right) => left.uncachedInputTokens === right.uncachedInputTokens
    && left.outputTokens === right.outputTokens
    && left.cacheReadTokens === right.cacheReadTokens
    && left.cacheWriteTokens === right.cacheWriteTokens;
/** The usage a chunk or finalized message reports for its step, if any. */
const usageOf = (event) => event.type === 'assistant/chunk' && event.data.chunk.type === 'usage'
    ? event.data.chunk.usage
    : event.type === 'assistant/message'
        ? event.data.usage
        : undefined;
/**
 * Add `buckets` (signed) to the model's running total without mutating
 * `state` — the caller spreads the result into the next state.
 */
const addBuckets = (state, model, buckets, sign) => {
    const previous = state.buckets[model] ?? zeroBuckets();
    const next = {
        uncachedInputTokens: previous.uncachedInputTokens + sign * buckets.uncachedInputTokens,
        outputTokens: previous.outputTokens + sign * buckets.outputTokens,
        cacheReadTokens: previous.cacheReadTokens + sign * buckets.cacheReadTokens,
        cacheWriteTokens: previous.cacheWriteTokens + sign * buckets.cacheWriteTokens,
    };
    return { ...state, buckets: { ...state.buckets, [model]: next } };
};
/** Insert `model` into the ascending `unpriced` list when absent. */
const noteUnpriced = (state, model) => {
    if (state.unpriced.includes(model))
        return state;
    const next = [...state.unpriced, model].sort();
    return { ...state, unpriced: next };
};
/**
 * Round a money figure to six decimals so every snapshot is deterministic
 * and schema-stable at micro-unit precision.
 */
const roundMoney = (value) => Math.round(value * 1e6) / 1e6;
/** Price one bucket set; an unlisted model prices at zero. */
const costOf = (price, buckets) => price === undefined
    ? 0
    : (price.input * buckets.uncachedInputTokens
        + price.output * buckets.outputTokens
        + (price.cacheRead ?? 0) * buckets.cacheReadTokens
        + (price.cacheWrite ?? 0) * buckets.cacheWriteTokens) / 1e6;
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
export const billingProjectionDefinition = (resolved) => {
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
    }).strict();
    return {
        key: 'billing',
        schema,
        init: () => ({ headerModel: undefined, buckets: {}, unpriced: [], last: null }),
        apply: (state, event) => {
            if (event.type === 'request/header') {
                const model = event.data.header.config.model;
                if (model === state.headerModel)
                    return state;
                return { ...state, headerModel: model };
            }
            if (event.type !== 'assistant/chunk' && event.type !== 'assistant/message')
                return state;
            const usage = usageOf(event);
            if (usage === undefined)
                return state;
            const { turn, step } = event.data;
            const model = state.headerModel ?? UNKNOWN_MODEL;
            const buckets = bucketsFrom(usage);
            const previous = state.last !== null && state.last.turn === turn && state.last.step === step
                ? state.last
                : null;
            if (previous !== null && bucketsEqual(previous.buckets, buckets))
                return state;
            let next = state;
            if (previous !== null)
                next = addBuckets(next, previous.model, previous.buckets, -1);
            next = addBuckets(next, model, buckets, 1);
            next = { ...next, last: { turn, step, model, buckets } };
            return resolved.prices[model] === undefined ? noteUnpriced(next, model) : next;
        },
        view: (state) => {
            const models = Object.keys(state.buckets).sort().map((model) => {
                const buckets = state.buckets[model] ?? zeroBuckets();
                const cost = roundMoney(costOf(resolved.prices[model], buckets));
                return { model, cost, ...buckets };
            });
            const totalCost = roundMoney(models.reduce((sum, row) => sum + row.cost, 0));
            const quota = resolved.quotaLimit === undefined ? undefined : {
                limit: resolved.quotaLimit,
                used: totalCost,
                remaining: Math.max(0, resolved.quotaLimit - totalCost),
                percent: Math.min(1, totalCost / resolved.quotaLimit),
            };
            const projection = {
                currency: resolved.currency,
                totalCost,
                models,
                unpricedModels: [...state.unpriced],
                ...quota === undefined ? {} : { quota },
            };
            return projection;
        },
        stateVersion: 1,
    };
};
