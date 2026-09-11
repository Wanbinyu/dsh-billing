window.__ModuleLoader__.load({ id: "dsh-billing-community-bundle", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
let react_jsx_runtime = require("react/jsx-runtime");
let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

//#region \0dsh-css:G:\dsh-compat-0911\dsh-billing\packages\dsh-client-ui-billing\src\client\BillingBar.module.css.mjs
const css = ".mRoMlW_dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto}.mRoMlW_bar{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);border-radius:12px;align-items:center;gap:8px;height:36px;margin:0 auto;padding:4px 5px 4px 12px;display:flex}.mRoMlW_glyph{color:var(--dsw-alias-label-tertiary);flex:none;display:inline-flex}.mRoMlW_label{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:24px}.mRoMlW_costs{flex:none;align-items:center;gap:8px;display:inline-flex}.mRoMlW_metric{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);white-space:nowrap;align-items:baseline;gap:4px;font-size:13px;line-height:20px;display:inline-flex}.mRoMlW_metricLabel{color:var(--dsw-alias-label-secondary);font-size:11px}.mRoMlW_quota{flex:1;align-items:center;gap:8px;min-width:0;display:flex}.mRoMlW_quotaTrack{background:var(--dsw-alias-interactive-bg-hover);border-radius:2px;flex:none;width:64px;height:4px;overflow:hidden}.mRoMlW_quotaFill{background:var(--dsw-alias-state-business-primary);border-radius:2px;height:100%;display:block}.mRoMlW_quotaFill[data-tone=notice]{filter:saturate(1.35)}.mRoMlW_quotaFill[data-tone=warning]{background:var(--dsw-alias-state-warning-primary)}.mRoMlW_quotaFill[data-tone=danger]{background:var(--dsw-alias-state-error-primary,#cf222e)}.mRoMlW_quotaText{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:20px;overflow:hidden}.mRoMlW_unpriced{color:var(--dsw-alias-state-warning-primary);flex:none;font-size:12px;line-height:20px}.mRoMlW_quotaAlert{white-space:nowrap;color:var(--dsw-alias-label-secondary);flex:none;font-size:11px;line-height:20px}.mRoMlW_quotaAlert[data-tone=warning]{color:var(--dsw-alias-state-warning-primary)}.mRoMlW_quotaAlert[data-tone=danger]{color:var(--dsw-alias-state-error-primary,#cf222e);font-weight:600}@media (width<=720px){.mRoMlW_label,.mRoMlW_quotaText{display:none}.mRoMlW_bar,.mRoMlW_costs{gap:6px}}@media (width<=520px){.mRoMlW_glyph,.mRoMlW_quotaAlert{display:none}.mRoMlW_quotaTrack{width:40px}.mRoMlW_unpriced{text-overflow:ellipsis;white-space:nowrap;max-width:54px;overflow:hidden}}@media (width<=380px){.mRoMlW_metricLabel,.mRoMlW_unpriced{display:none}}";
const tagId = "dsh-billing-community-bundle/BillingBar.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
	const tag = document.createElement("style");
	tag.dataset.plugin = "dsh-billing-community-bundle";
	tag.dataset.pluginCss = tagId;
	tag.textContent = css;
	document.head.appendChild(tag);
}
var BillingBar_module_css_default = {
	"bar": "mRoMlW_bar",
	"costs": "mRoMlW_costs",
	"dock": "mRoMlW_dock",
	"glyph": "mRoMlW_glyph",
	"label": "mRoMlW_label",
	"metric": "mRoMlW_metric",
	"metricLabel": "mRoMlW_metricLabel",
	"quota": "mRoMlW_quota",
	"quotaAlert": "mRoMlW_quotaAlert",
	"quotaFill": "mRoMlW_quotaFill",
	"quotaText": "mRoMlW_quotaText",
	"quotaTrack": "mRoMlW_quotaTrack",
	"unpriced": "mRoMlW_unpriced"
};

//#endregion
//#region lib/types/client/quota.js
/** Stable quota thresholds shared by the fill color and the visible warning. */
function quotaTone(percent) {
	if (percent >= 1) return "danger";
	if (percent >= .8) return "warning";
	if (percent >= .5) return "notice";
	return "normal";
}

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
	const latest = billing.latestTurn;
	const details = latest === void 0 ? perModel : [
		`${t("turn")} ${latest.turn}: ${formatMoney(billing.currency, latest.cost)}`,
		`${t("tokens.input")}: ${latest.uncachedInputTokens.toLocaleString()}`,
		`${t("tokens.output")}: ${latest.outputTokens.toLocaleString()}`,
		`${t("tokens.cacheRead")}: ${latest.cacheReadTokens.toLocaleString()}`,
		`${t("tokens.cacheWrite")}: ${latest.cacheWriteTokens.toLocaleString()}`,
		perModel
	].filter(Boolean).join("\n");
	const tone = billing.quota === void 0 ? "normal" : quotaTone(billing.quota.percent);
	const quotaPercent = billing.quota === void 0 ? 0 : Math.round(billing.quota.percent * 100);
	return (0, react_jsx_runtime.jsx)("div", {
		className: BillingBar_module_css_default.dock,
		"data-billing-bar": true,
		title: details,
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
				(0, react_jsx_runtime.jsxs)("span", {
					className: BillingBar_module_css_default.costs,
					children: [latest !== void 0 && (0, react_jsx_runtime.jsxs)("span", {
						className: BillingBar_module_css_default.metric,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: BillingBar_module_css_default.metricLabel,
							children: t("turn")
						}), formatMoney(billing.currency, latest.cost)]
					}), (0, react_jsx_runtime.jsxs)("span", {
						className: BillingBar_module_css_default.metric,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: BillingBar_module_css_default.metricLabel,
							children: t("session")
						}), formatMoney(billing.currency, billing.totalCost)]
					})]
				}),
				billing.quota !== void 0 && (0, react_jsx_runtime.jsxs)("span", {
					className: BillingBar_module_css_default.quota,
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: BillingBar_module_css_default.quotaTrack,
						children: (0, react_jsx_runtime.jsx)("span", {
							className: BillingBar_module_css_default.quotaFill,
							"data-tone": tone,
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
				billing.quota !== void 0 && tone !== "normal" && (0, react_jsx_runtime.jsxs)("span", {
					className: BillingBar_module_css_default.quotaAlert,
					"data-tone": tone,
					children: [
						tone === "danger" ? t("quota.full") : t("quota.percent"),
						" ",
						quotaPercent,
						"%"
					]
				}),
				billing.quota?.estimated && (0, react_jsx_runtime.jsx)("span", {
					className: BillingBar_module_css_default.unpriced,
					title: billing.unpricedModels.join("\n"),
					children: t("quota.estimated")
				}),
				billing.unpricedModels.length > 0 && !billing.quota?.estimated && (0, react_jsx_runtime.jsxs)("span", {
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
	"label": "费用",
	"turn": "本轮",
	"session": "会话",
	"tokens.input": "输入 Token",
	"tokens.output": "输出 Token",
	"tokens.cacheRead": "缓存命中 Token",
	"tokens.cacheWrite": "缓存写入 Token",
	"quota.used": "已用",
	"quota.limit": "额度",
	"quota.estimated": "未定价费用未计入",
	"quota.percent": "额度已用",
	"quota.full": "额度已满",
	"unpriced": "未定价模型",
	"aria.bar": "本次会话费用与额度进度"
};
/** English dictionary, checked complete against the zh key set. */
const en = {
	"label": "Cost",
	"turn": "Turn",
	"session": "Session",
	"tokens.input": "Input tokens",
	"tokens.output": "Output tokens",
	"tokens.cacheRead": "Cache-read tokens",
	"tokens.cacheWrite": "Cache-write tokens",
	"quota.used": "Used",
	"quota.limit": "Limit",
	"quota.estimated": "Unpriced usage excluded",
	"quota.percent": "Limit used",
	"quota.full": "Limit reached",
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
//# sourceMappingURL=community-client.js.map