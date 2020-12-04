/**
 *
 * @param number {number}
 * @param step {number}
 * @returns {number}
 */
export const nearestNumber = (number, step) => {
    return Math.round(number / step) * step;
}
