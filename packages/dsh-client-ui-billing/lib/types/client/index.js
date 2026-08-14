import { BillingDock } from "./BillingBar.js";
import { NS, en, zh } from "./locales.js";
/** Required services for locale registration and the dock contribution. */
export const inject = ['slots', 'locale'];
/**
 * Client plugin body: register the dictionaries and the billing dock entry.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-billing: dictionaries');
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'billing',
        // After GoalBar (order 10), before the Queue rows (order 20): costs ride
        // the composer context stack with the other standing cards.
        order: 15,
        locale: NS,
    }, BillingDock));
}
