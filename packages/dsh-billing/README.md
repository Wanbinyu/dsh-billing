# dsh-billing

Host plugin for DeepSeek Harness: per-model cost accounting and session quota progress. It prices provider-reported token usage into the `billing` session projection, with an **built-in price catalog of 1009 models across 30 providers** (generated from the pi-ai model catalog) as the default fallback.

## Pricing priority

1. **Plugin Config** — `models` keyed by `provider/model` or model id (per-1M prices in your currency) wins over everything and is a single flat rate.
2. **Official DeepSeek schedule** — `deepseek` and `deepseek-official` routes for `deepseek-flash`, the retired Flash ids, and `deepseek-v4-pro`, USD per 1M tokens, chosen from the call timestamp. See `src/deepseek-rates.ts`.
3. **Built-in catalog** — other `provider/model` prices in USD per 1M tokens, shipped with the package.
4. **Unpriced** — a model with neither prices at zero and joins `unpricedModels` so the UI warns instead of silently under-billing.

Same model id under different providers keeps separate buckets, so `deepseek/deepseek-v4-flash` and `openrouter/deepseek-v4-flash` price independently. The OpenRouter row stays on the generated catalog.

When `currency` is not `USD`, configure every model explicitly. The built-in catalog and the official schedule are not converted and are never applied to a non-USD projection.

## Configuration

```yaml
- id: billing
  name: 'dsh-billing'
  config:
    currency: USD
    quota:
      limit: 5          # optional per-session cost cap
```

Leave `models` empty to use the official DeepSeek schedule. A model entry is a flat override in `currency` and replaces peak/off-peak for that id.

## Regenerating the catalog

The built-in catalog (`src/catalog.ts`) is generated from an installed pi-ai model catalog:

```sh
node scripts/generate-catalog.mjs   # reads node_modules/@earendil-works/pi-ai
```

Zero-price and negative-price entries (pi-ai's "unknown" markers, e.g. `openrouter/auto`) are excluded so they surface through the unpriced warning.

## Notes

- Costs are reference figures under local/catalog prices — not an invoice or a gating input.
- `quota` is per session; a deployment-wide budget is deferred work.
