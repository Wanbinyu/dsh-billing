# dsh-billing

Per-model cost accounting and session quota progress plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).

- **`dsh-billing`** (host plugin) — prices provider-reported token usage per model from your `Config`, folds it into the `billing` session projection, and reports optional per-session quota progress. Replay-aware, config-independent fold state, deterministic micro-unit rounding.
- **`dsh-client-ui-billing`** (web GUI plugin) — renders a read-only cost strip in the composer dock (order 15, after GoalBar): session cost in your currency, a quota progress bar with used/limit text, an unpriced-model warning, and the per-model breakdown in a tooltip. Renders nothing until usage exists.

They follow the standard DeepSeek Harness host-projection / client-surface split (the `session-stats` / `ui-goal` precedent): the host owns pricing and the fold, the browser renders the host-computed projection.

## Install

Both packages are plain npm packages with `@deepseek-ai/dsh-*` peer dependencies (installed with dsh).

```sh
npm install dsh-billing dsh-client-ui-billing
```

In a dsh profile, add the rows to `cordis.patch.yml` (see [the cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md)):

```yaml
- insert:
    - id: billing
      name: 'dsh-billing'
      config:
        models:
          deepseek-v4-flash:
            input: 0.2        # currency per 1M uncached input tokens
            output: 0.8       # currency per 1M output tokens
            cacheRead: 0.05   # currency per 1M cache-read tokens (absent = 0)
            cacheWrite: 0.1   # currency per 1M cache-write tokens (absent = 0)
        currency: USD
        quota:
          limit: 5            # optional per-session cost cap (currency)
    - id: ui-billing
      name: 'dsh-client-ui-billing'
```

Prices are examples — set them to your contract rates. A model without an entry still has its tokens counted but prices at zero and joins `unpricedModels`, so you learn about missing prices instead of silently under-billing. Restart dsh after editing the profile.

## Projection

```ts
interface BillingProjection {
  currency: string
  totalCost: number
  models: { model: string; cost: number; uncachedInputTokens: number;
            outputTokens: number; cacheReadTokens: number;
            cacheWriteTokens: number }[]
  unpricedModels: string[]
  quota?: { limit: number; used: number; remaining: number; percent: number }
}
```

Usage attribution follows the `request/header` model of the step; a later sample for the same `(turn, step)` replaces the earlier one instead of double counting; usage with no preceding header falls into a reserved `(unknown)` bucket. The fold state is config-independent, so re-pricing at runtime keeps the persisted projection cache valid.

## Notes

- Costs are reference figures under your local price config — not an invoice or a gating input.
- `quota` is per session; a deployment-wide budget is deferred work (see Known Limitations in each package README).
- Tested against `@deepseek-ai/dsh` 0.1.0-rc.6 (unit, loader-composition, and client-plugin coverage; 100% per-file on both packages' source).

## License

MIT
