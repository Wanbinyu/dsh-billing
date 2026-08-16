/** `billing` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'billing'

/** `billing` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'label': '本次会话费用',
  'quota.used': '已用',
  'quota.limit': '额度',
  'quota.estimated': '未定价费用未计入',
  'unpriced': '未定价模型',
  'aria.bar': '本次会话费用与额度进度',
} satisfies Record<string, string>

/** The billing namespace key union. */
export type BillingKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'label': 'Session cost',
  'quota.used': 'Used',
  'quota.limit': 'Limit',
  'quota.estimated': 'Unpriced usage excluded',
  'unpriced': 'Unpriced models',
  'aria.bar': 'Session cost and quota progress',
} satisfies Record<BillingKey, string>
