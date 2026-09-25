/**
 * First-party DeepSeek API rates, USD per 1M tokens.
 *
 * The generated pi-ai catalog still carries the May 2026 preview card and
 * omits `deepseek-flash`. This table is the fallback for the official
 * `deepseek` and `deepseek-official` routes. A plugin Config entry still wins.
 *
 * Current card: https://api-docs.deepseek.com/quick_start/pricing
 * (DeepSeek-V4.1-Flash as `deepseek-flash` from 2026-09-10 04:00 UTC;
 * DeepSeek-V4-Pro-0813 stays on its own card). Peak is Monday–Friday
 * 01:00–04:00 and 06:00–10:00 UTC, and Chinese public holidays are off-peak
 * for the whole China calendar day. Cache writes are disjoint uncached input
 * and use the cache-miss rate.
 *
 * Rates before 2026-09-10 are reconstructed from the published CNY cards
 * using each family's current official CNY/USD ratio (Flash ¥1 = $0.15,
 * Pro ¥4.5 = $0.66). They exist so an old session log is not repriced on
 * today's card.
 */
import type { BillingModelPrice } from './types.ts';
/** China calendar date `YYYY-MM-DD` for a UTC instant. China is UTC+8 year-round. */
export declare const chinaDateKey: (timeMs: number) => string;
/** True inside a weekday peak window that is not a 2026 Chinese public holiday. */
export declare const isDeepSeekPeak: (timeMs: number) => boolean;
/**
 * Slice key for one first-party call, or null when this route keeps the
 * generic catalog. The key names the card; the price is resolved at view time.
 */
export declare const officialSliceKey: (provider: string, model: string, timeMs: number) => string | null;
/** USD card named by {@link officialSliceKey}, or undefined for a foreign key. */
export declare const priceForSliceKey: (sliceKey: string) => BillingModelPrice | undefined;
