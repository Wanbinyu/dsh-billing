import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { BillingProjection } from 'dsh-billing/client'
import { BillingBar } from '../src/client/BillingBar.js'
import { quotaTone } from '../src/client/quota.js'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const { createElement } = await import('react')
  return {
    IconDataOutline16: ({ size }: { size: number }) => createElement('svg', { 'data-test-icon': size }),
  }
})

const t = ((key: string) => key) as never

const billing: BillingProjection = {
  currency: 'USD',
  totalCost: 0.8,
  models: [{
    provider: 'deepseek',
    model: 'deepseek-chat',
    cost: 0.8,
    uncachedInputTokens: 1_000,
    outputTokens: 200,
    cacheReadTokens: 50,
    cacheWriteTokens: 25,
  }],
  unpricedModels: ['other/unpriced-model'],
  latestTurn: {
    turn: 2,
    cost: 0.3,
    uncachedInputTokens: 400,
    outputTokens: 100,
    cacheReadTokens: 20,
    cacheWriteTokens: 10,
    unpricedModels: ['other/unpriced-model'],
  },
  quota: {
    limit: 1,
    used: 0.8,
    remaining: 0.2,
    percent: 0.8,
    estimated: true,
  },
}

describe('BillingBar quota thresholds', () => {
  it.each([
    [0, 'normal'],
    [0.499, 'normal'],
    [0.5, 'notice'],
    [0.799, 'notice'],
    [0.8, 'warning'],
    [0.999, 'warning'],
    [1, 'danger'],
  ] as const)('maps %s to %s', (percent, expected) => {
    expect(quotaTone(percent)).toBe(expected)
  })
})

describe('BillingBar rendering', () => {
  it('renders session, latest-turn, quota, and incomplete-pricing feedback', () => {
    const html = renderToStaticMarkup(createElement(BillingBar, { billing, t }))

    expect(html).toContain('data-billing-bar="true"')
    expect(html).toContain('aria-label="aria.bar"')
    expect(html).toContain('data-tone="warning"')
    expect(html).toContain('width:80%')
    expect(html).toContain('quota.estimated')
    expect(html).toContain('deepseek/deepseek-chat')
  })

  it.each([undefined, null] as const)('renders nothing when billing is %s', value => {
    expect(renderToStaticMarkup(createElement(BillingBar, { billing: value, t }))).toBe('')
  })
})
