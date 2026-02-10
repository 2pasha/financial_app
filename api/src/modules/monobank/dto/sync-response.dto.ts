export class SyncResponseDto {
  success: boolean;
  message: string;
  accountsCount: number;
  transactionsCount: number;
  fallbackTo31Days?: boolean;
}
