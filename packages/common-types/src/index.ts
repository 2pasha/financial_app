export type Transaction = {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO 8601 date string (e.g., "2025-11-04T10:30:00.000Z")
};

/**
 * Date serialization utilities for JSON-safe date handling
 */
export const DateUtils = {
  /**
   * Convert a Date object to ISO 8601 string for JSON serialization
   * @param date - Date object to convert
   * @returns ISO 8601 date string
   */
  toISOString(date: Date): string {
    return date.toISOString();
  },

  /**
   * Convert an ISO 8601 string back to a Date object
   * @param isoString - ISO 8601 date string
   * @returns Date object
   */
  fromISOString(isoString: string): Date {
    return new Date(isoString);
  },

  /**
   * Get current timestamp as ISO 8601 string
   * @returns Current date/time as ISO 8601 string
   */
  now(): string {
    return new Date().toISOString();
  },

  /**
   * Validate if a string is a valid ISO 8601 date
   * @param value - String to validate
   * @returns true if valid ISO 8601 date string
   */
  isValidISOString(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString() === value;
  },
};

