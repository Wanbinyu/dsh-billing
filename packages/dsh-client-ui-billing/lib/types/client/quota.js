/** Stable quota thresholds shared by the fill color and the visible warning. */
export function quotaTone(percent) {
    if (percent >= 1)
        return 'danger';
    if (percent >= 0.8)
        return 'warning';
    if (percent >= 0.5)
        return 'notice';
    return 'normal';
}
