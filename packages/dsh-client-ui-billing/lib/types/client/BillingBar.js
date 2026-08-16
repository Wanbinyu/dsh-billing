import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconDataOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './BillingBar.module.css';
/** Format one money figure in the projection's own currency, up to micro-units. */
function formatMoney(currency, value) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
    }).format(value);
}
/**
 * The docked strip: total cost, quota progress, and the unpriced-model
 * warning. A pure presentation component — all state arrives through props.
 */
export function BillingBar({ billing, t }) {
    if (billing === undefined || billing === null)
        return null;
    if (billing.totalCost === 0 && billing.models.length === 0 && billing.quota === undefined)
        return null;
    const perModel = billing.models
        .map(row => `${row.provider}/${row.model}: ${formatMoney(billing.currency, row.cost)}`)
        .join('\n');
    return (_jsx("div", { className: css.dock, "data-billing-bar": true, title: perModel, children: _jsxs("div", { className: css.bar, role: "status", "aria-label": t('aria.bar'), children: [_jsx("span", { className: css.glyph, children: _jsx(IconDataOutline16, { size: 14 }) }), _jsx("span", { className: css.label, children: t('label') }), _jsx("span", { className: css.total, children: formatMoney(billing.currency, billing.totalCost) }), billing.quota !== undefined && (_jsxs("span", { className: css.quota, children: [_jsx("span", { className: css.quotaTrack, children: _jsx("span", { className: css.quotaFill, style: { width: `${Math.round(billing.quota.percent * 100)}%` } }) }), _jsxs("span", { className: css.quotaText, children: [t('quota.used'), " ", formatMoney(billing.currency, billing.quota.used), ' / ', t('quota.limit'), " ", formatMoney(billing.currency, billing.quota.limit)] })] })), billing.quota?.estimated && (_jsx("span", { className: css.unpriced, title: billing.unpricedModels.join('\n'), children: t('quota.estimated') })), billing.unpricedModels.length > 0 && (_jsxs("span", { className: css.unpriced, title: billing.unpricedModels.join('\n'), children: [t('unpriced'), ": ", billing.unpricedModels.length] }))] }) }));
}
/** Dock adapter: reads the host-computed 'billing' projection (whole value; absent or null renders nothing). */
export function BillingDock({ useProjection, t }) {
    const projection = useProjection('billing');
    return (_jsx(BillingBar, { billing: projection === undefined ? undefined : projection === null ? null : projection, t: t }));
}
