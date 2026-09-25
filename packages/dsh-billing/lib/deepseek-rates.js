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
const AUG16_UTC = Date.parse('2026-08-16T16:00:00.000Z');
const SEP10_UTC = Date.parse('2026-09-10T04:00:00.000Z');
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
/** Whole-day public holidays for 2026, China calendar dates (State Council, 2025-11-04). */
const CN_PUBLIC_HOLIDAYS_2026 = new Set([
    '2026-01-01', '2026-01-02', '2026-01-03',
    '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
    '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
    '2026-04-04', '2026-04-05', '2026-04-06',
    '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
    '2026-06-19', '2026-06-20', '2026-06-21',
    '2026-09-25', '2026-09-26', '2026-09-27',
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
    '2026-10-06', '2026-10-07',
]);
const FLASH_IDS = new Set([
    'deepseek-flash',
    'deepseek-v4-flash',
    'deepseek-v4-flash-0731',
    'deepseek-v4-flash-vision-exp',
]);
const PRO_IDS = new Set(['deepseek-v4-pro']);
const FIRST_PARTY = new Set(['deepseek', 'deepseek-official']);
const price = (input, output, cacheRead) => ({
    input,
    output,
    cacheRead,
    cacheWrite: input,
});
const FLASH_PRE = price(0.15, 0.3, 0.003);
const FLASH_AUG_OFF = price(0.225, 0.675, 0.0075);
const FLASH_AUG_PEAK = price(0.45, 1.35, 0.015);
const FLASH_SEP_OFF = price(0.15, 0.6, 0.003);
const FLASH_SEP_PEAK = price(0.3, 1.2, 0.006);
const PRO_PRE = price(0.44, 0.88, 11 / 3000);
const PRO_OFF = price(0.66, 1.98, 0.022);
const PRO_PEAK = price(1.32, 3.96, 0.044);
const CARDS = {
    flash: {
        'pre-20260816': { flat: FLASH_PRE, peak: FLASH_PRE, off: FLASH_PRE },
        '20260816': { flat: FLASH_AUG_OFF, peak: FLASH_AUG_PEAK, off: FLASH_AUG_OFF },
        '20260910': { flat: FLASH_SEP_OFF, peak: FLASH_SEP_PEAK, off: FLASH_SEP_OFF },
    },
    pro: {
        'pre-20260816': { flat: PRO_PRE, peak: PRO_PRE, off: PRO_PRE },
        '20260816': { flat: PRO_OFF, peak: PRO_PEAK, off: PRO_OFF },
        '20260910': { flat: PRO_OFF, peak: PRO_PEAK, off: PRO_OFF },
    },
};
/** China calendar date `YYYY-MM-DD` for a UTC instant. China is UTC+8 year-round. */
export const chinaDateKey = (timeMs) => {
    const shifted = new Date(timeMs + CHINA_OFFSET_MS);
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(shifted.getUTCDate()).padStart(2, '0');
    return `${String(shifted.getUTCFullYear())}-${month}-${day}`;
};
/** True inside a weekday peak window that is not a 2026 Chinese public holiday. */
export const isDeepSeekPeak = (timeMs) => {
    const instant = new Date(timeMs);
    const weekday = instant.getUTCDay();
    if (weekday === 0 || weekday === 6)
        return false;
    if (CN_PUBLIC_HOLIDAYS_2026.has(chinaDateKey(timeMs)))
        return false;
    const minutes = instant.getUTCHours() * 60 + instant.getUTCMinutes();
    const inside = (startHour, endHour) => minutes >= startHour * 60 && minutes < endHour * 60;
    return inside(1, 4) || inside(6, 10);
};
const familyOf = (model) => FLASH_IDS.has(model) ? 'flash' : PRO_IDS.has(model) ? 'pro' : undefined;
const eraOf = (timeMs) => timeMs < AUG16_UTC ? 'pre-20260816' : timeMs < SEP10_UTC ? '20260816' : '20260910';
/**
 * Slice key for one first-party call, or null when this route keeps the
 * generic catalog. The key names the card; the price is resolved at view time.
 */
export const officialSliceKey = (provider, model, timeMs) => {
    if (!FIRST_PARTY.has(provider))
        return null;
    const family = familyOf(model);
    if (family === undefined)
        return null;
    const era = eraOf(timeMs);
    const window = era === 'pre-20260816' ? 'flat' : isDeepSeekPeak(timeMs) ? 'peak' : 'off';
    return `${family}:${era}:${window}`;
};
/** USD card named by {@link officialSliceKey}, or undefined for a foreign key. */
export const priceForSliceKey = (sliceKey) => {
    const [family, era, window] = sliceKey.split(':');
    if (family !== 'flash' && family !== 'pro')
        return undefined;
    if (era !== 'pre-20260816' && era !== '20260816' && era !== '20260910')
        return undefined;
    if (window !== 'flat' && window !== 'peak' && window !== 'off')
        return undefined;
    return CARDS[family][era][window];
};
