import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { transactionsApi, categoriesApi } from "../lib/api-client";
import type { Transaction, Category } from "../lib/api-client";

interface TransactionDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

function formatAmountDisplay(amount: number, currencyCode: number): string {
  const major = amount / 100;
  const symbol = currencyCode === 980 ? "₴" : currencyCode === 840 ? "$" : currencyCode === 978 ? "€" : "";

  return `${symbol}${major.toFixed(2)}`;
}

function formatDateForInput(isoString: string): string {
  return isoString.slice(0, 16);
}

export function TransactionDrawer({
  transaction,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: TransactionDrawerProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setDescription(transaction.description);
    setAmount((transaction.amount / 100).toFixed(2));
    setDate(formatDateForInput(transaction.time));
    setCategoryId(transaction.categoryId ?? "none");
    setIsDirty(false);

    // Fetch categories scoped to the transaction's month (local calendar)
    setCategoriesLoading(true);
    const d = new Date(transaction.time);
    categoriesApi.getAll({
      from: transaction.time,
      calendarYear: d.getFullYear(),
      calendarMonth: d.getMonth() + 1,
    })
      .then(setCategories)
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, [transaction?.id]);

  const handleFieldChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!transaction) {
      return;
    }

    setIsSaving(true);
    try {
      const amountMinorUnits = Math.round(parseFloat(amount) * 100);
      const updated = await transactionsApi.update(transaction.id, {
        description,
        amount: amountMinorUnits,
        time: new Date(date).toISOString(),
        categoryId: categoryId === "none" ? null : categoryId,
      });
      onUpdate(updated);
      setIsDirty(false);
      toast.success("Transaction updated");
    } catch {
      toast.error("Failed to update transaction");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) {
      return;
    }

    setIsDeleting(true);
    try {
      await transactionsApi.delete(transaction.id);
      onDelete(transaction.id);
      onOpenChange(false);
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete transaction");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isManual = transaction?.account.type === "manual";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle>Transaction Details</SheetTitle>
            <SheetDescription>
              {transaction ? transaction.description : "Select a transaction to view details"}
            </SheetDescription>
          </SheetHeader>

          {transaction && (
            <>
              <div className="flex flex-col gap-4 px-4 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{transaction.account.type}</Badge>
                  {transaction.hold && <Badge variant="secondary">Hold</Badge>}
                  {isManual && <Badge variant="secondary">Manual</Badge>}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Amount (raw)</Label>
                  <p className="text-sm font-mono">
                    {formatAmountDisplay(transaction.amount, transaction.currency)}
                  </p>
                </div>

                {transaction.mcc && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">MCC</Label>
                    <p className="text-sm">{transaction.mcc}</p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-medium">Edit Details</h3>

                  <div className="space-y-2">
                    <Label htmlFor="tx-description">Description</Label>
                    <Input
                      id="tx-description"
                      value={description}
                      onChange={(e) => handleFieldChange(setDescription, e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-amount">
                      Amount ({transaction.currency === 980 ? "UAH" : transaction.currency === 840 ? "USD" : String(transaction.currency)})
                      <span className="text-muted-foreground ml-1 text-xs">negative = expense</span>
                    </Label>
                    <Input
                      id="tx-amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => handleFieldChange(setAmount, e.target.value)}
                      disabled={!isManual}
                    />
                    {!isManual && (
                      <p className="text-muted-foreground text-xs">Amount is read-only for Monobank transactions</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-date">Date & Time</Label>
                    <Input
                      id="tx-date"
                      type="datetime-local"
                      value={date}
                      onChange={(e) => handleFieldChange(setDate, e.target.value)}
                      disabled={!isManual}
                    />
                    {!isManual && (
                      <p className="text-muted-foreground text-xs">Date is read-only for Monobank transactions</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-category">Category</Label>
                    {categoriesLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading categories…
                      </div>
                    ) : (
                      <Select
                        value={categoryId}
                        onValueChange={(v) => handleFieldChange(setCategoryId, v)}
                      >
                        <SelectTrigger id="tx-category">
                          <SelectValue placeholder="No category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-2">
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting || isSaving}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
                <div className="flex gap-2 flex-1 justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                    {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {transaction && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{transaction.description}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
