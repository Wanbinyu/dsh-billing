/** `billing` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
export const NS = 'billing';
/** `billing` namespace dictionaries. */
/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
    'label': '费用',
    'turn': '本轮',
    'session': '会话',
    'tokens.input': '输入 Token',
    'tokens.output': '输出 Token',
    'tokens.cacheRead': '缓存命中 Token',
    'tokens.cacheWrite': '缓存写入 Token',
    'quota.used': '已用',
    'quota.limit': '额度',
    'quota.estimated': '未定价费用未计入',
    'quota.percent': '额度已用',
    'quota.full': '额度已满',
    'unpriced': '未定价模型',
    'aria.bar': '本次会话费用与额度进度',
};
/** English dictionary, checked complete against the zh key set. */
export const en = {
    'label': 'Cost',
    'turn': 'Turn',
    'session': 'Session',
    'tokens.input': 'Input tokens',
    'tokens.output': 'Output tokens',
    'tokens.cacheRead': 'Cache-read tokens',
    'tokens.cacheWrite': 'Cache-write tokens',
    'quota.used': 'Used',
    'quota.limit': 'Limit',
    'quota.estimated': 'Unpriced usage excluded',
    'quota.percent': 'Limit used',
    'quota.full': 'Limit reached',
    'unpriced': 'Unpriced models',
    'aria.bar': 'Session cost and quota progress',
};
