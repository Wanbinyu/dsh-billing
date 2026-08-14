/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-billing`.
 * @module @deepseek-ai/dsh-billing/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-billing';
/** Cordis companion plugin name. */
export const name = 'billing-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the package owns a single pure projection fold whose
 * wire payload is schema-validated by the projection registry at every
 * snapshot and change-feed emission, and the event relation the fold relies
 * on (a `request/header` precedes every step's usage, keeping attribution
 * stable) is owned and runtime-checked by dsh-agent-loop, not here.
 */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
