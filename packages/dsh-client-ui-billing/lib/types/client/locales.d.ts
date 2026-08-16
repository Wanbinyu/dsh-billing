/** `billing` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "billing";
/** `billing` namespace dictionaries. */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    label: string;
    'quota.used': string;
    'quota.limit': string;
    'quota.estimated': string;
    unpriced: string;
    'aria.bar': string;
};
/** The billing namespace key union. */
export type BillingKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: {
    label: string;
    'quota.used': string;
    'quota.limit': string;
    'quota.estimated': string;
    unpriced: string;
    'aria.bar': string;
};
