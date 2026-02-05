/**
 * Ticket Number Generator
 * Format: {PREFIX}-{YY}{MM}{DD}{HH}{mm}{SEQ}
 * Example: GCW-2602011853001
 */

const TICKET_PREFIX = 'GCW';

/**
 * Generates a unique ticket number based on timestamp and sequence
 * @param existingCount - Number of tickets already created in the same minute (for sequence)
 * @returns Formatted ticket number string
 */
export function generateTicketNumber(existingCount: number = 0): string {
    const now = new Date();

    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const seq = String(existingCount + 1).padStart(3, '0');

    return `${TICKET_PREFIX}-${yy}${mm}${dd}${hh}${min}${seq}`;
}

/**
 * Parse a ticket number to extract its components
 * @param ticketNumber - The formatted ticket number
 * @returns Object with parsed components or null if invalid
 */
export function parseTicketNumber(ticketNumber: string): {
    prefix: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    sequence: number;
} | null {
    const match = ticketNumber.match(/^([A-Z]+)-(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{3})$/);
    if (!match) return null;

    const [, prefix, yy, mm, dd, hh, min, seq] = match;
    return {
        prefix,
        year: 2000 + parseInt(yy, 10),
        month: parseInt(mm, 10),
        day: parseInt(dd, 10),
        hour: parseInt(hh, 10),
        minute: parseInt(min, 10),
        sequence: parseInt(seq, 10),
    };
}

/**
 * Get the minute prefix for querying existing tickets in the same minute
 * @returns The prefix pattern for the current minute (e.g., "GCW-2602011853")
 */
export function getCurrentMinutePrefix(): string {
    const now = new Date();

    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    return `${TICKET_PREFIX}-${yy}${mm}${dd}${hh}${min}`;
}
