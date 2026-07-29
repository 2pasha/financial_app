import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Loader2, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { transactionsApi, categoriesApi } from "../lib/api-client";
import type { Transaction, Category } from "../lib/api-client";
import { useAppSettings } from "../hooks/useAppSettings";
import { tf } from "../lib/translations";

interface TransactionDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
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

function formatAmountDisplay(amount: number, currencyCode: number): string {
  return `${currencySymbolFromCode(currencyCode)}${(amount / 100).toFixed(2)}`;
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
  const { t } = useAppSettings();
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
      .catch(() => toast.error(t.loadCategoriesFailed))
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
      toast.success(t.transactionUpdated);
    } catch {
      toast.error(t.updateTransactionFailed);
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
      toast.success(t.transactionDeleted);
    } catch {
      toast.error(t.deleteTransactionFailed);
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
            <SheetTitle>{t.transactionDetails}</SheetTitle>
            <SheetDescription>
              {transaction ? transaction.description : t.transactionDetailsHint}
            </SheetDescription>
          </SheetHeader>

          {transaction && (
            <>
              <div className="flex flex-col gap-4 px-4 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{transaction.account.type}</Badge>
                  {transaction.hold && <Badge variant="secondary">{t.txnHold}</Badge>}
                  {isManual && <Badge variant="secondary">{t.txnManual}</Badge>}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.amountRaw}</Label>
                  <p className="text-sm font-mono">
                    {formatAmountDisplay(transaction.amount, transaction.operationCurrency ?? transaction.currency)}
                  </p>
                  {transaction.operationAmount != null && transaction.operationCurrency !== transaction.currency && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {currencySymbolFromCode(transaction.currency)}
                      {Math.abs(transaction.operationAmount / 100).toFixed(2)}
                    </p>
                  )}
                </div>

                {transaction.mcc && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">MCC</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={t.mccTooltip}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">{t.mccTooltip}</TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm">{transaction.mcc}</p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-medium">{t.editDetails}</h3>

                  <div className="space-y-2">
                    <Label htmlFor="tx-description">{t.descriptionLabel}</Label>
                    <Input
                      id="tx-description"
                      value={description}
                      onChange={(e) => handleFieldChange(setDescription, e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-amount">
                      {t.amountLabel} ({(transaction.operationCurrency ?? transaction.currency) === 980 ? "UAH" : (transaction.operationCurrency ?? transaction.currency) === 840 ? "USD" : (transaction.operationCurrency ?? transaction.currency) === 978 ? "EUR" : String(transaction.operationCurrency ?? transaction.currency)})
                      <span className="text-muted-foreground ml-1 text-xs">{t.negativeIsExpense}</span>
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
                      <p className="text-muted-foreground text-xs">{t.amountReadOnly}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-date">{t.dateTimeLabel}</Label>
                    <Input
                      id="tx-date"
                      type="datetime-local"
                      value={date}
                      onChange={(e) => handleFieldChange(setDate, e.target.value)}
                      disabled={!isManual}
                    />
                    {!isManual && (
                      <p className="text-muted-foreground text-xs">{t.dateReadOnly}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-category">{t.categoryLabel}</Label>
                    {categoriesLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.loadingCategories}
                      </div>
                    ) : (
                      <Select
                        value={categoryId}
                        onValueChange={(v) => handleFieldChange(setCategoryId, v)}
                      >
                        <SelectTrigger id="tx-category">
                          <SelectValue placeholder={t.noCategory} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t.noCategory}</SelectItem>
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
                  {t.delete}
                </Button>
                <div className="flex gap-2 flex-1 justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                    {t.cancel}
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                    {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                    {t.save}
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
              <AlertDialogTitle>{t.deleteTransactionQ}</AlertDialogTitle>
              <AlertDialogDescription>
                {tf(t.deleteTransactionConfirm, { description: transaction.description })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
