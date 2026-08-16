/**
 * The `billing` projection unit: mounting the plugin beside the projection
 * registry prices provider-reported usage per provider/model — the
 * deployment Config (keyed by provider/model, then model id) wins over the built-in catalog
 * (keyed by provider/model), and models with neither join `unpricedModels`.
 * Attribution follows the `request/header` provider/model and a later
 * header switch redirects subsequent samples; same-model usage under
 * different providers keep separate buckets and view rows.
 */

import { describe, expect, expectTypeOf, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createMessage } from '@deepseek-ai/dsh-llm'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import * as BillingPlugin from '../src/index.ts'
import type { BillingConfig } from '../src/types.ts'
import type { BillingProjection } from '../src/types.ts'
import { UNKNOWN_MODEL, billingProjectionDefinition } from '../src/projection.ts'
import type { CatalogEntry } from '../src/catalog.ts'

const PRICES = {
  'deepseek-v4-flash': { input: 0.2, output: 0.8, cacheRead: 0.05, cacheWrite: 0.1 },
  'deepseek-v3': { input: 0.27, output: 1.1, cacheRead: 0.07, cacheWrite: 0.14 },
}

const CONFIG: BillingConfig = {
  models: PRICES,
  currency: 'USD',
  quota: { limit: 1 },
}

/** Small explicit catalog so tests never depend on the generated pi-ai data. */
const TEST_CATALOG: Record<string, Record<string, CatalogEntry>> = {
  'deepseek': { 'deepseek-v4-flash': { input: 0.25, output: 0.7, cacheRead: 0.02, cacheWrite: 0 } },
  'openrouter': { 'deepseek-v4-flash': { input: 0.3, output: 0.9, cacheRead: 0.06, cacheWrite: 0 } },
  'anthropic': { 'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 } },
}

async function harness(
  withBilling: boolean,
  config: BillingConfig = CONFIG,
  catalog: Record<string, Record<string, CatalogEntry>> = TEST_CATALOG,
): Promise<{ ctx: Context; session: Session }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  if (withBilling) {
    ctx.sessionProjections.register(billingProjectionDefinition({
      prices: config.models,
      catalog,
      currency: config.currency,
      quotaLimit: config.quota?.limit,
    }))
  }
  return { ctx, session: ctx.sessions.create(SessionId('counted')) }
}

function header(session: Session, provider: string, model: string): void {
  session.append('request/header', { header: { config: { provider, model } }, reason: 'initial' })
}

function usageChunk(session: Session, usage: TokenUsage, turn: number, step: number): void {
  session.append('assistant/chunk', { turn, step, chunk: { type: 'usage', usage } })
}

function finalUsage(session: Session, usage: TokenUsage, turn: number, step: number): void {
  session.append('assistant/message', {
    turn,
    step,
    message: createMessage({
      role: 'assistant',
      content: [],
      source: { kind: 'model', provider: 'mock', model: 'mock' },
    }),
    usage,
  }, { surfaceOp: 'append', sourceEventSeqs: [] })
}

const projected = (ctx: Context, session: Session): BillingProjection => {
  const value = ctx.sessionProjections.snapshot(session).values.billing
  if (value === undefined) throw new Error('billing projection is not registered')
  return value
}

const row = (provider: string, model: string, cost: number, uncachedInputTokens: number, outputTokens: number, cacheReadTokens = 0, cacheWriteTokens = 0) =>
  ({ provider, model, cost, uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens })

describe('billing projection unit (registry drive)', () => {
  it('serves an empty projection with the configured currency on the empty log', async () => {
    const { ctx, session } = await harness(true)
    expect(projected(ctx, session)).toEqual({
      currency: 'USD', totalCost: 0, models: [], unpricedModels: [],
      quota: { limit: 1, used: 0, remaining: 1, percent: 0, estimated: false },
    })
  })

  it('prices usage by the model of the current request header (Config wins)', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 1_000_000 }, 1, 1)
    const value = projected(ctx, session)
    expect(value.totalCost).toBe(0.65)
    expect(value.models).toEqual([row('mock', 'deepseek-v4-flash', 0.65, 1_000_000, 500_000, 1_000_000)])
    expect(value.unpricedModels).toEqual([])
    expect(value.quota).toEqual({ limit: 1, used: 0.65, remaining: 0.35, percent: 0.65, estimated: false })
  })

  it('falls back to the built-in catalog when the Config has no price for the model', async () => {
    const { ctx, session } = await harness(true, { models: {}, currency: 'USD' })
    header(session, 'anthropic', 'claude-haiku-4-5')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 100_000 }, 1, 1)
    const value = projected(ctx, session)
    // 1M * 1 + 100k * 5 = 1 + 0.5
    expect(value.totalCost).toBe(1.5)
    expect(value.unpricedModels).toEqual([])
  })

  it('does not apply the USD catalog to a non-USD projection', async () => {
    const { ctx, session } = await harness(true, { models: {}, currency: 'CNY' })
    header(session, 'anthropic', 'claude-haiku-4-5')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 100_000 }, 1, 1)
    const value = projected(ctx, session)
    expect(value.totalCost).toBe(0)
    expect(value.unpricedModels).toEqual(['claude-haiku-4-5'])
  })

  it('prices by provider when the same model id exists under different providers', async () => {
    const { ctx, session } = await harness(true, { models: {}, currency: 'USD' })
    header(session, 'deepseek', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 1)
    header(session, 'openrouter', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 2)
    const value = projected(ctx, session)
    // Catalog prices deepseek at 0.25/1M and openrouter at 0.3/1M for the same model id
    expect(value.totalCost).toBe(0.55)
    expect(value.models).toEqual([
      row('deepseek', 'deepseek-v4-flash', 0.25, 1_000_000, 0),
      row('openrouter', 'deepseek-v4-flash', 0.3, 1_000_000, 0),
    ])
  })

  it('prefers an exact provider/model price over the legacy model fallback', async () => {
    const { ctx, session } = await harness(true, {
      models: {
        'deepseek-v4-flash': { input: 0.9, output: 0.9 },
        'openrouter/deepseek-v4-flash': { input: 0.4, output: 0.4 },
      },
      currency: 'USD',
    })
    header(session, 'deepseek', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 1)
    header(session, 'openrouter', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 2)
    expect(projected(ctx, session).models).toEqual([
      row('deepseek', 'deepseek-v4-flash', 0.9, 1_000_000, 0),
      row('openrouter', 'deepseek-v4-flash', 0.4, 1_000_000, 0),
    ])
  })

  it('redirects attribution when a later header switches provider or model', async () => {
    const { ctx, session } = await harness(true, { models: {}, currency: 'USD' })
    header(session, 'anthropic', 'claude-haiku-4-5')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 1)
    header(session, 'openrouter', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 2)
    const value = projected(ctx, session)
    expect(value.models).toEqual([
      row('anthropic', 'claude-haiku-4-5', 1, 1_000_000, 0),
      row('openrouter', 'deepseek-v4-flash', 0.3, 1_000_000, 0),
    ])
  })

  it('keeps the fold state when a header repeats the current provider and model', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'deepseek-v4-flash')
    header(session, 'mock', 'deepseek-v4-flash')
    expect(projected(ctx, session)).toEqual({
      currency: 'USD', totalCost: 0, models: [], unpricedModels: [],
      quota: { limit: 1, used: 0, remaining: 1, percent: 0, estimated: false },
    })
  })

  it('replaces a step sample instead of double counting it (chunk then final)', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 100 }, 1, 1)
    finalUsage(session, { inputTokens: 2_000_000, outputTokens: 100 }, 1, 1)
    const value = projected(ctx, session)
    expect(value.models).toEqual([row('mock', 'deepseek-v4-flash', 0.40008, 2_000_000, 100)])
  })

  it('leaves the state untouched when a repeated sample equals the previous one', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 100, outputTokens: 10 }, 1, 1)
    const before = projected(ctx, session)
    usageChunk(session, { inputTokens: 100, outputTokens: 10 }, 1, 1)
    expect(projected(ctx, session)).toEqual(before)
  })

  it('replaces an earlier usage chunk sample from the same step', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 10 }, 1, 1)
    usageChunk(session, { inputTokens: 500_000, outputTokens: 20 }, 1, 1)
    expect(projected(ctx, session).models).toEqual([row('mock', 'deepseek-v4-flash', 0.100016, 500_000, 20)])
  })

  it('counts an unpriced model at zero cost and lists it as unpriced', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'not-listed')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, 1, 1)
    const value = projected(ctx, session)
    expect(value.totalCost).toBe(0)
    expect(value.models).toEqual([row('mock', 'not-listed', 0, 1_000_000, 1_000_000)])
    expect(value.unpricedModels).toEqual(['not-listed'])
    expect(value.quota?.estimated).toBe(true)
  })

  it('lists multiple unpriced models ascending without duplicates', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'zeta')
    usageChunk(session, { inputTokens: 1, outputTokens: 0 }, 1, 1)
    header(session, 'mock', 'alpha')
    usageChunk(session, { inputTokens: 1, outputTokens: 0 }, 1, 2)
    header(session, 'mock', 'zeta')
    usageChunk(session, { inputTokens: 1, outputTokens: 0 }, 1, 3)
    expect(projected(ctx, session).unpricedModels).toEqual(['alpha', 'zeta'])
  })

  it('attributes usage without a header to the (unknown) fallback model', async () => {
    const { ctx, session } = await harness(true)
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 1)
    const value = projected(ctx, session)
    expect(value.models).toEqual([row(UNKNOWN_MODEL, UNKNOWN_MODEL, 0, 1_000_000, 0)])
    expect(value.unpricedModels).toEqual([UNKNOWN_MODEL])
  })

  it('prices cache-write tokens and rounds money to six decimals', async () => {
    const { ctx, session } = await harness(true)
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1, outputTokens: 1, cacheReadTokens: 1, cacheWriteTokens: 1 }, 1, 1)
    expect(projected(ctx, session).totalCost).toBe(0.000001)
  })

  it('clamps quota remaining at zero and percent at one when the cap is exceeded', async () => {
    const { ctx, session } = await harness(true, { models: PRICES, currency: 'USD', quota: { limit: 0.1 } })
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 1)
    expect(projected(ctx, session).quota).toEqual({ limit: 0.1, used: 0.2, remaining: 0, percent: 1, estimated: false })
  })

  it('omits quota progress when the plugin configures none', async () => {
    const { ctx, session } = await harness(true, { models: PRICES, currency: 'USD' })
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 1)
    const value = projected(ctx, session)
    expect('quota' in value).toBe(false)
  })

  it('ignores usage-less chunks and prices a config entry without cache fields via the zero fallback', async () => {
    const { ctx, session } = await harness(true, {
      models: { 'bare-price': { input: 0.1, output: 0.2 } },
      currency: 'USD',
    })
    header(session, 'mock', 'bare-price')
    // A delta chunk (not a usage chunk) carries no sample.
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'delta', delta: [{ type: 'text', text: 'hi' }] },
    })
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000 }, 1, 1)
    // input 0.1 + output 0.2; cache fields fall back to 0
    expect(projected(ctx, session).totalCost).toBe(0.3)
  })

  it('ignores events without usage', async () => {
    const { ctx, session } = await harness(true)
    session.append('turn/start', { turn: 1 })
    session.append('step/start', { turn: 1, step: 1 })
    session.append('assistant/message', {
      turn: 1,
      step: 1,
      message: createMessage({
        role: 'assistant',
        content: [],
        source: { kind: 'model', provider: 'mock', model: 'mock' },
      }),
    }, { surfaceOp: 'append', sourceEventSeqs: [] })
    session.append('step/end', { turn: 1, step: 1 })
    expect(projected(ctx, session).totalCost).toBe(0)
  })

  it('has no billing key without the plugin, folds late mounts, and drops the key on unload (HMR safety)', async () => {
    const { ctx, session } = await harness(false)
    header(session, 'mock', 'deepseek-v4-flash')
    usageChunk(session, { inputTokens: 1_000_000, outputTokens: 0 }, 1, 1)
    expect('billing' in ctx.sessionProjections.snapshot(session).values).toBe(false)
    const fiber = await ctx.plugin(BillingPlugin, CONFIG)
    expect(projected(ctx, session).totalCost).toBe(0.2)
    await fiber.dispose()
    expect('billing' in ctx.sessionProjections.snapshot(session).values).toBe(false)
  })

  it('types the billing key through the SessionProjectionMap merge', async () => {
    const { ctx, session } = await harness(true)
    expectTypeOf(ctx.sessionProjections.snapshot(session).values.billing).toEqualTypeOf<BillingProjection | undefined>()
  })
})
