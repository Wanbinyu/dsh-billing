# dsh-billing

[简体中文](README.md) | [English](README.en.md)

Session billing and quota plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

> [!NOTE]
> This is an independent community project. It is not part of the official DeepSeek Harness distribution. Costs are local reference values, not invoices, and do not automatically block model calls.

## Components

| Package | Purpose |
| --- | --- |
| `dsh-billing` | Prices provider/model token usage, produces the `billing` session projection, and supports a per-session quota. |
| `dsh-client-ui-billing` | Shows latest-turn/session cost, quota progress, unpriced-model warnings, and model details in the Web composer dock. |
| `dsh-billing-community-bundle` | Combines both packages and a `cordis.patch.yml` into an installable DSH bundle. |

The host owns pricing and the projection; the browser renders the host-computed projection. The installable root bundle exports both the host and Web client entry points, so GitHub installation does not depend on separately published internal packages. The same model ID under different providers is tracked independently, for example `deepseek/deepseek-v4-flash` and `openrouter/deepseek-v4-flash`.

`v0.6.3` is type-checked, tested, fully built, and package-validated against DeepSeek Harness `0.1.1-rc.2` while retaining compatibility with `0.1.0-rc.6` through `rc.8` and `0.1.1-rc.1`.

## Install As A Bundle

The repository root provides a bundle declaration and both runtime packages. Add it to the `web` profile:

```sh
dsh plugin --profile web add https://github.com/Wanbinyu/dsh-billing/releases/download/v0.6.3/dsh-billing-community-bundle-0.6.3.tgz
```

Restart dsh after installation. One `billing` composition entry enables both the host projection and Web cost strip. Pricing uses explicit configuration first, then the built-in USD model catalog.

## Manual Installation

When the host project needs to own the composition layer, install both packages:

```sh
npm install ./packages/dsh-billing ./packages/dsh-client-ui-billing
```

Then add this to the profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: billing
      name: dsh-billing
      config: {}
    - id: ui-billing
      name: dsh-client-ui-billing
```

## Configure Pricing And Quota

DeepSeek's example rates use CNY per one million tokens: `0.02` for cache hits, `1` for uncached input, and `2` for output. Configure your contract rates; peak/valley pricing may change over time.

```yaml
- id: billing
  config:
    models:
      deepseek/deepseek-v4-flash:
        input: 1
        output: 2
        cacheRead: 0.02
        cacheWrite: 0
    currency: CNY
    quota:
      limit: 5
```

Exact `provider/model` keys, such as `openrouter/deepseek-v4-flash`, take precedence. A model-only key such as `deepseek-v4-flash` remains supported as a fallback for every provider. When overriding the `billing` row after the bundle inserted it, Harness replaces the whole `config` block. Restate every field you want to keep.

The built-in catalog is USD-only. When using CNY or another currency, configure every model explicitly. A model without a price is still counted, but joins `unpricedModels` and sets `quota.estimated` to `true`. Its cost is excluded rather than fabricated, so quota progress containing unpriced usage must not be treated as a complete bill.

## Projection

```ts
interface BillingProjection {
  currency: string
  totalCost: number
  models: { provider: string; model: string; cost: number; uncachedInputTokens: number;
            outputTokens: number; cacheReadTokens: number;
            cacheWriteTokens: number }[]
  unpricedModels: string[]
  latestTurn?: { turn: number; cost: number; uncachedInputTokens: number;
                 outputTokens: number; cacheReadTokens: number;
                 cacheWriteTokens: number; unpricedModels: string[] }
  quota?: { limit: number; used: number; remaining: number; percent: number; estimated: boolean }
}
```

Usage follows the `request/header` model for step attribution. A later sample for the same `(turn, step)` replaces the earlier sample in both the session total and latest-turn summary to avoid double counting; usage without a preceding header falls into a reserved `(unknown)` bucket. `latestTurn` appears after the first usage sample and lets clients render cost and token details for the most recent turn.

The Web strip shows both Turn and Session amounts. Hovering reveals the latest turn's input, output, cache-read, and cache-write tokens plus per-model costs. Quota feedback becomes progressively stronger at 50%, 80%, and 100% usage.

## Development And Verification

Host configuration, projection replacement, and quota states have unit coverage. Real Web composition testing remains future work. Run the complete verification with:

```sh
npm run build
npm run verify
```

The built-in catalog is generated from the pi-ai model catalog with:

```sh
node packages/dsh-billing/scripts/generate-catalog.mjs
```

## Current Limitations

- Costs are local reference values, not invoices or a hard gating input.
- Quota is currently per session; deployment-wide budgets are deferred.
- The current target is DeepSeek Harness `0.1.0-rc.x`.

## Links

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [GitHub repository](https://github.com/Wanbinyu/dsh-billing)
- [简体中文说明](README.md)

## License

MIT.
