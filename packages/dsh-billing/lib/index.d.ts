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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { BillingConfig } from './types.ts';
export type * from './types.ts';
/** Cordis plugin name. */
export declare const name = "billing";
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export declare const inject: string[];
/**
 * Plugin config: provider/model prices (with a model-only fallback), the currency, and an optional per-session
 * cost cap. Cache-read/cache-write prices default to zero when omitted; an
 * empty `models` map prices every model at zero while still counting its
 * tokens. The quota limit is strictly positive because the projection reports
 * a percentage of that limit.
 */
export declare const Config: z<BillingConfig>;
/**
 * Register the `billing` unit with the resolved config; the registration is
 * an effect on this plugin's fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - the loader-validated plugin config.
 */
export declare function apply(ctx: Context, config?: BillingConfig): void;
