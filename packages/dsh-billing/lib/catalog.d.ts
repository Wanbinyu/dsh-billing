/**
 * Built-in price catalog generated from an installed pi-ai model catalog
 * (scripts/generate-catalog.mjs). Do not edit by hand — regenerate with
 * `node scripts/generate-catalog.mjs`. Prices are USD per 1M tokens as pi-ai
 * ships them; a deployment overrides any entry through the plugin Config.
 */
export interface CatalogEntry {
    /** USD per 1M uncached input tokens. */
    input: number;
    /** USD per 1M output tokens. */
    output: number;
    /** USD per 1M cache-read tokens. */
    cacheRead: number;
    /** USD per 1M cache-write tokens. */
    cacheWrite: number;
}
/** Provider/model → price table (nested by provider, then model id). */
export declare const BUILTIN_CATALOG: Record<string, Record<string, CatalogEntry>>;
/** Number of priced catalog entries (regeneration sanity figure). */
export declare const BUILTIN_CATALOG_SIZE = 1008;
/** Number of provider routes the catalog covers. */
export declare const BUILTIN_CATALOG_PROVIDERS = 30;
