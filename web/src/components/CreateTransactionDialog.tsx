import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { transactionsApi, categoriesApi } from "../lib/api-client";
import type { Transaction, Category } from "../lib/api-client";
import { useAppSettings } from "../hooks/useAppSettings";
import { track } from "../lib/posthog";
import { bucketDays } from "../lib/analytics-events";

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (tx: Transaction) => void;
}

function nowLocalISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function monthKey(isoDate: string): string {
  const d = new Date(isoDate);

  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateTransactionDialogProps) {
  const { t } = useAppSettings();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(nowLocalISO());
  const [categoryId, setCategoryId] = useState<string>("none");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const lastFetchedMonthKey = useRef<string>('');

  useEffect(() => {
    if (!open) {
      return;
    }

    const key = monthKey(date);
    if (key === lastFetchedMonthKey.current) {
      return;
    }

    lastFetchedMonthKey.current = key;
    setCategoriesLoading(true);
    const d = new Date(date);
    categoriesApi.getAll({
      from: d.toISOString(),
      calendarYear: d.getFullYear(),
      calendarMonth: d.getMonth() + 1,
    })
      .then(setCategories)
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, [open, date]);

  const handleDateChange = (value: string) => {
    setDate(value);
    // Reset category selection when switching to a different month
    const prevKey = lastFetchedMonthKey.current;
    if (value && monthKey(value) !== prevKey) {
      setCategoryId("none");
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDate(nowLocalISO());
    setCategoryId("none");
    setType("expense");
    lastFetchedMonthKey.current = '';
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount) {
      toast.error(t.descAmountRequired);

      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error(t.validPositiveAmount);

      return;
    }

    const amountMinorUnits = Math.round(parsedAmount * 100) * (type === "expense" ? -1 : 1);

    setIsSubmitting(true);
    try {
      const tx = await transactionsApi.create({
        description: description.trim(),
        amount: amountMinorUnits,
        time: new Date(date).toISOString(),
        categoryId: categoryId === "none" ? undefined : categoryId,
        currency: 980,
      });
      const daysBackdated = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
      track('transaction_created', {
        transaction_type: type,
        has_category: categoryId !== 'none',
        is_backdated: daysBackdated > 0,
        days_backdated_bucket: bucketDays(daysBackdated),
      });
      onCreate(tx);
      resetForm();
      onOpenChange(false);
      toast.success(t.transactionCreated);
    } catch {
      toast.error(t.createTransactionFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = description.trim().length > 0 && amount.length > 0 && parseFloat(amount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.newTransaction}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t.typeLabel}</Label>
            <div className="flex gap-2">
              <Button
                variant={type === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("expense")}
                className="flex-1"
              >
                {t.expenseType}
              </Button>
              <Button
                variant={type === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("income")}
                className="flex-1"
              >
                {t.incomeType}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-description">{t.descriptionLabel}</Label>
            <Input
              id="create-description"
              placeholder={t.txnDescPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-amount">{t.amountUah}</Label>
            <Input
              id="create-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-date">{t.dateTimeLabel}</Label>
            <Input
              id="create-date"
              type="datetime-local"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-category">{t.categoryOptional}</Label>
            {categoriesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.loadingCategories}
              </div>
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="create-category">
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
            <p className="text-muted-foreground text-xs">{t.txnCategoryHint}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isValid}>
            {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            {t.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
