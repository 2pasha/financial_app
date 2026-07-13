import { useState, useEffect, useCallback } from "react";
import { CategoryCard } from "./components/CategoryCard";
import { AddCategoryDialog } from "./components/AddCategoryDialog";
import { EditCategoryDialog } from "./components/EditCategoryDialog";
import { PlanningPage } from "./pages/PlanningPage";
import { SiteHeader } from "./components/SiteHeader";
import { useAppSettings } from "./hooks/useAppSettings";
import { Button } from "./components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./components/ui/alert-dialog";
import { Plus, Loader2 } from "lucide-react";
import { type Language } from "./lib/translations";
import { toast } from "sonner";
import ExpensesPage from "./pages/ExpensesPage";
import { CategoryTransactionsModal } from "./components/CategoryTransactionsModal";
import { categoriesApi, incomeApi, budgetPlansApi } from "./lib/api-client";
import type { Category, IncomeItem, BudgetPlan } from "./lib/api-client";

type MonthPeriod = { kind: 'month'; year: number; month: number };
type Period = MonthPeriod;

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getPeriodRange(period: Period): { from: string; to: string } {
  const date = new Date(period.year, period.month - 1, 1);

  return {
    from: getStartOfMonth(date).toISOString(),
    to: getEndOfMonth(date).toISOString(),
  };
}

function sortByBudgetUsage<T extends { spent: number; budget: number }>(cats: T[]): T[] {
  const ratio = (c: T) => (c.budget > 0 ? c.spent / c.budget : -Infinity);
  return [...cats].sort((a, b) => ratio(b) - ratio(a)); // budget===0 (−Infinity) sinks to the end
}

function getLastNMonths(n: number): MonthPeriod[] {
  const now = new Date();
  const months: MonthPeriod[] = [];

  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ kind: 'month', year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  return months;
}

// Planning allows a few months ahead as well as past months.
// Ordered chronologically descending: future → current → past.
function getPlanningMonths(future = 3, past = 5): MonthPeriod[] {
  const now = new Date();
  const months: MonthPeriod[] = [];

  for (let i = future; i >= -past; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ kind: 'month', year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  return months;
}

function formatMonthLabel(period: MonthPeriod, language: Language): string {
  const date = new Date(period.year, period.month - 1, 1);
  const locale = language === 'uk' ? 'uk-UA' : 'en-US';

  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

function periodEquals(a: Period, b: Period): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  if (a.kind === 'month' && b.kind === 'month') {
    return a.year === b.year && a.month === b.month;
  }

  return true;
}

export default function App() {
  const { language, toggleLanguage, isDarkMode, toggleTheme, t } = useAppSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currency') || '₴';
    }

    return 'USD';
  });

  const now = new Date();
  const currentMonthPeriod: MonthPeriod = { kind: 'month', year: now.getFullYear(), month: now.getMonth() + 1 };

  const [period, setPeriod] = useState<Period>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('period');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { kind?: string; year?: number; month?: number };
          // Guard against periods persisted before the custom range was removed.
          if (parsed.kind === 'month' && typeof parsed.year === 'number' && typeof parsed.month === 'number') {
            return { kind: 'month', year: parsed.year, month: parsed.month };
          }
        } catch {}
      }
    }

    return currentMonthPeriod;
  });

  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Budget plan for the currently viewed month (drives dashboard display)
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);

  const [view, setView] = useState<'dashboard' | 'expenses' | 'plan'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('view') as 'dashboard' | 'expenses' | 'plan') || 'dashboard';
    }

    return 'dashboard';
  });


  const mergedCategories = categories.map((cat) => {
    if (!budgetPlan) {
      return cat;
    }

    const planItem = budgetPlan.items.find((item) => item.categoryId === cat.id);

    return planItem ? { ...cat, budget: planItem.budget } : cat;
  });

  // Split categories when a plan exists for the viewed month
  const showSplit = budgetPlan !== null;

  const plannedCategoryIds = budgetPlan
    ? new Set(budgetPlan.items.map((i) => i.categoryId))
    : null;

  // A one-month category for the current viewed month is implicitly "planned"
  // even before the user hits Save for the first time.
  const isImplicitlyPlanned = (cat: { year: number | null; month: number | null }) =>
    cat.year === period.year && cat.month === period.month;

  const plannedCategories = plannedCategoryIds
    ? mergedCategories.filter((c) => plannedCategoryIds.has(c.id) || isImplicitlyPlanned(c))
    : mergedCategories;

  const unplannedWithSpend = plannedCategoryIds
    ? mergedCategories.filter((c) => !plannedCategoryIds.has(c.id) && !isImplicitlyPlanned(c))
    : [];

  const totalIncome = incomeItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const plannedSpent = plannedCategories.reduce((sum, cat) => sum + cat.budget, 0);
  const unassignedMoney = totalIncome - plannedSpent;
  const dashboardCategories = mergedCategories.filter((cat) => !cat.excludeFromDashboard);
  const actualSpent = Math.abs(dashboardCategories.reduce((sum, cat) => sum + cat.net, 0));

  // Hero "Safe to spend" + pacing bar derivations
  const safeToSpend = plannedSpent - actualSpent;
  const isOverBudget = safeToSpend < 0;
  const overageAmount = Math.abs(safeToSpend);
  const fillPct = plannedSpent > 0 ? Math.min(actualSpent / plannedSpent, 1) * 100 : 0;

  const heroNow = new Date();
  const isCurrentMonth =
    period.year === heroNow.getFullYear() &&
    period.month === heroNow.getMonth() + 1;
  const daysInMonth = new Date(heroNow.getFullYear(), heroNow.getMonth() + 1, 0).getDate();
  const markerPct = isCurrentMonth ? (heroNow.getDate() / daysInMonth) * 100 : null;

  const paceColor =
    markerPct === null
      ? isOverBudget
        ? 'bg-red-400'
        : 'bg-green-500'
      : fillPct <= markerPct
        ? 'bg-green-500'
        : fillPct <= markerPct + 10
          ? 'bg-amber-500'
          : 'bg-red-400';

  const dateRange = getPeriodRange(period);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);

    try {
      const data = await categoriesApi.getAll({
        ...dateRange,
        calendarYear: period.year,
        calendarMonth: period.month,
      });
      setCategories(data);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, [dateRange.from, dateRange.to, period.year, period.month]);

  const fetchBudgetPlan = useCallback(async () => {
    try {
      const plan = await budgetPlansApi.getForMonth(period.year, period.month);
      setBudgetPlan(plan);
    } catch {
      setBudgetPlan(null);
    }
  }, [period.year, period.month]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchBudgetPlan();
  }, [fetchBudgetPlan]);

  useEffect(() => {
    setIncomeLoading(true);
    incomeApi.getAll({ year: period.year, month: period.month })
      .then(setIncomeItems)
      .catch(() => toast.error('Failed to load income'))
      .finally(() => setIncomeLoading(false));
  }, [period.year, period.month]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('period', JSON.stringify(period));
  }, [period]);

  const formatAmount = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value);
    } catch {
      return `${(value ?? 0).toLocaleString()} ${currency}`;
    }
  };

  const handleAddIncome = async (data: { source: string; amount: number; year: number; month: number }) => {
    try {
      const created = await incomeApi.create(data);
      setIncomeItems((prev) => [...prev, created]);
    } catch {
      toast.error('Failed to add income');
      throw new Error('Failed to add income');
    }
  };

  const handleUpdateIncome = async (id: string, data: { source?: string; amount?: number }) => {
    try {
      const updated = await incomeApi.update(id, data);
      setIncomeItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch {
      toast.error('Failed to update income');
      throw new Error('Failed to update income');
    }
  };

  const handleRemoveIncome = async (id: string) => {
    try {
      await incomeApi.delete(id);
      setIncomeItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      toast.error('Failed to delete income');
      throw new Error('Failed to delete income');
    }
  };

  const handleAddCategory = async (newCategory: Omit<Category, "id" | "spent" | "net">) => {
    try {
      const created = await categoriesApi.create(newCategory);
      setCategories((prev) => [...prev, created]);
      toast.success('Category added');
    } catch {
      toast.error('Failed to add category');
    }
  };

  const handleCategoryClick = (id: string) => {
    const category = categories.find((cat) => cat.id === id);
    if (category) setSelectedCategory(category);
  };

  const handleEditCategory = (id: string) => {
    // Use mergedCategories so the dialog is pre-filled with the plan budget (what the
    // user sees on the card), not the underlying Category.budget default.
    const category = mergedCategories.find(cat => cat.id === id);
    if (category) {
      setCategoryToEdit(category);
      setEditDialogOpen(true);
    }
  };

  const handleSaveCategory = async (updatedCategory: Omit<Category, "spent" | "net">) => {
    try {
      const saved = await categoriesApi.update(updatedCategory.id, {
        name: updatedCategory.name,
        icon: updatedCategory.icon,
        color: updatedCategory.color,
        budget: updatedCategory.budget,
        excludeFromDashboard: updatedCategory.excludeFromDashboard,
      });
      setCategories((prev) => prev.map(cat => cat.id === saved.id ? { ...cat, ...saved } : cat));

      // When a budget plan is active and this category has a plan line item, sync the
      // plan budget too so the card immediately reflects the new amount.
      if (budgetPlan) {
        const inPlan = budgetPlan.items.some((i) => i.categoryId === updatedCategory.id);
        if (inPlan) {
          const updatedItems = budgetPlan.items.map((item) => ({
            categoryId: item.categoryId,
            budget: item.categoryId === updatedCategory.id ? updatedCategory.budget : item.budget,
          }));
          const updatedPlan = await budgetPlansApi.upsert({
            year: budgetPlan.year,
            month: budgetPlan.month,
            items: updatedItems,
          });
          setBudgetPlan(updatedPlan);
        }
      }

      toast.success('Category updated');
    } catch {
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) {
      return;
    }

    try {
      await categoriesApi.delete(categoryToDelete);
      setCategories((prev) => prev.filter(cat => cat.id !== categoryToDelete));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
  };

  const planYear = period.year;
  const planMonth = period.month;
  const openPlanView = () => {
    setView('plan');
  };

  const handlePlanSaved = (plan: BudgetPlan) => {
    setBudgetPlan(plan);
    toast.success(t.planSaved);
  };

  const handlePlanDeleted = async (): Promise<void> => {
    if (!budgetPlan) {
      return;
    }

    try {
      await budgetPlansApi.delete(budgetPlan.id);
      setBudgetPlan(null);
      toast.success(t.planDeleted);
    } catch {
      toast.error('Failed to delete budget plan');
    }
  };

  const renderCategoryCard = (category: Category, showNet = false) => (
    <CategoryCard
      key={category.id}
      id={category.id}
      name={t[category.name as keyof typeof t] as string || category.name}
      spent={category.spent}
      net={category.net}
      budget={category.budget}
      icon={category.icon}
      color={category.color}
      showNet={showNet}
      onEdit={category.isTrip ? undefined : handleEditCategory}
      onDelete={category.isTrip ? undefined : handleDeleteCategory}
      onClick={handleCategoryClick}
      translations={t}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        t={t}
        language={language}
        isDarkMode={isDarkMode}
        onToggleLanguage={toggleLanguage}
        onToggleTheme={toggleTheme}
        activeView={view}
        onViewChange={(v) => (v === 'plan' ? openPlanView() : setView(v))}
      />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8 pb-28">
        {view === 'expenses' ? (
          <ExpensesPage />
        ) : view === 'plan' ? (
          <PlanningPage
            year={planYear}
            month={planMonth}
            monthLabel={formatMonthLabel({ kind: 'month', year: planYear, month: planMonth }, language)}
            months={getPlanningMonths().map((mp) => ({
              year: mp.year,
              month: mp.month,
              label: formatMonthLabel(mp, language),
            }))}
            onSelectMonth={(y, m) => handlePeriodChange({ kind: 'month', year: y, month: m })}
            categories={categories}
            incomeItems={incomeItems}
            incomeLoading={incomeLoading}
            existingPlan={budgetPlan}
            safeToSpend={safeToSpend}
            formatAmount={formatAmount}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onRemoveIncome={handleRemoveIncome}
            onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
            onCategoryDeleted={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
            onCategoryUpdated={(cat) => setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...cat } : c)))}
            onPlanSaved={handlePlanSaved}
            onPlanDeleted={handlePlanDeleted}
            translations={t as unknown as Record<string, string>}
          />
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-4 sm:p-8 mb-4 sm:mb-6 shadow-lg">
              <p className="opacity-90 mb-1 text-sm sm:text-base">{isOverBudget ? t.overBudgetBy : t.safeToSpend}</p>
              <h2 className={`text-3xl sm:text-5xl mb-3 sm:mb-4 font-bold ${isOverBudget ? 'text-red-300' : ''}`}>
                {formatAmount(isOverBudget ? overageAmount : safeToSpend)}
              </h2>

              {plannedSpent > 0 && (
                <div className="mb-4 sm:mb-6">
                  {actualSpent > plannedSpent && (
                    <p className="text-red-300 text-xs sm:text-sm font-medium mb-1">
                      +{formatAmount(actualSpent - plannedSpent)} {t.overLabel}
                    </p>
                  )}
                  <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-primary-foreground/20">
                    <div
                      className={`h-full rounded-full transition-all ${paceColor}`}
                      style={{ width: `${fillPct}%` }}
                    />
                    {markerPct !== null && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-primary-foreground"
                        style={{ left: `${markerPct}%` }}
                      />
                    )}
                  </div>
                  {markerPct !== null && (
                    <div className="relative h-4 mt-0.5">
                      <span
                        className="absolute text-[10px] opacity-75 -translate-x-1/2"
                        style={{ left: `${markerPct}%` }}
                      >
                        {t.today}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-sm opacity-90">
                {totalIncome > 0 && (
                  <div>
                    <p className="opacity-75 text-xs sm:text-sm">{t.incomesTotal}</p>
                    <p className="text-sm sm:text-base font-medium">{formatAmount(totalIncome)}</p>
                  </div>
                )}
                <div>
                  <p className="opacity-75 text-xs sm:text-sm">{t.plannedSpent}</p>
                  <p className="text-sm sm:text-base font-medium">{formatAmount(plannedSpent)}</p>
                </div>
                {totalIncome > 0 && (
                  <div>
                    <p className="opacity-75 text-xs sm:text-sm">{t.unassignedMoney}</p>
                    <p className="text-sm sm:text-base font-medium">{formatAmount(unassignedMoney)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Period Selector */}
            <div className="mb-4">
              <div className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar sm:flex-wrap sm:gap-2">
                {getLastNMonths(6).map((mp) => (
                  <Button
                    key={`${mp.year}-${mp.month}`}
                    variant={periodEquals(period, mp) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePeriodChange(mp)}
                    className="shrink-0 text-xs sm:text-sm"
                  >
                    {formatMonthLabel(mp, language)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Categories Section Header */}
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-foreground text-base sm:text-xl">{t.categories}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={openPlanView}
                className="shrink-0 text-xs sm:text-sm"
              >
                {t.planBudget}
              </Button>
            </div>

            {/* Categories Grid */}
            {categoriesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {categories.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">{t.noCategoriesYet}</p>
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t.addFirstCategory}
                    </Button>
                  </div>
                ) : showSplit ? (
                  <>
                    {/* Planned section */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t.plannedCategories}
                      </span>
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {plannedCategories.length}
                      </span>
                    </div>
                    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
                      {sortByBudgetUsage(plannedCategories).map((c) => renderCategoryCard(c))}
                    </div>

                    {/* Unplanned spending section */}
                    {unplannedWithSpend.length > 0 && (
                      <>
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-background px-3 text-sm text-muted-foreground">
                              {t.unplannedSpending}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {unplannedWithSpend.map((c) => renderCategoryCard(c, true))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
                    {sortByBudgetUsage(mergedCategories).map((c) => renderCategoryCard(c))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Floating Add Button */}
      <Button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-6 right-4 sm:right-6 rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-lg hover:shadow-xl transition-shadow z-30"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        size="icon"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>

      <AddCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddCategory}
        translations={t}
      />

      <EditCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveCategory}
        category={categoryToEdit}
        translations={t}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteCategory}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteCategoryConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCategory && (
        <CategoryTransactionsModal
          open={!!selectedCategory}
          onOpenChange={(open) => { if (!open) setSelectedCategory(null); }}
          categoryId={selectedCategory.id}
          categoryName={t[selectedCategory.name as keyof typeof t] as string || selectedCategory.name}
          categoryIcon={selectedCategory.icon}
          categoryColor={selectedCategory.color}
          dateRange={dateRange}
          tripId={selectedCategory.isTrip ? selectedCategory.id : undefined}
        />
      )}
    </div>
  );
}
