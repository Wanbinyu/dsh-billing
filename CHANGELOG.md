# Changelog

## 0.6.8 - 2026-10-15

- Adapt to Harness 0.2.1-alpha.3. Peer ranges also accept 0.2.0-rc.2, 0.1.5-rc.2, and the 0.1.1-rc.2 baseline.
- Resolve 0.2 Medium icons first and fall back to the 0.1 icon names, so one externalized client bundle loads on both hosts.
- Accept Cordis 4.0.5-alpha alongside ^4.0.1. The invariant companion stays optional because 0.2.1 no longer publishes @deepseek-ai/dsh-invariants.
- Keep the v0.6.7 DeepSeek price card and projection stateVersion 6.

## 0.6.7 - 2026-09-25

- Price first-party `deepseek` and `deepseek-official` calls from the official USD schedule, split by the call timestamp.
- Add `deepseek-flash` (DeepSeek-V4.1-Flash). Bill `deepseek-v4-flash`, `deepseek-v4-flash-0731`, and `deepseek-v4-flash-vision-exp` on that same card from 2026-09-10 04:00 UTC.
- Keep `deepseek-v4-pro` on the Pro card. Peak is Monday–Friday 01:00–04:00 and 06:00–10:00 UTC; 2026 Chinese public holidays are off-peak all day.
- Bill cache writes at the cache-miss rate. A Config price still replaces the schedule with one flat rate. Non-USD projections still require explicit prices.
- Bump the billing projection `stateVersion` to 6 so existing sessions replay onto the new slices.

## 0.6.6 - 2026-09-11

- Adapt to Harness 0.1.5-rc.2 while retaining 0.1.1-rc.2 baseline coverage.
- Remove retired client runtime dependencies from Web plugins; preserve official Slot APIs.
- Add explicit compatibility guidance for downloadable archives.
