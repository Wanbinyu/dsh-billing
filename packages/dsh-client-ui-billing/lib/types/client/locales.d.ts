/** `billing` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "billing";
/** `billing` namespace dictionaries. */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    label: string;
    turn: string;
    session: string;
    'tokens.input': string;
    'tokens.output': string;
    'tokens.cacheRead': string;
    'tokens.cacheWrite': string;
    'quota.used': string;
    'quota.limit': string;
    'quota.estimated': string;
    'quota.percent': string;
    'quota.full': string;
    unpriced: string;
    'aria.bar': string;
};
/** The billing namespace key union. */
export type BillingKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: {
    label: string;
    turn: string;
    session: string;
    'tokens.input': string;
    'tokens.output': string;
    'tokens.cacheRead': string;
    'tokens.cacheWrite': string;
    'quota.used': string;
    'quota.limit': string;
    'quota.estimated': string;
    'quota.percent': string;
    'quota.full': string;
    unpriced: string;
    'aria.bar': string;
};
