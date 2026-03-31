import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { budgetPlansApi } from "../lib/api-client";
import type { Category, BudgetPlan } from "../lib/api-client";

interface PlanRow {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  defaultBudget: number;
  budget: string;
  included: boolean;
}

interface BudgetPlanPanelProps {
  year: number;
  month: number;
  monthLabel: string;
  categories: Category[];
  existingPlan: BudgetPlan | null;
  onSaved: (plan: BudgetPlan) => void;
  onDeleted: () => Promise<void>;
  onClose: () => void;
  translations: {
    savePlan: string;
    deletePlan: string;
    budgetPlan: string;
    noBudgetPlan: string;
    defaultBudget: string;
    includedInPlan: string;
    cancel: string;
    planSaveFailed: string;
    budgetAmount: string;
  };
}

function buildRows(categories: Category[], existingPlan: BudgetPlan | null): PlanRow[] {
  return categories.map((cat) => {
    const planItem = existingPlan?.items?.find((item) => item.categoryId === cat.id);

    return {
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      defaultBudget: cat.budget,
      budget: planItem ? String(planItem.budget) : String(cat.budget || ''),
      included: !!planItem,
    };
  });
}

export function BudgetPlanPanel({
  year,
  month,
  monthLabel,
  categories,
  existingPlan,
  onSaved,
  onDeleted,
  onClose,
  translations: t,
}: BudgetPlanPanelProps) {
  const [rows, setRows] = useState<PlanRow[]>(() => buildRows(categories, existingPlan));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setRows(buildRows(categories, existingPlan));
  }, [categories, existingPlan]);

  const toggleIncluded = (categoryId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.categoryId === categoryId ? { ...row, included: !row.included } : row,
      ),
    );
  };

  const updateBudget = (categoryId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.categoryId === categoryId ? { ...row, budget: value } : row,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const items = rows
        .filter((row) => row.included)
        .map((row) => ({
          categoryId: row.categoryId,
          budget: parseFloat(row.budget) || 0,
        }));

      const saved = await budgetPlansApi.upsert({ year, month, items });
      onSaved(saved);
    } catch {
      toast.error(t.planSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  const includedCount = rows.filter((r) => r.included).length;

  return (
    <div className="mb-6 border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{t.budgetPlan}</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{monthLabel}</span>
          {includedCount > 0 && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {includedCount} {t.includedInPlan}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {existingPlan && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive gap-1.5"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {t.deletePlan}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t.savePlan}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">{t.noBudgetPlan}</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div
              key={row.categoryId}
              className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                row.included ? 'bg-card' : 'bg-muted/20 opacity-60'
              }`}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggleIncluded(row.categoryId)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  row.included
                    ? 'border-primary bg-primary'
                    : 'border-border bg-transparent'
                }`}
                aria-label={row.included ? 'Remove from plan' : 'Add to plan'}
              >
                {row.included && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Category info */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${row.color}30`, border: `1px solid ${row.color}40` }}
              >
                <span className="text-base">{row.icon}</span>
              </div>
              <span className="flex-1 text-sm text-foreground">{row.name}</span>

              {/* Budget input */}
              <div className="flex items-center gap-2">
                {row.defaultBudget > 0 && !row.included && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {t.defaultBudget}: {row.defaultBudget.toLocaleString()}
                  </span>
                )}
                <input
                  type="number"
                  min={0}
                  value={row.budget}
                  onChange={(e) => updateBudget(row.categoryId, e.target.value)}
                  disabled={!row.included}
                  placeholder={row.defaultBudget > 0 ? String(row.defaultBudget) : '0'}
                  className="w-28 border border-border rounded px-2 py-1 text-sm bg-background text-foreground text-right disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
