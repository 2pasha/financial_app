export interface MonobankClientInfoResponse {
  clientId: string;
  name: string;
  webHookUrl?: string;
  permissions?: string;
  accounts: MonobankAccountResponse[];
}

export interface MonobankAccountResponse {
  id: string;
  sendId: string;
  balance: number;
  creditLimit: number;
  currencyCode: number;
  cashbackType: string;
  type: string;
  iban?: string;
  maskedPan?: string[];
}
