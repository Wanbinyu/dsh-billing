export type QuotaTone = 'normal' | 'notice' | 'warning' | 'danger';
/** Stable quota thresholds shared by the fill color and the visible warning. */
export declare function quotaTone(percent: number): QuotaTone;
