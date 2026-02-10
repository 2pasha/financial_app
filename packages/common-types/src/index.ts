export type Transaction = {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO 8601 date string (e.g., "2025-11-04T10:30:00.000Z")
};

/**
 * Monobank Account information
 */
export interface MonobankAccount {
  id: string;
  sendId: string;
  balance: number;
  creditLimit: number;
  currencyCode: number;
  cashbackType: string;
  type: string;
  iban?: string;
}

/**
 * Monobank Transaction from API
 */
export interface MonobankTransaction {
  id: string;
  time: number; // Unix timestamp in seconds
  description: string;
  mcc: number;
  originalMcc?: number;
  amount: number; // in minor units (cents)
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  hold: boolean;
  receiptId?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
  counterName?: string;
}

/**
 * Client info from Monobank API
 */
export interface MonobankClientInfo {
  clientId: string;
  name: string;
  webHookUrl?: string;
  permissions?: string;
  accounts: MonobankAccount[];
}

/**
 * API Request/Response DTOs
 */
export namespace API {
  export interface SaveTokenRequest {
    token: string;
  }

  export interface SaveTokenResponse {
    success: boolean;
    message: string;
  }

  export interface SyncResponse {
    success: boolean;
    message: string;
    accountsCount: number;
    transactionsCount: number;
    fallbackTo31Days?: boolean;
  }

  export interface GetTransactionsResponse {
    transactions: MonobankTransaction[];
    total: number;
  }

  export interface GetTransactionsQuery {
    page?: number;
    limit?: number;
    accountId?: string;
    from?: string; // ISO date
    to?: string; // ISO date
  }

  export interface TokenStatusResponse {
    hasToken: boolean;
    hasTransactions: boolean;
    transactionCount: number;
    lastTransactionDate: string | null;
  }
}

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

