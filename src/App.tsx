import { useState, useEffect } from "react";
import { CategoryCard } from "./components/CategoryCard";
import { AddCategoryDialog } from "./components/AddCategoryDialog";
import { EditCategoryDialog } from "./components/EditCategoryDialog";
import { Button } from "./components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./components/ui/alert-dialog";
import { Plus, Wallet, Moon, Sun, Languages, Trash2 } from "lucide-react";
import { type Language, getTranslation } from "./lib/translations";
import { toast } from "sonner";
import { IncomeDialog, type IncomeItem } from "./components/IncomeDialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Switch } from "./components/ui/switch";
import ExpensesPage from "./pages/ExpensesPage";

interface Category {
  id: string;
  name: string;
  spent: number;
  budget: number;
  icon: string;
  color: string;
  isDemo?: boolean;
}

const DEMO_CATEGORIES: Category[] = [
  {
    id: "1",
    name: "groceries",
    spent: 234,
    budget: 2000,
    icon: "🛒",
    color: "#6366f1",
    isDemo: true
  },
  {
    id: "2",
    name: "rent",
    spent: 1200,
    budget: 1200,
    icon: "🏠",
    color: "#8b5cf6",
    isDemo: true
  },
  {
    id: "3",
    name: "transportation",
    spent: 150,
    budget: 300,
    icon: "🚗",
    color: "#ec4899",
    isDemo: true
  },
  {
    id: "4",
    name: "entertainment",
    spent: 89,
    budget: 200,
    icon: "🎬",
    color: "#f97316",
    isDemo: true
  },
  {
    id: "5",
    name: "healthcare",
    spent: 45,
    budget: 150,
    icon: "💊",
    color: "#22c55e",
    isDemo: true
  }
];

export default function App() {
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
      return localStorage.getItem('currency') || 'USD';
    }
    return 'USD';
  });
  const [useManualBudget, setUseManualBudget] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('useManualBudget') === 'true';
    }
    return false;
  });
  const [manualBudget, setManualBudget] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manualBudget');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('incomeItems');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('categories');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return DEMO_CATEGORIES;
  });

  const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalIncome = incomeItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
  const effectiveBudget = useManualBudget ? manualBudget : (totalIncome > 0 ? totalIncome : totalBudget);
  const remaining = effectiveBudget - totalSpent;
  const hasDemoData = categories.some(cat => cat.isDemo);

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
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);
  useEffect(() => {
    localStorage.setItem('useManualBudget', String(useManualBudget));
  }, [useManualBudget]);
  useEffect(() => {
    localStorage.setItem('manualBudget', String(manualBudget));
  }, [manualBudget]);
  useEffect(() => {
    localStorage.setItem('incomeItems', JSON.stringify(incomeItems));
  }, [incomeItems]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'uk' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleIncomeConfirm = (items: IncomeItem[]) => {
    setIncomeItems(items);
    const sum = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    toast.success(t.incomesTotal + ': ' + formatAmount(sum));
  };

  const formatAmount = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
    } catch {
      return `${value.toLocaleString()} ${currency}`;
    }
  };

  const handleAddCategory = (newCategory: Omit<Category, "id" | "spent">) => {
    const category: Category = {
      ...newCategory,
      id: Date.now().toString(),
      spent: 0,
      isDemo: false
    };
    setCategories([...categories, category]);
  };

  const handleEditCategory = (id: string) => {
    const category = categories.find(cat => cat.id === id);
    if (category) {
      setCategoryToEdit(category);
      setEditDialogOpen(true);
    }
  };

  const handleSaveCategory = (updatedCategory: Category) => {
    setCategories(categories.map(cat => 
      cat.id === updatedCategory.id ? { ...updatedCategory, isDemo: false } : cat
    ));
  };

  const handleDeleteCategory = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      setCategories(categories.filter(cat => cat.id !== categoryToDelete));
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const clearDemoData = () => {
    setCategories(categories.filter(cat => !cat.isDemo));
  };

  const [view, setView] = useState<'dashboard' | 'expenses'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('view') as 'dashboard' | 'expenses') || 'dashboard';
    }
    return 'dashboard';
  });
  useEffect(() => {
    localStorage.setItem('view', view);
  }, [view]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              <h1>{t.appTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={view === 'dashboard' ? 'default' : 'outline'} onClick={() => setView('dashboard')}>Dashboard</Button>
              <Button variant={view === 'expenses' ? 'default' : 'outline'} onClick={() => setView('expenses')}>Expenses</Button>
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
              <Button variant="outline" onClick={() => setIncomeDialogOpen(true)}>{t.manageIncomes}</Button>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-24">
        {view === 'expenses' ? (
          <ExpensesPage />
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-6 sm:p-8 mb-6 shadow-lg">
              <p className="opacity-90 mb-2">{t.totalBalance}</p>
              <h2 className="text-4xl sm:text-5xl mb-4">{formatAmount(remaining)}</h2>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="opacity-75">{t.budget}</p>
                  <p className="text-lg">{formatAmount(effectiveBudget)}</p>
                </div>
                <div>
                  <p className="opacity-75">{t.spent}</p>
                  <p className="text-lg">{formatAmount(totalSpent)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Switch checked={useManualBudget} onCheckedChange={setUseManualBudget} />
                  <span>{t.useManualBudget}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="opacity-75 w-40">{t.manualBudgetAmount}</span>
                  <input
                    className="bg-card/20 rounded px-3 py-2 w-full outline-none"
                    type="number"
                    value={manualBudget || ''}
                    onChange={e => setManualBudget(Number(e.target.value) || 0)}
                    disabled={!useManualBudget}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="opacity-75 w-40">{t.incomesTotal}</span>
                  <span className="text-lg">{formatAmount(totalIncome)}</span>
                </div>
              </div>
            </div>

            {/* Categories Section */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground">{t.categories}</h2>
              {hasDemoData && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearDemoData}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t.clearDemoData}
                </Button>
              )}
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
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
                  translations={t}
                />
              ))}
            </div>

            {categories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">{t.noCategoriesYet}</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.addFirstCategory}
                </Button>
              </div>
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

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddCategory}
        translations={t}
      />

      {/* Edit Category Dialog */}
      <EditCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveCategory}
        category={categoryToEdit}
        translations={t}
      />

      {/* Delete Confirmation Dialog */}
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
        onConfirm={handleIncomeConfirm}
        translations={t}
      />
    </div>
  );
}
