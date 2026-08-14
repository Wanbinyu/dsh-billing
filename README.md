# dsh-billing

Per-model cost accounting and session quota progress plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).

- **`dsh-billing`** (host plugin) — prices provider-reported token usage per provider/model into the `billing` session projection, with an optional per-session quota. Pricing priority: your `Config` > a **built-in USD price catalog of 1008 models across 30 providers** (generated from the pi-ai model catalog) > an unpriced-model warning. Replay-aware, config-independent fold state, deterministic micro-unit rounding.
- **`dsh-client-ui-billing`** (web GUI plugin) — renders a read-only cost strip in the composer dock (order 15, after GoalBar): session cost in your currency, a quota progress bar with used/limit text, an unpriced-model warning, and the per-model breakdown in a tooltip. Without a configured quota, it stays hidden until usage exists.

They follow the standard DeepSeek Harness host-projection / client-surface split (the `session-stats` / `ui-goal` precedent): the host owns pricing and the fold, the browser renders the host-computed projection. The same model id under different providers (e.g. `deepseek/deepseek-v4-flash` vs `openrouter/deepseek-v4-flash`) keeps separate buckets and prices independently.

## Install

The packages are currently maintained in this repository and are not published to npm yet. For local use, install the two package directories (the repository includes their built `lib` output) into the dsh profile that owns your plugins:

```sh
npm install /path/to/dsh-billing/packages/dsh-billing /path/to/dsh-billing/packages/dsh-client-ui-billing
```

After both packages are published, the equivalent registry install is:

```sh
npm install dsh-billing dsh-client-ui-billing
```

The built-in catalog is USD-only. When using CNY or another currency, configure every model explicitly; otherwise the model is reported as unpriced instead of being charged with USD figures.

When a quota is configured, the UI shows its initial zero/limit state before the first usage event; without a quota, the strip stays hidden until usage exists.

In a dsh profile, add the rows to `cordis.patch.yml` (see [the cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md)):

```yaml
- insert:
    - id: billing
      name: 'dsh-billing'
      config:
        models:
          deepseek-v4-flash:
            input: 1        # currency per 1M uncached input tokens
            output: 2       # currency per 1M output tokens
            cacheRead: 0.02 # currency per 1M cache-read tokens (absent = 0)
            cacheWrite: 0   # currency per 1M cache-write tokens (absent = 0)
        currency: CNY
        quota:
          limit: 5          # optional per-session cost cap (currency)
    - id: ui-billing
      name: 'dsh-client-ui-billing'
```

The example uses DeepSeek's official `deepseek-v4-flash` prices (CNY per 1M tokens: cache-hit 0.02 / cache-miss 1 / output 2) — set prices to your contract rates and keep `currency` consistent with them. DeepSeek is switching to peak/valley pricing, so rates can vary by time of day. A model without an entry still has its tokens counted but prices at zero and joins `unpricedModels`, so you learn about missing prices instead of silently under-billing. Restart dsh after editing the profile.

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

- Costs are reference figures under your local/catalog price config — not an invoice or a gating input.
- `quota` is per session; a deployment-wide budget is deferred work (see Known Limitations in each package README).
- The built-in catalog (`packages/dsh-billing/src/catalog.ts`) is generated from an installed pi-ai model catalog via `node packages/dsh-billing/scripts/generate-catalog.mjs`; zero/negative-price entries (pi-ai's "unknown" markers) are excluded so they surface through the unpriced warning.
- Host config and projection behavior are covered by unit tests against `@deepseek-ai/dsh` 0.1.0-rc.6. Browser integration and responsive UI tests remain future work.

## License

MIT
