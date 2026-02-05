/**
 * Handles numeric input changes by removing leading zeros.
 * Returns a number or an empty string.
 * @param value The input string value
 * @returns The cleaned numeric value or empty string
 */
export const handleNumberInput = (value: string): number | string => {
    // Return empty string for empty input
    if (value === '' || value === undefined || value === null) return '';

    // If valid number, parse it to remove leading zeros (e.g. "012" -> 12)
    const num = Number(value);

    // Return empty string if NaN
    if (isNaN(num)) return '';

    // Return the parsed number (primitive)
    return num;
};
