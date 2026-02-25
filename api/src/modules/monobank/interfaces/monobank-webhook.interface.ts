export interface MonobankWebhookPayload {
  type: string;
  data: {
    account: string;
    statementItem: MonobankWebhookStatementItem;
  };
}

export interface MonobankWebhookStatementItem {
  id: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc?: number;
  amount: number;
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
