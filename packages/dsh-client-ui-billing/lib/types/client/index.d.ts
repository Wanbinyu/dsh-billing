/**
 * Billing surface plugin, browser half: the BillingBar entry in the
 * conversation.input.dock strip. Projection-mode surface — the live billing
 * value arrives through `useProjection('billing')` (seeded by the history
 * tail page, updated by session/projection frames), so this plugin owns no
 * store, no refresh chain, and no event listener. Read-only: no inject face
 * beyond the locale seat; without a configured price or quota the projection
 * carries no cost and the strip renders nothing.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type BillingKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The billing strip's copy. */
        billing: BillingKey;
    }
}
/** Required services for locale registration and the dock contribution. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and the billing dock entry.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
