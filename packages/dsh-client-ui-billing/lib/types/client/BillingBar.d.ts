/**
 * BillingBar: the cost strip docked above the message composer (input dock
 * strip, order 15 — after GoalBar, before the Queue rows). Shows the session
 * cost in the billing currency, a quota progress bar when the plugin
 * configures a per-session cap, and an unpriced-model warning when usage
 * arrived for models without a configured price. Loading (undefined), absent
 * (null), and a log with no usage at all render nothing.
 */
import type { BillingProjection } from 'dsh-billing/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
export interface BillingBarProps {
    /** The session's projected billing value; undefined = capability absent or loading, null = not registered. */
    billing: BillingProjection | null | undefined;
}
/**
 * The docked strip: total cost, quota progress, and the unpriced-model
 * warning. A pure presentation component — all state arrives through props.
 */
export declare function BillingBar({ billing, t }: BillingBarProps & PropsLocale<'billing'>): import("react").JSX.Element | null;
/** Full props of the dock entry: InputZone owner share + session standard kit + the locale seat. */
export type BillingDockProps = import('@deepseek-ai/dsh-client-ui-slots').PropsRuntime<'conversation.input.dock'> & PropsLocale<'billing'>;
/** Dock adapter: reads the host-computed 'billing' projection (whole value; absent or null renders nothing). */
export declare function BillingDock({ useProjection, t }: BillingDockProps): import("react").JSX.Element;
