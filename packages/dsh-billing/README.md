# dsh-billing

Host plugin for DeepSeek Harness: per-model cost accounting and session quota progress. It prices provider-reported token usage into the `billing` session projection, with an **built-in price catalog of 1008 models across 30 providers** (generated from the pi-ai model catalog) as the default fallback.

## Pricing priority

1. **Plugin Config** — `models` keyed by model id (per-1M prices in your currency) wins over everything.
2. **Built-in catalog** — `provider/model` prices in USD per 1M tokens, shipped with the package.
3. **Unpriced** — a model with neither prices at zero and joins `unpricedModels` so the UI warns instead of silently under-billing.

Same model id under different providers keeps separate buckets, so `deepseek/deepseek-v4-flash` and `openrouter/deepseek-v4-flash` price independently.

## Configuration

```yaml
- id: billing
  name: 'dsh-billing'
  config:
    models:
      deepseek-v4-flash:
        input: 1        # currency per 1M uncached input tokens
        output: 2       # currency per 1M output tokens
        cacheRead: 0.02 # currency per 1M cache-read tokens (absent = 0)
        cacheWrite: 0
    currency: CNY
    quota:
      limit: 5          # optional per-session cost cap
```

## Regenerating the catalog

The built-in catalog (`src/catalog.ts`) is generated from an installed pi-ai model catalog:

```sh
node scripts/generate-catalog.mjs   # reads node_modules/@earendil-works/pi-ai
```

Zero-price and negative-price entries (pi-ai's "unknown" markers, e.g. `openrouter/auto`) are excluded so they surface through the unpriced warning.

## Notes

- Costs are reference figures under local/catalog prices — not an invoice or a gating input.
- `quota` is per session; a deployment-wide budget is deferred work.
