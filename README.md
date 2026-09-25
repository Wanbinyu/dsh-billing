# dsh-billing

> **v0.6.7 价格更新**：官方 `deepseek` / `deepseek-official` 路由按调用时刻使用 DeepSeek 价目。`deepseek-flash` 与仍被路由的旧 Flash 名字走 V4.1-Flash 价，`deepseek-v4-pro` 继续走 Pro 价。兼容性仍以 Harness `0.1.5-rc.2` 验证为准。


[简体中文](README.md) | [English](README.en.md)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的会话计费与额度插件。

> [!NOTE]
> 这是独立的社区项目，不属于 DeepSeek Harness 官方发行版。费用是本地参考值，不是账单，也不会自动阻止模型调用。

## 包含组件

| 包 | 作用 |
| --- | --- |
| `dsh-billing` | 按 provider/model 统计 token 费用，生成 `billing` session projection，并支持每会话额度。 |
| `dsh-client-ui-billing` | 在 Web composer dock 显示本轮/会话费用、额度进度、未定价模型提示和模型明细。 |
| `dsh-billing-community-bundle` | 将上面两个包和 `cordis.patch.yml` 组合成可安装的 DSH bundle。 |

host 侧负责计价和 projection，浏览器侧从 host 已计算的 projection 渲染界面。可安装的根 bundle 同时导出 host 与 Web client 入口，因此从 GitHub 安装不依赖另外发布两个内部包。相同模型 ID 在不同 provider 下会分开统计，例如 `deepseek/deepseek-v4-flash` 和 `openrouter/deepseek-v4-flash`。

`v0.6.7` 在 `v0.6.6` 的 Harness `0.1.5-rc.2` 兼容修复上更新了官方价目。

## 作为 bundle 安装

仓库根目录的 bundle 包含 `dsh.bundle` 声明和两个运行时包。安装到 `web` profile：

```sh
dsh plugin --profile web add https://github.com/Wanbinyu/dsh-billing/releases/download/v0.6.7/dsh-billing-community-bundle-0.6.7.tgz
```

安装后重启 dsh。bundle 通过一个 `billing` 配置条目同时启用 host projection 和 Web 费用条，价格优先使用配置，其次使用内置 USD 模型目录。

## 手动安装

宿主项目需要自己控制组合层时，可以安装两个包：

```sh
npm install ./packages/dsh-billing ./packages/dsh-client-ui-billing
```

然后在 profile 的 `cordis.patch.yml` 中加入：

```yaml
- insert:
    - id: billing
      name: dsh-billing
      config: {}
    - id: ui-billing
      name: dsh-client-ui-billing
```

## 配置价格和额度

留空 `models` 时，`deepseek` 和 `deepseek-official` 上的 `deepseek-flash`、`deepseek-v4-flash`、`deepseek-v4-flash-0731`、`deepseek-v4-flash-vision-exp`、`deepseek-v4-pro` 按官方 USD 价目计费。价格按每条用量的时间戳冻结：2026-09-10 04:00 UTC 起 Flash 家族使用 V4.1-Flash 价，Pro 保持自己的价。高峰是周一到周五 UTC 01:00–04:00 和 06:00–10:00，2026 年中国法定节假日全天按空闲价。缓存写入按未命中输入价计。图片 token 由供应商折进输入用量后，随输入一起计价。

显式 `models` 会覆盖这个价目，并且是单一价格，不再区分峰谷。其他供应商仍走内置 USD 目录。

```yaml
- id: billing
  config:
    currency: USD
    quota:
      limit: 5
```

价格键优先使用精确的 `provider/model`，例如 `openrouter/deepseek-v4-flash`；只写模型 ID（例如 `deepseek-v4-flash`）仍然有效，并作为所有 provider 的兼容回退。如果在 bundle 已插入后修改 `billing` 行，Harness 的 patch 会替换整段 `config`，因此需要保留所有希望继续使用的配置字段。

内置目录和官方价目都只使用 USD。使用 CNY 或其他货币时，请为每个模型显式配置价格；没有价格的模型仍会统计 token，但会进入 `unpricedModels`。它们不会伪造费用，`quota.estimated` 会变为 `true`，表示额度进度只包含已知价格，不能当作完整账单。

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

usage 采用 `request/header` 对 step 进行归属；同一 `(turn, step)` 的后续样本会同时替换会话累计和本轮数据中的早期样本，避免重复计费；没有前置 header 的 usage 会放入保留的 `(unknown)` bucket。`latestTurn` 在首次收到 usage 后出现，供客户端显示最近一轮的费用和 Token 明细。

Web 费用条同时显示“本轮”和“会话”金额。鼠标悬停可查看本轮输入、输出、缓存命中/写入 Token 以及分模型费用；额度达到 50%、80% 和 100% 时会逐级增强提示颜色。

## 开发与验证

host 配置、projection 去重、额度状态和 Web `BillingBar` 服务端渲染输出均有自动化测试；真实 Harness Web 安装与视口组合仍按发布检查表手动验证。运行完整验证：

```sh
npm run build
npm run verify
```

内置目录通过以下脚本从 pi-ai model catalog 生成：

```sh
node packages/dsh-billing/scripts/generate-catalog.mjs
```

## 当前限制

- 费用是本地参考值，不是发票或强制限流依据。
- quota 目前按 session 计算，部署级预算暂未实现。
- 兼容 DeepSeek Harness `0.1.0-rc.6` 至 `rc.8`、`0.1.1-rc.1` 至 `rc.2`、`0.1.2-rc.1`；开发依赖固定在 `0.1.2-rc.1`，但 `@deepseek-ai/dsh-client-runtime` 仍使用官方 `next` 发布的 `0.1.1-rc.2`。

## 链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [GitHub 仓库](https://github.com/Wanbinyu/dsh-billing)
- [English README](README.en.md)

## 许可证

MIT。
