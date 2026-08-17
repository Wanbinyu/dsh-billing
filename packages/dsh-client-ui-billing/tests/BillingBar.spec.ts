import { describe, expect, it } from 'vitest'
import { quotaTone } from '../src/client/quota.js'

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
