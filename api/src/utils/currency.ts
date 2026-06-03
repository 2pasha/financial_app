const UAH = 980;

export function toUAHMinorUnits(
  tx: { amount: bigint; currency: number; operationAmount: bigint | null; operationCurrency: number | null },
  rateToUAH: (code: number) => number,
): number {
  if (tx.operationCurrency === UAH) {
    return Number(tx.amount);
  }
  if (tx.currency === UAH) {
    return tx.operationAmount !== null ? Number(tx.operationAmount) : Number(tx.amount);
  }
  return Math.round(Number(tx.amount) * rateToUAH(tx.currency));
}
