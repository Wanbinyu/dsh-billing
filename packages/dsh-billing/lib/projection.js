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
import { z } from 'zod';
/** Fallback identity for usage with no preceding `request/header` event. */
export const UNKNOWN_MODEL = '(unknown)';
/** Currency used by the generated built-in catalog. */
const BUILTIN_CATALOG_CURRENCY = 'USD';
/** Separator joining provider and model into one bucket key (JSON-safe, never in ids). */
const KEY_SEPARATOR = '\u0001';
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
const keyOf = (provider, model) => provider + KEY_SEPARATOR + model;
/**
 * Add `buckets` (signed) to the bucket's running total without mutating
 * `state` — the caller spreads the result into the next state.
 */
const addBuckets = (state, key, provider, model, buckets, sign) => {
    const previous = state.buckets[key] ?? { provider, model, ...zeroBuckets() };
    const next = {
        provider,
        model,
        uncachedInputTokens: previous.uncachedInputTokens + sign * buckets.uncachedInputTokens,
        outputTokens: previous.outputTokens + sign * buckets.outputTokens,
        cacheReadTokens: previous.cacheReadTokens + sign * buckets.cacheReadTokens,
        cacheWriteTokens: previous.cacheWriteTokens + sign * buckets.cacheWriteTokens,
    };
    return { ...state, buckets: { ...state.buckets, [key]: next } };
};
/** Add signed buckets to the newest-turn view, resetting it when a later turn starts. */
const addLatestTurnBuckets = (state, turn, key, provider, model, buckets, sign) => {
    const current = state.latestTurn?.turn === turn
        ? state.latestTurn
        : { turn, buckets: {} };
    const previous = current.buckets[key] ?? { provider, model, ...zeroBuckets() };
    const next = {
        provider,
        model,
        uncachedInputTokens: previous.uncachedInputTokens + sign * buckets.uncachedInputTokens,
        outputTokens: previous.outputTokens + sign * buckets.outputTokens,
        cacheReadTokens: previous.cacheReadTokens + sign * buckets.cacheReadTokens,
        cacheWriteTokens: previous.cacheWriteTokens + sign * buckets.cacheWriteTokens,
    };
    return {
        ...state,
        latestTurn: { turn, buckets: { ...current.buckets, [key]: next } },
    };
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
/** Price one bucket set; an unresolvable price contributes no known cost. */
const costOf = (price, buckets) => price === undefined
    ? 0
    : (price.input * buckets.uncachedInputTokens
        + price.output * buckets.outputTokens
        + (price.cacheRead ?? 0) * buckets.cacheReadTokens
        + (price.cacheWrite ?? 0) * buckets.cacheWriteTokens) / 1e6;
/**
 * Resolve one bucket's price. A provider/model override wins first, then the
 * legacy model-only override, then the built-in USD catalog. The catalog is
 * disabled for other currencies so its USD figures cannot be mislabeled.
 */
const resolvePrice = (prices, catalog, currency, provider, model) => prices[`${provider}/${model}`]
    ?? prices[model]
    ?? (currency === BUILTIN_CATALOG_CURRENCY ? catalog[provider]?.[model] : undefined);
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
export const billingProjectionDefinition = (resolved) => {
    const schema = z.object({
        currency: z.string(),
        totalCost: z.number().nonnegative(),
        models: z.array(z.object({
            provider: z.string(),
            model: z.string(),
            cost: z.number().nonnegative(),
            uncachedInputTokens: z.number().int().nonnegative(),
            outputTokens: z.number().int().nonnegative(),
            cacheReadTokens: z.number().int().nonnegative(),
            cacheWriteTokens: z.number().int().nonnegative(),
        }).strict()),
        unpricedModels: z.array(z.string()),
        latestTurn: z.object({
            turn: z.number().int().positive(),
            cost: z.number().nonnegative(),
            uncachedInputTokens: z.number().int().nonnegative(),
            outputTokens: z.number().int().nonnegative(),
            cacheReadTokens: z.number().int().nonnegative(),
            cacheWriteTokens: z.number().int().nonnegative(),
            unpricedModels: z.array(z.string()),
        }).strict().optional(),
        quota: z.object({
            limit: z.number().positive(),
            used: z.number().nonnegative(),
            remaining: z.number().nonnegative(),
            percent: z.number().min(0).max(1),
            estimated: z.boolean(),
        }).strict().optional(),
    }).strict();
    return {
        key: 'billing',
        schema,
        init: () => ({ header: null, buckets: {}, unpriced: [], last: null, latestTurn: null }),
        apply: (state, event) => {
            if (event.type === 'request/header') {
                const header = { provider: event.data.header.config.provider, model: event.data.header.config.model };
                if (state.header !== null && state.header.provider === header.provider && state.header.model === header.model) {
                    return state;
                }
                return { ...state, header };
            }
            if (event.type !== 'assistant/chunk' && event.type !== 'assistant/message')
                return state;
            const usage = usageOf(event);
            if (usage === undefined)
                return state;
            const { turn, step } = event.data;
            const provider = state.header?.provider ?? UNKNOWN_MODEL;
            const model = state.header?.model ?? UNKNOWN_MODEL;
            const key = keyOf(provider, model);
            const buckets = bucketsFrom(usage);
            const previous = state.last !== null && state.last.turn === turn && state.last.step === step
                ? state.last
                : null;
            if (previous !== null && bucketsEqual(previous.buckets, buckets))
                return state;
            let next = state;
            if (previous !== null) {
                next = addBuckets(next, previous.key, previous.provider, previous.model, previous.buckets, -1);
                next = addLatestTurnBuckets(next, turn, previous.key, previous.provider, previous.model, previous.buckets, -1);
            }
            next = addBuckets(next, key, provider, model, buckets, 1);
            next = addLatestTurnBuckets(next, turn, key, provider, model, buckets, 1);
            next = { ...next, last: { turn, step, key, provider, model, buckets } };
            return resolvePrice(resolved.prices, resolved.catalog, resolved.currency, provider, model) === undefined
                ? noteUnpriced(next, model)
                : next;
        },
        view: (state) => {
            const grouped = new Map();
            for (const bucket of Object.values(state.buckets)) {
                const price = resolvePrice(resolved.prices, resolved.catalog, resolved.currency, bucket.provider, bucket.model);
                const cost = roundMoney(costOf(price, bucket));
                const key = keyOf(bucket.provider, bucket.model);
                const row = grouped.get(key);
                if (row === undefined) {
                    grouped.set(key, {
                        provider: bucket.provider,
                        model: bucket.model,
                        cost,
                        uncachedInputTokens: bucket.uncachedInputTokens,
                        outputTokens: bucket.outputTokens,
                        cacheReadTokens: bucket.cacheReadTokens,
                        cacheWriteTokens: bucket.cacheWriteTokens,
                    });
                }
                else {
                    row.cost = roundMoney(row.cost + cost);
                    row.uncachedInputTokens += bucket.uncachedInputTokens;
                    row.outputTokens += bucket.outputTokens;
                    row.cacheReadTokens += bucket.cacheReadTokens;
                    row.cacheWriteTokens += bucket.cacheWriteTokens;
                }
            }
            const models = [...grouped.values()].sort((a, b) => {
                const providerOrder = a.provider.localeCompare(b.provider);
                return providerOrder !== 0 ? providerOrder : a.model.localeCompare(b.model);
            });
            const totalCost = roundMoney(models.reduce((sum, row) => sum + row.cost, 0));
            const quota = resolved.quotaLimit === undefined ? undefined : {
                limit: resolved.quotaLimit,
                used: totalCost,
                remaining: Math.max(0, resolved.quotaLimit - totalCost),
                percent: Math.min(1, totalCost / resolved.quotaLimit),
                estimated: state.unpriced.length > 0,
            };
            const latestTurn = state.latestTurn === null ? undefined : (() => {
                const totals = zeroBuckets();
                const unpriced = new Set();
                let cost = 0;
                for (const bucket of Object.values(state.latestTurn.buckets)) {
                    const price = resolvePrice(resolved.prices, resolved.catalog, resolved.currency, bucket.provider, bucket.model);
                    cost += costOf(price, bucket);
                    totals.uncachedInputTokens += bucket.uncachedInputTokens;
                    totals.outputTokens += bucket.outputTokens;
                    totals.cacheReadTokens += bucket.cacheReadTokens;
                    totals.cacheWriteTokens += bucket.cacheWriteTokens;
                    if (price === undefined)
                        unpriced.add(bucket.model);
                }
                return {
                    turn: state.latestTurn.turn,
                    cost: roundMoney(cost),
                    ...totals,
                    unpricedModels: [...unpriced].sort(),
                };
            })();
            const projection = {
                currency: resolved.currency,
                totalCost,
                models,
                unpricedModels: [...state.unpriced],
                ...latestTurn === undefined ? {} : { latestTurn },
                ...quota === undefined ? {} : { quota },
            };
            return projection;
        },
        stateVersion: 4,
    };
};
