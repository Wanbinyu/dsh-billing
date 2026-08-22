# dsh-billing

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

`v0.6.3` 已使用 DeepSeek Harness `0.1.1-rc.2` 完成类型、测试、完整构建和打包验证，并保留 `0.1.0-rc.6` 至 `rc.8`、`0.1.1-rc.1` 的兼容分支。

## 作为 bundle 安装

仓库根目录的 bundle 包含 `dsh.bundle` 声明和两个运行时包。安装到 `web` profile：

```sh
dsh plugin --profile web add https://github.com/Wanbinyu/dsh-billing/releases/download/v0.6.3/dsh-billing-community-bundle-0.6.3.tgz
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

DeepSeek 官方示例价格使用 CNY 每 100 万 token：缓存命中 `0.02`、缓存未命中输入 `1`、输出 `2`。实际价格请按你的合同配置；DeepSeek 的峰谷价格可能变化。

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

价格键优先使用精确的 `provider/model`，例如 `openrouter/deepseek-v4-flash`；只写模型 ID（例如 `deepseek-v4-flash`）仍然有效，并作为所有 provider 的兼容回退。如果在 bundle 已插入后修改 `billing` 行，Harness 的 patch 会替换整段 `config`，因此需要保留所有希望继续使用的配置字段。

内置目录只使用 USD。使用 CNY 或其他货币时，请为每个模型显式配置价格；没有价格的模型仍会统计 token，但会进入 `unpricedModels`。它们不会伪造费用，`quota.estimated` 会变为 `true`，表示额度进度只包含已知价格，不能当作完整账单。

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

host 配置、projection 去重和额度状态有单元测试；浏览器真实 Web 组合测试仍是后续工作。运行完整验证：

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
- 当前目标版本是 DeepSeek Harness `0.1.0-rc.x`。

## 链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [GitHub 仓库](https://github.com/Wanbinyu/dsh-billing)
- [English README](README.en.md)

## 许可证

MIT。
