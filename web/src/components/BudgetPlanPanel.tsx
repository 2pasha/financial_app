import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { budgetPlansApi, categoriesApi } from "../lib/api-client";
import type { Category, BudgetPlan } from "../lib/api-client";

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
];

interface PlanRow {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  defaultBudget: number;
  budget: string;
  included: boolean;
  isOneMonth: boolean;
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
  onCategoryCreated: (cat: Category) => void;
  onCategoryDeleted: (id: string) => void;
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

function buildRows(
  categories: Category[],
  existingPlan: BudgetPlan | null,
  year: number,
  month: number,
): PlanRow[] {
  // Only show basic categories + one-month categories that belong to this panel's month
  const visible = categories.filter(
    (cat) =>
      (cat.year === null || cat.year === undefined) ||
      (cat.year === year && cat.month === month),
  );

  return visible.map((cat) => {
    const planItem = existingPlan?.items?.find((item) => item.categoryId === cat.id);
    const isOneMonth = cat.year !== null && cat.year !== undefined;

    return {
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      defaultBudget: cat.budget,
      budget: planItem ? String(planItem.budget) : String(cat.budget || ''),
      included: isOneMonth ? true : !!planItem,
      isOneMonth,
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
  onCategoryCreated,
  onCategoryDeleted,
  translations: t,
}: BudgetPlanPanelProps) {
  const [rows, setRows] = useState<PlanRow[]>(() => buildRows(categories, existingPlan, year, month));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New custom category form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏷️');
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [newBudget, setNewBudget] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setRows((prevRows) => {
      const rebuilt = buildRows(categories, existingPlan, year, month);

      return rebuilt.map((row) => {
        const prev = prevRows.find((r) => r.categoryId === row.categoryId);
        if (!prev) {
          return row;
        }

        // If this row has no saved plan item yet, keep the user's current budget edit
        const inPlan = existingPlan?.items?.some((i) => i.categoryId === row.categoryId);
        if (!inPlan) {
          return { ...row, budget: prev.budget, included: row.isOneMonth ? true : prev.included };
        }

        return row;
      });
    });
  }, [categories, existingPlan, year, month]);

  const toggleIncluded = (categoryId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.categoryId === categoryId && !row.isOneMonth
          ? { ...row, included: !row.included }
          : row,
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

  const handleDeleteOneMonth = async (categoryId: string) => {
    try {
      await categoriesApi.delete(categoryId);
      setRows((prev) => prev.filter((r) => r.categoryId !== categoryId));
      onCategoryDeleted(categoryId);
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const handleAddCustom = async () => {
    if (!newName.trim()) {
      return;
    }

    setAdding(true);

    try {
      const created = await categoriesApi.create({
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
        budget: 0,
        year,
        month,
      });

      onCategoryCreated(created);

      setRows((prev) => [
        ...prev,
        {
          categoryId: created.id,
          name: created.name,
          icon: created.icon,
          color: created.color,
          defaultBudget: 0,
          budget: newBudget || '0',
          included: true,
          isOneMonth: true,
        },
      ]);

      setNewName('');
      setNewIcon('🏷️');
      setNewColor(COLOR_OPTIONS[0]);
      setNewBudget('');
      setShowAddForm(false);
    } catch {
      toast.error('Failed to create category');
    } finally {
      setAdding(false);
    }
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
      {/* Header */}
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
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
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

      {/* Category rows */}
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.categoryId}
            className={`flex items-center gap-4 px-5 py-3 transition-colors ${
              row.included ? 'bg-card' : 'bg-muted/20 opacity-60'
            }`}
          >
            {/* Checkbox / lock indicator */}
            {row.isOneMonth ? (
              <div className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => toggleIncluded(row.categoryId)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  row.included ? 'border-primary bg-primary' : 'border-border bg-transparent'
                }`}
                aria-label={row.included ? 'Remove from plan' : 'Add to plan'}
              >
                {row.included && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}

            {/* Icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${row.color}30`, border: `1px solid ${row.color}40` }}
            >
              <span className="text-base">{row.icon}</span>
            </div>

            {/* Name + one-month badge */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-sm text-foreground truncate">{row.name}</span>
              {row.isOneMonth && (
                <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 flex-shrink-0">
                  this month
                </span>
              )}
            </div>

            {/* Budget input */}
            <input
              type="number"
              min={0}
              value={row.budget}
              onChange={(e) => updateBudget(row.categoryId, e.target.value)}
              disabled={!row.included}
              placeholder={row.defaultBudget > 0 ? String(row.defaultBudget) : '0'}
              className="w-28 border border-border rounded px-2 py-1 text-sm bg-background text-foreground text-right disabled:opacity-40 disabled:cursor-not-allowed"
            />

            {/* Delete button for one-month categories */}
            {row.isOneMonth && (
              <button
                type="button"
                onClick={() => handleDeleteOneMonth(row.categoryId)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                aria-label="Delete category"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add custom category form */}
      {showAddForm ? (
        <div className="border-t border-border px-5 py-4 bg-muted/10 space-y-3">
          <div className="flex items-center gap-3">
            {/* Icon input */}
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value.slice(-2) || '🏷️')}
              className="w-12 text-center text-xl border border-border rounded px-1 py-1 bg-background"
              placeholder="🏷️"
            />
            {/* Name input */}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="flex-1 border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground"
            />
            {/* Budget input */}
            <input
              type="number"
              min={0}
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="Budget"
              className="w-24 border border-border rounded px-2 py-1.5 text-sm bg-background text-foreground text-right"
            />
          </div>
          {/* Color picker */}
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-foreground/30' : ''}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              {t.cancel}
            </Button>
            <Button size="sm" onClick={handleAddCustom} disabled={adding || !newName.trim()} className="gap-1.5">
              {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add custom category for this month
          </button>
        </div>
      )}
    </div>
  );
}
