import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { categoriesApi, tripsApi, type CategoryTransaction } from "../lib/api-client";

interface CategoryTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  dateRange: { from: string; to: string };
  tripId?: string;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function currencySymbolFromCode(code: number): string {
  switch (code) {
    case 980: return "₴";
    case 840: return "$";
    case 978: return "€";
    case 826: return "£";
    default: return "";
  }
}

function formatAmount(amount: number, currencyCode: number): string {
  const symbol = currencySymbolFromCode(currencyCode);
  const abs = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return amount >= 0 ? `+${symbol}${abs}` : `-${symbol}${abs}`;
}

function NetTotal({ transactions }: { transactions: CategoryTransaction[] }) {
  const net = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const spent = Math.max(0, -net);

  return (
    <div className="flex justify-between items-center pt-3 border-t border-border font-medium">
      <span className="text-muted-foreground text-sm">Net spent</span>
      <span className="text-card-foreground">₴{spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}

function TransactionRow({ tx }: { tx: CategoryTransaction }) {
  const isRefund = tx.amount > 0;
  const ownCurrency = tx.operationCurrency ?? tx.currency;
  const isCross = tx.operationAmount != null && tx.operationCurrency !== tx.currency;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0 mr-4">
        <span className="text-sm text-card-foreground truncate">{tx.description}</span>
        <span className="text-xs text-muted-foreground">{formatDate(tx.time)}</span>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-sm font-medium ${isRefund ? "text-green-500" : "text-destructive"}`}>
          {formatAmount(tx.amount, ownCurrency)}
        </span>
        {isCross && (
          <p className="text-xs text-muted-foreground">
            {formatAmount(tx.operationAmount!, tx.currency)}
          </p>
        )}
      </div>
    </div>
  );
}

export function CategoryTransactionsModal({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  dateRange,
  tripId,
}: CategoryTransactionsModalProps) {
  const [transactions, setTransactions] = useState<CategoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);

    const fetch = tripId
      ? tripsApi.getTransactions(tripId, { from: dateRange.from, to: dateRange.to })
      : categoriesApi.getTransactions(categoryId, { from: dateRange.from, to: dateRange.to });

    fetch.then(setTransactions).finally(() => setLoading(false));
  }, [open, categoryId, tripId, dateRange.from, dateRange.to]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${categoryColor}30`,
                border: `1px solid ${categoryColor}40`,
              }}
            >
              <span className="text-xl">{categoryIcon}</span>
            </div>
            <span>{categoryName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              No transactions for this period.
            </p>
          ) : (
            <div className="flex flex-col">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>

        {!loading && transactions.length > 0 && (
          <NetTotal transactions={transactions} />
        )}
      </DialogContent>
    </Dialog>
  );
}
