/**
 * Billing plugin config handling: the exported schemastery `Config`
 * validates prices, currency, and quota shapes, the plugin's own key check
 * rejects stale or misspelled keys, and `apply` wires the generated
 * built-in catalog into the projection definition.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import * as BillingPlugin from '../src/index.ts'
import { BUILTIN_CATALOG } from '../src/catalog.ts'
import type { BillingConfig } from '../src/types.ts'

const VALID: BillingConfig = {
  models: { 'deepseek-v4-flash': { input: 0.2, output: 0.8 } },
  currency: 'USD',
  quota: { limit: 5 },
}

async function harness(config?: BillingConfig): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(BillingPlugin, config)
  return ctx
}

describe('billing plugin config', () => {
  it('names the plugin and injects the projection registry', () => {
    expect(BillingPlugin.name).toBe('billing')
    expect(BillingPlugin.inject).toEqual(['sessionProjections'])
  })

  it('registers the unit with the resolved prices, currency, and quota', async () => {
    const ctx = await harness(VALID)
    const session = ctx.sessions.create()
    session.append('request/header', { header: { config: { provider: 'mock', model: 'deepseek-v4-flash' } }, reason: 'initial' })
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'usage', usage: { inputTokens: 1_000_000, outputTokens: 0 } },
    })
    const value = ctx.sessionProjections.snapshot(session).values.billing
    expect(value).toMatchObject({ currency: 'USD', totalCost: 0.2, quota: { limit: 5 } })
  })

  it('defaults to an empty price map and USD when no config is given, still pricing via the catalog', async () => {
    const ctx = await harness()
    const session = ctx.sessions.create()
    session.append('request/header', { header: { config: { provider: 'deepseek', model: 'deepseek-v4-flash' } }, reason: 'initial' })
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'usage', usage: { inputTokens: 1_000_000, outputTokens: 0 } },
    })
    const value = ctx.sessionProjections.snapshot(session).values.billing
    // deepseek/deepseek-v4-flash exists in the generated catalog
    expect(value).toMatchObject({ currency: 'USD' })
    expect(value!.totalCost).toBeGreaterThan(0)
    expect(value!.unpricedModels).toEqual([])
  })

  it('direct apply accepts quota-present and quota-absent configs', () => {
    const ctx = new Context() as unknown as { sessionProjections: { register(definition: unknown): () => void } }
    const registrations: unknown[] = []
    ctx.sessionProjections = { register: definition => { registrations.push(definition); return () => {} } }
    BillingPlugin.apply(ctx as never, { models: {}, currency: 'USD' } as never)
    BillingPlugin.apply(ctx as never, VALID as never)
    expect(registrations).toHaveLength(2)
  })

  it('rejects an unknown top-level key', () => {
    expect(() => ctxApply({ ...VALID, budget: 1 } as never)).toThrow(/unknown key "budget"/)
  })

  it('rejects an unknown price key', () => {
    expect(() => ctxApply({
      models: { 'deepseek-v4-flash': { input: 0.2, output: 0.8, discount: 0.5 } },
    } as never)).toThrow(/unknown key "discount" in models/)
  })

  it('rejects an unknown quota key', () => {
    expect(() => ctxApply({ ...VALID, quota: { limit: 5, window: 'monthly' } } as never))
      .toThrow(/unknown key "window" in quota/)
  })

  it('rejects a zero quota limit', () => {
    expect(() => BillingPlugin.Config({ ...VALID, quota: { limit: 0 } })).toThrow()
    expect(() => ctxApply({ ...VALID, quota: { limit: 0 } } as never))
      .toThrow(/quota\.limit must be greater than 0/)
  })
})

/** Call the plugin's apply directly with a bare context to exercise key rejection without mounting. */
function ctxApply(config: never): void {
  BillingPlugin.apply(new Context() as never, config as never)
}

describe('built-in catalog', () => {
  it('is non-empty and covers the expected provider/model pairs', () => {
    expect(Object.keys(BUILTIN_CATALOG).length).toBeGreaterThan(20)
    expect(BUILTIN_CATALOG.deepseek?.['deepseek-v4-flash']).toBeDefined()
    expect(BUILTIN_CATALOG.anthropic?.['claude-haiku-4-5']).toBeDefined()
  })

  it('contains no all-zero price entries (they are pi-ai unknown markers)', () => {
    let zero = 0
    for (const provider of Object.values(BUILTIN_CATALOG)) {
      for (const price of Object.values(provider)) {
        if (price.input === 0 && price.output === 0 && price.cacheRead === 0 && price.cacheWrite === 0) zero++
      }
    }
    expect(zero).toBe(0)
  })

  it('has only non-negative prices', () => {
    for (const provider of Object.values(BUILTIN_CATALOG)) {
      for (const price of Object.values(provider)) {
        expect(price.input).toBeGreaterThanOrEqual(0)
        expect(price.output).toBeGreaterThanOrEqual(0)
        expect(price.cacheRead).toBeGreaterThanOrEqual(0)
        expect(price.cacheWrite).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
