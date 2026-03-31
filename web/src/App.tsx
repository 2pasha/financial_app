import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryCard } from "./components/CategoryCard";
import { AddCategoryDialog } from "./components/AddCategoryDialog";
import { EditCategoryDialog } from "./components/EditCategoryDialog";
import { BudgetPlanPanel } from "./components/BudgetPlanPanel";
import { Button } from "./components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./components/ui/alert-dialog";
import { Plus, Moon, Sun, Languages, CreditCard, Loader2, CalendarRange } from "lucide-react";
import { type Language, getTranslation } from "./lib/translations";
import { toast } from "sonner";
import { IncomeDialog } from "./components/IncomeDialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import ExpensesPage from "./pages/ExpensesPage";
import { CategoryTransactionsModal } from "./components/CategoryTransactionsModal";
import { categoriesApi, incomeApi, budgetPlansApi } from "./lib/api-client";
import type { Category, IncomeItem, BudgetPlan } from "./lib/api-client";

type MonthPeriod = { kind: 'month'; year: number; month: number };
type CustomPeriod = { kind: 'custom' };
type Period = MonthPeriod | CustomPeriod;

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getPeriodRange(period: Period, customFrom: string, customTo: string): { from: string; to: string } {
  if (period.kind === 'custom') {
    return { from: customFrom, to: customTo };
  }

  const date = new Date(period.year, period.month - 1, 1);

  return {
    from: getStartOfMonth(date).toISOString(),
    to: getEndOfMonth(date).toISOString(),
  };
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

function getPlanningMonths(): MonthPeriod[] {
  const now = new Date();
  const months: MonthPeriod[] = [];

  for (let i = -3; i <= 3; i++) {
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

function monthKey(mp: MonthPeriod): string {
  return `${mp.year}-${mp.month}`;
}

function monthFromKey(key: string): MonthPeriod {
  const [year, month] = key.split('-').map(Number);

  return { kind: 'month', year, month };
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
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');

      return (saved as Language) || 'en';
    }

    return 'en';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');

      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  });
  const t = getTranslation(language);
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currency') || 'UAH';
    }

    return 'USD';
  });

  const now = new Date();
  const currentMonthPeriod: MonthPeriod = { kind: 'month', year: now.getFullYear(), month: now.getMonth() + 1 };

  const [period, setPeriod] = useState<Period>(currentMonthPeriod);
  const [customFrom, setCustomFrom] = useState<string>(
    getStartOfMonth(now).toISOString().slice(0, 10),
  );
  const [customTo, setCustomTo] = useState<string>(
    now.toISOString().slice(0, 10),
  );

  // Planning is decoupled from the viewed period
  const [planningMonth, setPlanningMonth] = useState<MonthPeriod | null>(null);
  const [planningPlan, setPlanningPlan] = useState<BudgetPlan | null>(null);

  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Budget plan for the currently viewed month (drives dashboard display)
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);

  const [view, setView] = useState<'dashboard' | 'expenses'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('view') as 'dashboard' | 'expenses') || 'dashboard';
    }

    return 'dashboard';
  });

  const mergedCategories = categories.map((cat) => {
    if (period.kind !== 'month' || !budgetPlan) {
      return cat;
    }

    const planItem = budgetPlan.items.find((item) => item.categoryId === cat.id);

    return planItem ? { ...cat, budget: planItem.budget } : cat;
  });

  // Split categories when a plan exists for the viewed month
  const isMonthPeriod = period.kind === 'month';
  const showSplit = isMonthPeriod && budgetPlan !== null;

  const plannedCategoryIds = budgetPlan
    ? new Set(budgetPlan.items.map((i) => i.categoryId))
    : null;

  const plannedCategories = plannedCategoryIds
    ? mergedCategories.filter((c) => plannedCategoryIds.has(c.id))
    : mergedCategories;

  const unplannedWithSpend = plannedCategoryIds
    ? mergedCategories.filter((c) => !plannedCategoryIds.has(c.id) && c.spent > 0)
    : [];

  const totalBudget = mergedCategories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalIncome = incomeItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const totalSpent = mergedCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const effectiveBudget = totalIncome > 0 ? totalIncome : totalBudget;
  const remaining = effectiveBudget - totalSpent;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : null;

  const dateRange = getPeriodRange(period, customFrom, customTo);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);

    try {
      const data = await categoriesApi.getAll(dateRange);
      setCategories(data);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  const fetchBudgetPlan = useCallback(async () => {
    if (period.kind !== 'month') {
      setBudgetPlan(null);

      return;
    }

    try {
      const plan = await budgetPlansApi.getForMonth(period.year, period.month);
      setBudgetPlan(plan);
    } catch {
      setBudgetPlan(null);
    }
  }, [period.kind === 'month' ? period.year : 0, period.kind === 'month' ? period.month : 0, period.kind]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchBudgetPlan();
  }, [fetchBudgetPlan]);

  useEffect(() => {
    incomeApi.getAll()
      .then(setIncomeItems)
      .catch(() => toast.error('Failed to load income'))
      .finally(() => setIncomeLoading(false));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('view', view);
  }, [view]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'uk' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const formatAmount = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
    } catch {
      return `${value.toLocaleString()} ${currency}`;
    }
  };

  const handleAddIncome = async (data: { source: string; amount: number }) => {
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

  const handleAddCategory = async (newCategory: Omit<Category, "id" | "spent">) => {
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
    if (category) {
      setSelectedCategory(category);
    }
  };

  const handleEditCategory = (id: string) => {
    const category = categories.find(cat => cat.id === id);
    if (category) {
      setCategoryToEdit(category);
      setEditDialogOpen(true);
    }
  };

  const handleSaveCategory = async (updatedCategory: Omit<Category, "spent">) => {
    try {
      const saved = await categoriesApi.update(updatedCategory.id, {
        name: updatedCategory.name,
        icon: updatedCategory.icon,
        color: updatedCategory.color,
        budget: updatedCategory.budget,
      });
      setCategories((prev) => prev.map(cat => cat.id === saved.id ? { ...cat, ...saved } : cat));
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

  const handlePlanningMonthChange = async (mp: MonthPeriod) => {
    setPlanningMonth(mp);

    try {
      const plan = await budgetPlansApi.getForMonth(mp.year, mp.month);
      setPlanningPlan(plan);
    } catch {
      setPlanningPlan(null);
    }
  };

  const isPlanningViewedMonth = (mp: MonthPeriod): boolean => {
    return period.kind === 'month' &&
      period.year === mp.year &&
      period.month === mp.month;
  };

  const handlePlanSaved = (plan: BudgetPlan) => {
    setPlanningPlan(plan);

    if (planningMonth && isPlanningViewedMonth(planningMonth)) {
      setBudgetPlan(plan);
    }

    toast.success(t.planSaved);
  };

  const handlePlanDeleted = async (): Promise<void> => {
    if (!planningPlan) {
      return;
    }

    try {
      await budgetPlansApi.delete(planningPlan.id);
      setPlanningPlan(null);

      if (planningMonth && isPlanningViewedMonth(planningMonth)) {
        setBudgetPlan(null);
      }

      toast.success(t.planDeleted);
    } catch {
      toast.error('Failed to delete budget plan');
    }
  };

  const planningMonths = getPlanningMonths();

  const renderCategoryCard = (category: Category) => (
    <CategoryCard
      key={category.id}
      id={category.id}
      name={t[category.name as keyof typeof t] as string || category.name}
      spent={category.spent}
      budget={category.budget}
      icon={category.icon}
      color={category.color}
      onEdit={handleEditCategory}
      onDelete={handleDeleteCategory}
      onClick={handleCategoryClick}
      translations={t}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="Moneta" className="w-8 h-8 coin-logo cursor-pointer" />
              <h1>{t.appTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={view === 'dashboard' ? 'default' : 'outline'} onClick={() => setView('dashboard')}>Dashboard</Button>
              <Button variant={view === 'expenses' ? 'default' : 'outline'} onClick={() => setView('expenses')}>Expenses</Button>
              <Button variant="outline" onClick={() => navigate('/monobank/setup')} className="gap-2">
                <CreditCard className="w-4 h-4" />
                Monobank
              </Button>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={t.currency} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="UAH">UAH</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setIncomeDialogOpen(true)}>
                {incomeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.manageIncomes}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleLanguage}
                className="rounded-full"
              >
                <Languages className="w-5 h-5" />
                <span className="sr-only">{language === 'en' ? 'EN' : 'UK'}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-24">
        {view === 'expenses' ? (
          <ExpensesPage />
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-6 sm:p-8 mb-6 shadow-lg">
              <p className="opacity-90 mb-2">{t.totalBalance}</p>
              <h2 className="text-4xl sm:text-5xl mb-4">{formatAmount(remaining)}</h2>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="opacity-75">{t.budget}</p>
                  <p className="text-lg">{formatAmount(effectiveBudget)}</p>
                </div>
                <div>
                  <p className="opacity-75">{t.spent}</p>
                  <p className="text-lg">{formatAmount(totalSpent)}</p>
                </div>
                {totalIncome > 0 && (
                  <div>
                    <p className="opacity-75">{t.incomesTotal}</p>
                    <p className="text-lg">{formatAmount(totalIncome)}</p>
                  </div>
                )}
                {savingsRate !== null && (
                  <div>
                    <p className="opacity-75">Savings Rate</p>
                    <p className={`text-lg font-semibold ${savingsRate < 0 ? 'text-red-300' : 'text-green-300'}`}>
                      {savingsRate.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Period Selector */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {getLastNMonths(6).map((mp) => (
                <Button
                  key={`${mp.year}-${mp.month}`}
                  variant={periodEquals(period, mp) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodChange(mp)}
                >
                  {formatMonthLabel(mp, language)}
                </Button>
              ))}
              <Button
                variant={period.kind === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodChange({ kind: 'custom' })}
              >
                <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
                {t.custom}
              </Button>
              {period.kind === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
                  />
                  <span className="text-muted-foreground text-sm">—</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
                  />
                </div>
              )}
            </div>

            {/* Categories Section Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground">{t.categories}</h2>
              <Select
                value={planningMonth ? monthKey(planningMonth) : ''}
                onValueChange={(val) => handlePlanningMonthChange(monthFromKey(val))}
              >
                <SelectTrigger className="w-auto gap-2 border-dashed">
                  <SelectValue placeholder={t.planBudget} />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    {planningMonths.map((mp) => {
                      const isCurrent = mp.year === currentMonthPeriod.year && mp.month === currentMonthPeriod.month;

                      return (
                        <SelectItem key={monthKey(mp)} value={monthKey(mp)}>
                          <span className={isCurrent ? 'font-semibold text-primary' : ''}>
                            {formatMonthLabel(mp, language)}
                          </span>
                          {isCurrent && (
                            <span className="ml-2 text-xs text-primary/70 font-normal">●</span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Budget Plan Panel */}
            {planningMonth && (
              <BudgetPlanPanel
                year={planningMonth.year}
                month={planningMonth.month}
                monthLabel={formatMonthLabel(planningMonth, language)}
                categories={categories}
                existingPlan={planningPlan}
                onSaved={handlePlanSaved}
                onDeleted={handlePlanDeleted}
                onClose={() => setPlanningMonth(null)}
                translations={t}
              />
            )}

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plannedCategories.map(renderCategoryCard)}
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
                          {unplannedWithSpend.map(renderCategoryCard)}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mergedCategories.map(renderCategoryCard)}
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
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
        size="icon"
      >
        <Plus className="w-6 h-6" />
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

      <IncomeDialog
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
        items={incomeItems}
        onAdd={handleAddIncome}
        onUpdate={handleUpdateIncome}
        onRemove={handleRemoveIncome}
        translations={t}
      />

      {selectedCategory && (
        <CategoryTransactionsModal
          open={!!selectedCategory}
          onOpenChange={(open) => { if (!open) setSelectedCategory(null); }}
          categoryId={selectedCategory.id}
          categoryName={t[selectedCategory.name as keyof typeof t] as string || selectedCategory.name}
          categoryIcon={selectedCategory.icon}
          categoryColor={selectedCategory.color}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}
