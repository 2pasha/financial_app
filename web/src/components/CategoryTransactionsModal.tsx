import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { categoriesApi, type CategoryTransaction } from "../lib/api-client";

interface CategoryTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  dateRange: { from: string; to: string };
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return amount >= 0 ? `+₴${abs}` : `-₴${abs}`;
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

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0 mr-4">
        <span className="text-sm text-card-foreground truncate">{tx.description}</span>
        <span className="text-xs text-muted-foreground">{formatDate(tx.time)}</span>
      </div>
      <span className={`text-sm font-medium shrink-0 ${isRefund ? "text-green-500" : "text-destructive"}`}>
        {formatAmount(tx.amount)}
      </span>
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
}: CategoryTransactionsModalProps) {
  const [transactions, setTransactions] = useState<CategoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);

    categoriesApi
      .getTransactions(categoryId, { from: dateRange.from, to: dateRange.to })
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [open, categoryId, dateRange.from, dateRange.to]);

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
