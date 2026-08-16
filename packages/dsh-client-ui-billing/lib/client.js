window.__ModuleLoader__.load({ id: "dsh-client-ui-billing", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
let react_jsx_runtime = require("react/jsx-runtime");
let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

//#region \0dsh-css:C:\Users\a\Documents\Codex\2026-08-14\https-github-com-deepseek-ai-deepseek\work\audit-dsh-billing\packages\dsh-client-ui-billing\src\client\BillingBar.module.css.mjs
const css = ".ekStxa_dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto}.ekStxa_bar{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);border-radius:12px;align-items:center;gap:10px;height:36px;margin:0 auto;padding:4px 5px 4px 12px;display:flex}.ekStxa_glyph{color:var(--dsw-alias-label-tertiary);flex:none;display:inline-flex}.ekStxa_label{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:24px}.ekStxa_total{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);flex:none;font-size:13px;line-height:20px}.ekStxa_quota{flex:1;align-items:center;gap:8px;min-width:0;display:flex}.ekStxa_quotaTrack{background:var(--dsw-alias-interactive-bg-hover);border-radius:2px;flex:none;width:64px;height:4px;overflow:hidden}.ekStxa_quotaFill{background:var(--dsw-alias-state-business-primary);border-radius:2px;height:100%;display:block}.ekStxa_quotaText{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:20px;overflow:hidden}.ekStxa_unpriced{color:var(--dsw-alias-state-warning-primary);flex:none;font-size:12px;line-height:20px}";
const tagId = "dsh-client-ui-billing/BillingBar.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
	const tag = document.createElement("style");
	tag.dataset.plugin = "dsh-client-ui-billing";
	tag.dataset.pluginCss = tagId;
	tag.textContent = css;
	document.head.appendChild(tag);
}
var BillingBar_module_css_default = {
	"quotaFill": "ekStxa_quotaFill",
	"quota": "ekStxa_quota",
	"quotaTrack": "ekStxa_quotaTrack",
	"bar": "ekStxa_bar",
	"label": "ekStxa_label",
	"total": "ekStxa_total",
	"unpriced": "ekStxa_unpriced",
	"quotaText": "ekStxa_quotaText",
	"glyph": "ekStxa_glyph",
	"dock": "ekStxa_dock"
};

//#endregion
//#region lib/types/client/BillingBar.js
/** Format one money figure in the projection's own currency, up to micro-units. */
function formatMoney(currency, value) {
	return new Intl.NumberFormat(void 0, {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 6
	}).format(value);
}
/**
* The docked strip: total cost, quota progress, and the unpriced-model
* warning. A pure presentation component — all state arrives through props.
*/
function BillingBar({ billing, t }) {
	if (billing === void 0 || billing === null) return null;
	if (billing.totalCost === 0 && billing.models.length === 0 && billing.quota === void 0) return null;
	const perModel = billing.models.map((row) => `${row.provider}/${row.model}: ${formatMoney(billing.currency, row.cost)}`).join("\n");
	return (0, react_jsx_runtime.jsx)("div", {
		className: BillingBar_module_css_default.dock,
		"data-billing-bar": true,
		title: perModel,
		children: (0, react_jsx_runtime.jsxs)("div", {
			className: BillingBar_module_css_default.bar,
			role: "status",
			"aria-label": t("aria.bar"),
			children: [
				(0, react_jsx_runtime.jsx)("span", {
					className: BillingBar_module_css_default.glyph,
					children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 14 })
				}),
				(0, react_jsx_runtime.jsx)("span", {
					className: BillingBar_module_css_default.label,
					children: t("label")
				}),
				(0, react_jsx_runtime.jsx)("span", {
					className: BillingBar_module_css_default.total,
					children: formatMoney(billing.currency, billing.totalCost)
				}),
				billing.quota !== void 0 && (0, react_jsx_runtime.jsxs)("span", {
					className: BillingBar_module_css_default.quota,
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: BillingBar_module_css_default.quotaTrack,
						children: (0, react_jsx_runtime.jsx)("span", {
							className: BillingBar_module_css_default.quotaFill,
							style: { width: `${Math.round(billing.quota.percent * 100)}%` }
						})
					}), (0, react_jsx_runtime.jsxs)("span", {
						className: BillingBar_module_css_default.quotaText,
						children: [
							t("quota.used"),
							" ",
							formatMoney(billing.currency, billing.quota.used),
							" / ",
							t("quota.limit"),
							" ",
							formatMoney(billing.currency, billing.quota.limit)
						]
					})]
				}),
				billing.quota?.estimated && (0, react_jsx_runtime.jsx)("span", {
					className: BillingBar_module_css_default.unpriced,
					title: billing.unpricedModels.join("\n"),
					children: t("quota.estimated")
				}),
				billing.unpricedModels.length > 0 && (0, react_jsx_runtime.jsxs)("span", {
					className: BillingBar_module_css_default.unpriced,
					title: billing.unpricedModels.join("\n"),
					children: [
						t("unpriced"),
						": ",
						billing.unpricedModels.length
					]
				})
			]
		})
	});
}
/** Dock adapter: reads the host-computed 'billing' projection (whole value; absent or null renders nothing). */
function BillingDock({ useProjection, t }) {
	const projection = useProjection("billing");
	return (0, react_jsx_runtime.jsx)(BillingBar, {
		billing: projection === void 0 ? void 0 : projection === null ? null : projection,
		t
	});
}

//#endregion
//#region lib/types/client/locales.js
/** `billing` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
const NS = "billing";
/** `billing` namespace dictionaries. */
/** Simplified Chinese dictionary (the key-set source of truth). */
const zh = {
	"label": "本次会话费用",
	"quota.used": "已用",
	"quota.limit": "额度",
	"quota.estimated": "未定价费用未计入",
	"unpriced": "未定价模型",
	"aria.bar": "本次会话费用与额度进度"
};
/** English dictionary, checked complete against the zh key set. */
const en = {
	"label": "Session cost",
	"quota.used": "Used",
	"quota.limit": "Limit",
	"quota.estimated": "Unpriced usage excluded",
	"unpriced": "Unpriced models",
	"aria.bar": "Session cost and quota progress"
};

//#endregion
//#region lib/types/client/index.js
/** Required services for locale registration and the dock contribution. */
const inject = ["slots", "locale"];
/**
* Client plugin body: register the dictionaries and the billing dock entry.
* @param ctx - client root context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "ui-billing: dictionaries");
	ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
		name: "conversation.input.dock",
		id: "billing",
		order: 15,
		locale: NS
	}, BillingDock));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map