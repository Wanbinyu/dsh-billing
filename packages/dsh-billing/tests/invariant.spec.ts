/**
 * The billing invariant companion reserves package ownership like every
 * harness package; its installer is an explained empty (the fold's wire
 * payload is schema-validated by the projection registry, and header-before-
 * usage attribution is owned by the agent loop).
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import * as BillingInvariant from '../src/invariant.ts'

describe('billing invariant companion', () => {
  it('registers its explained empty runtime invariant', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry)
    const fiber = await ctx.plugin(BillingInvariant)

    expect(() => {
      ctx.invariants.register('dsh-billing', () => {})
    }).toThrow(/already registered/)
    await fiber.dispose()
    await ctx.fiber.dispose()
  })
})
