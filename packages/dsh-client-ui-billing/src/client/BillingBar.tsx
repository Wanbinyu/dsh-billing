/**
 * BillingBar: the cost strip docked above the message composer (input dock
 * strip, order 15 — after GoalBar, before the Queue rows). Shows the session
 * cost in the billing currency, a quota progress bar when the plugin
 * configures a per-session cap, and an unpriced-model warning when usage
 * arrived for models without a configured price. Loading (undefined), absent
 * (null), and a log with no usage at all render nothing.
 */

import type { BillingProjection } from 'dsh-billing/client'
import { IconDataOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './BillingBar.module.css'
import { quotaTone } from './quota.js'

export interface BillingBarProps {
  /** The session's projected billing value; undefined = capability absent or loading, null = not registered. */
  billing: BillingProjection | null | undefined
}

/** Format one money figure in the projection's own currency, up to micro-units. */
function formatMoney(currency: string, value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

/**
 * The docked strip: total cost, quota progress, and the unpriced-model
 * warning. A pure presentation component — all state arrives through props.
 */
export function BillingBar({ billing, t }: BillingBarProps & PropsLocale<'billing'>) {
  if (billing === undefined || billing === null) return null
  if (billing.totalCost === 0 && billing.models.length === 0 && billing.quota === undefined) return null

  const perModel = billing.models
    .map(row => `${row.provider}/${row.model}: ${formatMoney(billing.currency, row.cost)}`)
    .join('\n')
  const latest = billing.latestTurn
  const details = latest === undefined
    ? perModel
    : [
        `${t('turn')} ${latest.turn}: ${formatMoney(billing.currency, latest.cost)}`,
        `${t('tokens.input')}: ${latest.uncachedInputTokens.toLocaleString()}`,
        `${t('tokens.output')}: ${latest.outputTokens.toLocaleString()}`,
        `${t('tokens.cacheRead')}: ${latest.cacheReadTokens.toLocaleString()}`,
        `${t('tokens.cacheWrite')}: ${latest.cacheWriteTokens.toLocaleString()}`,
        perModel,
      ].filter(Boolean).join('\n')
  const tone = billing.quota === undefined ? 'normal' : quotaTone(billing.quota.percent)
  const quotaPercent = billing.quota === undefined ? 0 : Math.round(billing.quota.percent * 100)

  return (
    <div className={css.dock} data-billing-bar title={details}>
      <div className={css.bar} role="status" aria-label={t('aria.bar')}>
        <span className={css.glyph}><IconDataOutline16 size={14} /></span>
        <span className={css.label}>{t('label')}</span>
        <span className={css.costs}>
          {latest !== undefined && (
            <span className={css.metric}>
              <span className={css.metricLabel}>{t('turn')}</span>
              {formatMoney(billing.currency, latest.cost)}
            </span>
          )}
          <span className={css.metric}>
            <span className={css.metricLabel}>{t('session')}</span>
            {formatMoney(billing.currency, billing.totalCost)}
          </span>
        </span>
        {billing.quota !== undefined && (
          <span className={css.quota}>
            <span className={css.quotaTrack}>
              <span
                className={css.quotaFill}
                data-tone={tone}
                style={{ width: `${Math.round(billing.quota.percent * 100)}%` }}
              />
            </span>
            <span className={css.quotaText}>
              {t('quota.used')} {formatMoney(billing.currency, billing.quota.used)}
              {' / '}
              {t('quota.limit')} {formatMoney(billing.currency, billing.quota.limit)}
            </span>
          </span>
        )}
        {billing.quota !== undefined && tone !== 'normal' && (
          <span className={css.quotaAlert} data-tone={tone}>
            {tone === 'danger' ? t('quota.full') : t('quota.percent')} {quotaPercent}%
          </span>
        )}
        {billing.quota?.estimated && (
          <span className={css.unpriced} title={billing.unpricedModels.join('\n')}>
            {t('quota.estimated')}
          </span>
        )}
        {billing.unpricedModels.length > 0 && !billing.quota?.estimated && (
          <span className={css.unpriced} title={billing.unpricedModels.join('\n')}>
            {t('unpriced')}: {billing.unpricedModels.length}
          </span>
        )}
      </div>
    </div>
  )
}

/** Full props of the dock entry: InputZone owner share + session standard kit + the locale seat. */
export type BillingDockProps = import('@deepseek-ai/dsh-client-ui-slots').PropsRuntime<'conversation.input.dock'> & PropsLocale<'billing'>

/** Dock adapter: reads the host-computed 'billing' projection (whole value; absent or null renders nothing). */
export function BillingDock({ useProjection, t }: BillingDockProps) {
  const projection = useProjection('billing')
  return (
    <BillingBar
      billing={projection === undefined ? undefined : projection === null ? null : projection}
      t={t}
    />
  )
}
