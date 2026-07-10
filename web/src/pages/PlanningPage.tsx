import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Loader2, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { budgetPlansApi, categoriesApi } from "../lib/api-client";
import type { Category, IncomeItem, BudgetPlan } from "../lib/api-client";

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

interface MonthOption {
  year: number;
  month: number;
  label: string;
}

interface PlanningPageProps {
  year: number;
  month: number;
  monthLabel: string;
  months: MonthOption[];
  onSelectMonth: (year: number, month: number) => void;
  categories: Category[];
  incomeItems: IncomeItem[];
  incomeLoading: boolean;
  existingPlan: BudgetPlan | null;
  /** Saved-plan derived figure from the dashboard: planned − actual spend */
  safeToSpend: number;
  formatAmount: (value: number) => string;
  onAddIncome: (data: { source: string; amount: number; year: number; month: number }) => Promise<void>;
  onUpdateIncome: (id: string, data: { source?: string; amount?: number }) => Promise<void>;
  onRemoveIncome: (id: string) => Promise<void>;
  onCategoryCreated: (cat: Category) => void;
  onCategoryDeleted: (id: string) => void;
  onPlanSaved: (plan: BudgetPlan) => void;
  onPlanDeleted: () => Promise<void>;
  translations: Record<string, string>;
}

function buildRows(
  categories: Category[],
  existingPlan: BudgetPlan | null,
  year: number,
  month: number,
): PlanRow[] {
  // Only basic categories + one-month categories that belong to this month
  const visible = categories.filter(
    (cat) =>
      cat.year === null ||
      cat.year === undefined ||
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

function isDirty(rows: PlanRow[], plan: BudgetPlan | null): boolean {
  const included = rows
    .filter((r) => r.included)
    .map((r) => ({ id: r.categoryId, budget: parseFloat(r.budget) || 0 }));
  const saved = plan?.items ?? [];

  if (included.length !== saved.length) {
    return true;
  }

  const savedMap = new Map(saved.map((i) => [i.categoryId, i.budget]));

  return included.some((r) => !savedMap.has(r.id) || savedMap.get(r.id) !== r.budget);
}

export function PlanningPage({
  year,
  month,
  monthLabel,
  months,
  onSelectMonth,
  categories,
  incomeItems,
  incomeLoading,
  existingPlan,
  safeToSpend,
  formatAmount,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  onCategoryCreated,
  onCategoryDeleted,
  onPlanSaved,
  onPlanDeleted,
  translations: t,
}: PlanningPageProps) {
  const [rows, setRows] = useState<PlanRow[]>(() => buildRows(categories, existingPlan, year, month));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New one-month category form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏷️');
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [newBudget, setNewBudget] = useState('');
  const [adding, setAdding] = useState(false);

  // Inline income "add" form
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [addingIncome, setAddingIncome] = useState(false);
  const [incomeLoadingId, setIncomeLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setRows((prevRows) => {
      const rebuilt = buildRows(categories, existingPlan, year, month);

      return rebuilt.map((row) => {
        const prev = prevRows.find((r) => r.categoryId === row.categoryId);
        if (!prev) {
          return row;
        }

        // Preserve the user's in-progress budget edit for rows not yet in the saved plan
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
      prev.map((row) => (row.categoryId === categoryId ? { ...row, budget: value } : row)),
    );
  };

  const handleDeleteOneMonth = async (categoryId: string) => {
    try {
      await categoriesApi.delete(categoryId);
      setRows((prev) => prev.filter((r) => r.categoryId !== categoryId));
      onCategoryDeleted(categoryId);
    } catch {
      toast.error(t.deleteCategoryFailed);
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
        excludeFromDashboard: false,
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
      toast.error(t.createCategoryFailed);
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
      onPlanSaved(saved);
    } catch {
      toast.error(t.planSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await onPlanDeleted();
    } finally {
      setDeleting(false);
    }
  };

  const handleAddIncome = async () => {
    if (!incomeSource.trim()) {
      return;
    }

    setAddingIncome(true);

    try {
      await onAddIncome({ source: incomeSource.trim(), amount: Number(incomeAmount) || 0, year, month });
      setIncomeSource('');
      setIncomeAmount('');
    } finally {
      setAddingIncome(false);
    }
  };

  const handleUpdateIncomeField = async (id: string, data: { source?: string; amount?: number }) => {
    setIncomeLoadingId(id);

    try {
      await onUpdateIncome(id, data);
    } finally {
      setIncomeLoadingId(null);
    }
  };

  const handleRemoveIncome = async (id: string) => {
    setIncomeLoadingId(id);

    try {
      await onRemoveIncome(id);
    } finally {
      setIncomeLoadingId(null);
    }
  };

  // Live derivations
  const totalIncome = incomeItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const allocated = rows
    .filter((r) => r.included)
    .reduce((sum, r) => sum + (parseFloat(r.budget) || 0), 0);
  const leftToAllocate = totalIncome - allocated;
  const isOverAllocated = leftToAllocate < 0;
  const allocPct = totalIncome > 0 ? Math.min(allocated / totalIncome, 1) * 100 : 0;
  const includedCount = rows.filter((r) => r.included).length;
  const dirty = isDirty(rows, existingPlan);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Month selector */}
      <div className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar sm:flex-wrap sm:gap-2">
        {months.map((mp) => {
          const selected = mp.year === year && mp.month === month;
          return (
            <Button
              key={`${mp.year}-${mp.month}`}
              variant={selected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectMonth(mp.year, mp.month)}
              className="shrink-0 text-xs sm:text-sm"
            >
              {mp.label}
            </Button>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-4 sm:p-6 shadow-lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="opacity-75 text-xs sm:text-sm">{t.incomesTotal}</p>
            <p className="text-lg sm:text-2xl font-bold">{formatAmount(totalIncome)}</p>
          </div>
          <div>
            <p className="opacity-75 text-xs sm:text-sm">{t.allocated}</p>
            <p className="text-lg sm:text-2xl font-bold">{formatAmount(allocated)}</p>
          </div>
          <div>
            <p className="opacity-75 text-xs sm:text-sm">
              {isOverAllocated ? t.overAllocatedBy : t.leftToAllocate}
            </p>
            <p className={`text-lg sm:text-2xl font-bold ${isOverAllocated ? 'text-red-300' : ''}`}>
              {formatAmount(Math.abs(leftToAllocate))}
            </p>
          </div>
          <div>
            <p className="opacity-75 text-xs sm:text-sm">{t.safeToSpend}</p>
            <p className={`text-lg sm:text-2xl font-bold ${safeToSpend < 0 ? 'text-red-300' : ''}`}>
              {formatAmount(safeToSpend)}
            </p>
          </div>
        </div>

        {/* Allocation bar */}
        {totalIncome > 0 && (
          <div className="mt-4">
            <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-primary-foreground/20">
              <div
                className={`h-full rounded-full transition-all ${isOverAllocated ? 'bg-red-400' : 'bg-green-500'}`}
                style={{ width: `${allocPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 sm:gap-6">
        {/* Income column */}
        <div className="border border-border rounded-xl bg-card overflow-hidden self-start">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
            <span className="font-medium text-foreground">{t.incomes}</span>
            {incomeLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="divide-y divide-border">
            {incomeItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <input
                  type="text"
                  defaultValue={item.source}
                  onBlur={(e) => {
                    if (e.target.value !== item.source) {
                      handleUpdateIncomeField(item.id, { source: e.target.value });
                    }
                  }}
                  disabled={incomeLoadingId === item.id}
                  className="flex-1 min-w-0 border border-border rounded px-2 py-1 text-sm bg-background text-foreground disabled:opacity-40"
                />
                <input
                  type="number"
                  min={0}
                  defaultValue={item.amount || ''}
                  onBlur={(e) => {
                    if (Number(e.target.value) !== item.amount) {
                      handleUpdateIncomeField(item.id, { amount: Number(e.target.value) || 0 });
                    }
                  }}
                  disabled={incomeLoadingId === item.id}
                  className="w-28 border border-border rounded px-2 py-1 text-sm bg-background text-foreground text-right disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveIncome(item.id)}
                  disabled={incomeLoadingId === item.id}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  aria-label={t.delete}
                >
                  {incomeLoadingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}

            {incomeItems.length === 0 && !incomeLoading && (
              <div className="px-5 py-4 text-sm text-muted-foreground">{t.noIncomeYet}</div>
            )}
          </div>

          {/* Add income row */}
          <div className="border-t border-border px-5 py-3 bg-muted/10">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
                placeholder={t.incomeSource}
                disabled={addingIncome}
                className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 text-sm bg-background text-foreground"
              />
              <input
                type="number"
                min={0}
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder={t.incomeAmount}
                disabled={addingIncome}
                className="w-28 border border-border rounded px-2 py-1.5 text-sm bg-background text-foreground text-right"
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={handleAddIncome}
                disabled={addingIncome || !incomeSource.trim()}
                className="flex-shrink-0"
                aria-label={t.addIncome}
              >
                {addingIncome ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Income total */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">{t.incomesTotal}</span>
            <span className="font-semibold text-foreground">{formatAmount(totalIncome)}</span>
          </div>
        </div>

        {/* Allocate column */}
        <div className="border border-border rounded-xl bg-card overflow-hidden self-start">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{t.allocateSection}</span>
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
                  <span className="hidden sm:inline">{t.deletePlan}</span>
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t.savePlan}
                {dirty && !saving && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80" aria-hidden />}
              </Button>
            </div>
          </div>

          {/* Category rows */}
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.categoryId}
                className={`flex items-center gap-3 sm:gap-4 px-5 py-3 transition-colors ${
                  row.included ? 'bg-card' : 'bg-muted/20 opacity-60'
                }`}
              >
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

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${row.color}30`, border: `1px solid ${row.color}40` }}
                >
                  <span className="text-base">{row.icon}</span>
                </div>

                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-sm text-foreground truncate">
                    {(t[row.name] as string) || row.name}
                  </span>
                  {row.isOneMonth && (
                    <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 flex-shrink-0">
                      {t.oneMonthBadge}
                    </span>
                  )}
                </div>

                <input
                  type="number"
                  min={0}
                  value={row.budget}
                  onChange={(e) => updateBudget(row.categoryId, e.target.value)}
                  disabled={!row.included}
                  placeholder={row.defaultBudget > 0 ? String(row.defaultBudget) : '0'}
                  className="w-28 border border-border rounded px-2 py-1 text-sm bg-background text-foreground text-right disabled:opacity-40 disabled:cursor-not-allowed"
                />

                {row.isOneMonth && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOneMonth(row.categoryId)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    aria-label={t.delete}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add one-month category */}
          {showAddForm ? (
            <div className="border-t border-border px-5 py-4 bg-muted/10 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newIcon}
                  onChange={(e) => setNewIcon(Array.from(e.target.value).slice(-1).join('') || '🏷️')}
                  className="w-12 text-center text-xl border border-border rounded px-1 py-1 bg-background"
                  placeholder="🏷️"
                />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.categoryName}
                  className="flex-1 min-w-0 border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground"
                />
                <input
                  type="number"
                  min={0}
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  placeholder={t.budgetAmount}
                  className="w-24 border border-border rounded px-2 py-1.5 text-sm bg-background text-foreground text-right"
                />
              </div>
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
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  {t.cancel}
                </Button>
                <Button size="sm" onClick={handleAddCustom} disabled={adding || !newName.trim()} className="gap-1.5">
                  {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t.add}
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
                {t.addOneMonthCategory}
              </button>
            </div>
          )}

          {/* Allocated total */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">{t.allocated}</span>
            <span className="font-semibold text-foreground">{formatAmount(allocated)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
