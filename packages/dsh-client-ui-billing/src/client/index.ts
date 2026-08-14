/**
 * Billing surface plugin, browser half: the BillingBar entry in the
 * conversation.input.dock strip. Projection-mode surface — the live billing
 * value arrives through `useProjection('billing')` (seeded by the history
 * tail page, updated by session/projection frames), so this plugin owns no
 * store, no refresh chain, and no event listener. Read-only: no inject face
 * beyond the locale seat; without a configured price or quota the projection
 * carries no cost and the strip renders nothing.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (the input.dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the `billing` SessionProjectionMap key merge (single source, the domain's pure outlet).
import type {} from 'dsh-billing/client'
import { BillingDock } from './BillingBar.tsx'
import { NS, en, zh, type BillingKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The billing strip's copy. */
    billing: BillingKey
  }
}

/** Required services for locale registration and the dock contribution. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the dictionaries and the billing dock entry.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-billing: dictionaries')

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'billing',
    // After GoalBar (order 10), before the Queue rows (order 20): costs ride
    // the composer context stack with the other standing cards.
    order: 15,
    locale: NS,
  }, BillingDock))
}
