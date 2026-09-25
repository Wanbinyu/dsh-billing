/**
 * First-party DeepSeek schedule: V4.1-Flash (`deepseek-flash`) and the
 * retired Flash aliases share one card from 2026-09-10 04:00 UTC, V4 Pro
 * keeps its own card, and peak windows follow the official UTC timetable.
 */

import { describe, expect, it } from 'vitest'
import { createMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { BUILTIN_CATALOG } from '../src/catalog.ts'
import { isDeepSeekPeak, officialSliceKey, priceForSliceKey } from '../src/deepseek-rates.ts'
import { billingProjectionDefinition } from '../src/projection.ts'

const at = (iso: string): number => Date.parse(iso)

describe('DeepSeek peak windows', () => {
  it('treats weekday UTC peak windows as peak and the boundary as off-peak', () => {
    expect(isDeepSeekPeak(at('2026-09-24T02:00:00.000Z'))).toBe(true)
    expect(isDeepSeekPeak(at('2026-09-24T07:30:00.000Z'))).toBe(true)
    expect(isDeepSeekPeak(at('2026-09-24T04:00:00.000Z'))).toBe(false)
    expect(isDeepSeekPeak(at('2026-09-24T12:00:00.000Z'))).toBe(false)
  })

  it('keeps weekends and the 2026 Mid-Autumn holiday off-peak', () => {
    expect(isDeepSeekPeak(at('2026-09-26T02:00:00.000Z'))).toBe(false)
    // Friday 2026-09-25 is a public holiday in China; 02:00 UTC is 10:00 CST.
    expect(isDeepSeekPeak(at('2026-09-25T02:00:00.000Z'))).toBe(false)
  })
})

describe('official DeepSeek cards', () => {
  it('prices deepseek-flash and retired Flash aliases on the 2026-09-10 card', () => {
    const peak = at('2026-09-24T02:00:00.000Z')
    const off = at('2026-09-24T12:00:00.000Z')
    for (const model of ['deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-flash-vision-exp']) {
      const peakCard = priceForSliceKey(officialSliceKey('deepseek-official', model, peak)!)
      const offCard = priceForSliceKey(officialSliceKey('deepseek', model, off)!)
      expect(peakCard).toEqual({ input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite: 0.3 })
      expect(offCard).toEqual({ input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0.15 })
    }
  })

  it('keeps deepseek-v4-pro on the Pro card after the withdrawn September 14 reroute', () => {
    const card = priceForSliceKey(officialSliceKey('deepseek-official', 'deepseek-v4-pro', at('2026-09-15T02:00:00.000Z'))!)
    expect(card).toEqual({ input: 1.32, output: 3.96, cacheRead: 0.044, cacheWrite: 1.32 })
  })

  it('uses the previous Flash card before 2026-09-10 04:00 UTC', () => {
    const justBefore = priceForSliceKey(officialSliceKey('deepseek-official', 'deepseek-flash', at('2026-09-10T03:59:00.000Z'))!)
    const atCut = priceForSliceKey(officialSliceKey('deepseek-official', 'deepseek-flash', at('2026-09-10T04:00:00.000Z'))!)
    expect(justBefore).toEqual({ input: 0.45, output: 1.35, cacheRead: 0.015, cacheWrite: 0.45 })
    expect(atCut).toEqual({ input: 0.15, output: 0.6, cacheRead: 0.003, cacheWrite: 0.15 })
  })

  it('does not apply the first-party card to another provider', () => {
    expect(officialSliceKey('openrouter', 'deepseek-flash', at('2026-09-24T02:00:00.000Z'))).toBeNull()
  })
})

describe('billing projection with the official schedule', () => {
  const definition = billingProjectionDefinition({
    prices: {},
    catalog: BUILTIN_CATALOG,
    currency: 'USD',
    quotaLimit: undefined,
    officialDeepSeek: true,
  })

  const project = (events: SessionEvent[]) => {
    let state = definition.init()
    for (const event of events) state = definition.apply(state, event)
    return definition.wire.view(state)
  }

  const header = (time: number, model: string): SessionEvent => ({
    type: 'request/header',
    seq: 1,
    time,
    data: { header: { config: { provider: 'deepseek-official', model } }, reason: 'initial' },
  })

  const usage = (time: number, seq: number, inputTokens: number, cacheReadTokens = 0): SessionEvent => ({
    type: 'assistant/chunk',
    seq,
    time,
    data: { turn: 1, step: seq, chunk: { type: 'usage', usage: { inputTokens, outputTokens: 0, cacheReadTokens } } },
  })

  it('prices the default deepseek-flash route instead of leaving it unpriced', () => {
    const time = at('2026-09-24T02:00:00.000Z')
    const view = project([header(time, 'deepseek-flash'), usage(time, 2, 1_000_000, 1_000_000)])
    expect(view.unpricedModels).toEqual([])
    expect(view.totalCost).toBe(0.306)
    expect(view.models[0]).toMatchObject({ provider: 'deepseek-official', model: 'deepseek-flash' })
  })

  it('sums a peak sample and an off-peak sample on their own cards', () => {
    const peak = at('2026-09-24T02:00:00.000Z')
    const off = at('2026-09-24T12:00:00.000Z')
    const view = project([
      header(peak, 'deepseek-flash'),
      usage(peak, 2, 1_000_000),
      usage(off, 3, 1_000_000),
    ])
    expect(view.totalCost).toBe(0.45)
  })

  it('lets an explicit config price replace the schedule', () => {
    const priced = billingProjectionDefinition({
      prices: { 'deepseek-flash': { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 } },
      catalog: BUILTIN_CATALOG,
      currency: 'USD',
      quotaLimit: undefined,
      officialDeepSeek: true,
    })
    const time = at('2026-09-24T02:00:00.000Z')
    let state = priced.init()
    state = priced.apply(state, header(time, 'deepseek-flash'))
    state = priced.apply(state, usage(time, 2, 1_000_000))
    expect(priced.wire.view(state).totalCost).toBe(1)
  })

  it('still prices a catalog model that is not on the DeepSeek card', () => {
    const time = at('2026-09-24T02:00:00.000Z')
    const event: SessionEvent = {
      type: 'assistant/message',
      seq: 2,
      time,
      data: {
        turn: 1,
        step: 1,
        message: createMessage({
          role: 'assistant',
          content: [],
          source: { kind: 'model', provider: 'mock', model: 'mock' },
        }),
        usage: { inputTokens: 1_000_000, outputTokens: 0 },
        stream: [],
      },
      surfaceOp: 'append',
    }
    let state = definition.init()
    state = definition.apply(state, {
      type: 'request/header',
      seq: 1,
      time,
      data: { header: { config: { provider: 'anthropic', model: 'claude-haiku-4-5' } }, reason: 'initial' },
    })
    state = definition.apply(state, event)
    expect(definition.wire.view(state).totalCost).toBe(BUILTIN_CATALOG.anthropic?.['claude-haiku-4-5']?.input)
  })
})
