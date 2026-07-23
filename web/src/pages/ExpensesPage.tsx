import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { monobankApi, categoriesApi, transactionsApi, tripsApi } from "../lib/api-client";
import { useExchangeRates } from "../hooks/useExchangeRates";
import type { Category, Transaction, Trip, SyncJob } from "../lib/api-client";
import { AddTokenModal } from "../components/monobank/AddTokenModal";
import { SortableTableHead } from "../components/monobank/SortableTableHead";
import { MultiSelectFilter } from "../components/monobank/MultiSelectFilter";
import { AmountFilter, type AmountFilterValue } from "../components/monobank/AmountFilter";
import { DateRangeFilter, type DateRangeValue } from "../components/monobank/DateRangeFilter";
import { TransactionDrawer } from "../components/TransactionDrawer";
import { CreateTransactionDialog } from "../components/CreateTransactionDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Loader2, RefreshCw, AlertCircle, DollarSign, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Webhook, Plus, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "../hooks/useAppSettings";

type MonoTxn = Transaction;

// Popular MCC codes mapped to human-readable names (source: mcc.in.ua)
const MCC_MAP: Record<number, string> = {
  4111: 'Local/Suburban Passenger Transport',
  5812: 'Restaurants',
  5912: 'Pharmacies',
  5814: 'Fast Food Restaurants',
  5411: 'Grocery Stores, Supermarkets',
  5462: 'Bakeries',
  7832: 'Movie Theaters',
  7941: 'Sports Clubs and Promoters',
  5641: 'Children’s Clothing Stores',
  5441: 'Candy, Nut and Confectionery Stores',
  5977: 'Cosmetic Stores',
  5211: 'Lumber and Building Materials',
  5499: 'Misc. Food Stores',
  5942: 'Book Stores',
  5541: 'Service Stations',
  5995: 'Pet Shops, Pet Foods',
  8099: 'Medical Services (Not Elsewhere Classified)',
  5311: 'Department Stores',
  5200: 'Home Supply Warehouse Stores',
  5399: 'Misc. General Merchandise',
  1520: 'General Contractors – Residential/Commercial',
  5811: 'Caterers',
  4812: 'Telecom Equipment and Telephone Sales',
  5300: 'Wholesale Clubs',
  5722: 'Household Appliance Stores',
  5122: 'Drugs, Drug Proprietaries, and Druggist Sundries',
  5310: 'Discount Stores',
  5921: 'Package Stores – Beer, Wine, Liquor',
  5697: 'Tailors/Alterations',
  5661: 'Shoe Stores',
  5331: 'Variety Stores',
  4829: 'Money Transfers',
  6012: 'Financial Institutions – Merchandise and Services',
};

async function loadMccCatalog(): Promise<Record<number, string>> {
  try {
    const res = await fetch('/mcc.json');
    if (!res.ok) return {};
    const json = await res.json() as Record<string, string>;
    const normalized: Record<number, string> = {};
    for (const [k, v] of Object.entries(json)) {
      const code = Number(k);
      if (!Number.isNaN(code)) normalized[code] = v;
    }
    return normalized;
  } catch {
    return {};
  }
}

function mccName(mcc: number, catalog: Record<number, string>) {
  const name = catalog[mcc] || MCC_MAP[mcc];
  return name ? `${mcc} • ${name}` : `MCC ${mcc}`;
}

function mccUrl(mcc: number) {
  return `https://mcc.in.ua/ua/mccs#${mcc}`;
}

function currencySymbolFromCode(code: number) {
  switch (code) {
    case 980: return '₴'; // UAH
    case 840: return '$'; // USD
    case 978: return '€'; // EUR
    case 826: return '£'; // GBP
    default: return '';
  }
}

function formatCardType(accountType: string, accountId: string): string {
  const typeMap: Record<string, string> = {
    'black': '💳 Black',
    'white': '💳 White',
    'platinum': '💎 Platinum',
    'iron': '⚡ Iron',
    'fop': '💼 FOP',
    'yellow': '🟡 Yellow',
  };
  
  const displayType = typeMap[accountType.toLowerCase()] || `💳 ${accountType}`;
  const shortId = accountId ? `••${accountId.slice(-4)}` : '';
  return `${displayType} ${shortId}`.trim();
}

const UAH_CODE = 980;

// Persisted so a page reload can reconnect to an in-flight background sync.
const SYNC_JOB_KEY = 'monobankSyncJobId';

interface ExpensesPageProps {
  /** When true, open the New Transaction dialog once on mount (welcome-flow "Add manually"). */
  autoOpenCreate?: boolean;
  /** Called after the auto-open signal is consumed so the parent can reset it. */
  onAutoOpenCreateConsumed?: () => void;
}

/** Collapsible "How to use Expenses" help panel — mirrors the TripsTip pattern.
 *  Collapsed by default, always accessible (shown in both empty and populated states). */
function ExpensesTip() {
  const { t } = useAppSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>💡</span> {t.expensesTipTitle}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-muted-foreground border-t border-border pt-3">
          <p>{t.expensesTipIntro}</p>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {t.expensesTipAddTitle}
            </p>
            <ul className="space-y-1 list-none">
              <li className="flex gap-2">
                <span className="text-green-600 shrink-0">+</span>
                {t.expensesTipSync}
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 shrink-0">+</span>
                {t.expensesTipManual}
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {t.expensesTipCategoryTitle}
            </p>
            <p>{t.expensesTipCategory}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage({
  autoOpenCreate = false,
  onAutoOpenCreateConsumed,
}: ExpensesPageProps = {}) {
  const { t } = useAppSettings();
  const { rateToUAH } = useExchangeRates();
  const [tokenStatus, setTokenStatus] = useState<{
    hasToken: boolean;
    hasTransactions: boolean;
    transactionCount: number;
    lastTransactionDate: string | null;
  } | null>(null);
  
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncJob | null>(null);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txns, setTxns] = useState<MonoTxn[]>([]);
  const [mccCatalog, setMccCatalog] = useState<Record<number, string>>({});
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filtering state
  const [filters, setFilters] = useState({
    name: '',
    categories: [] as string[],
    amount: { mode: null, value: null } as AmountFilterValue,
    dateRange: { from: null, to: null } as DateRangeValue,
    cards: [] as string[],
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Load MCC catalog
  useEffect(() => {
    loadMccCatalog().then(setMccCatalog);
  }, []);

  // Load categories for transaction labeling
  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => {});
  }, []);

  // Load active trips for inline assignment
  useEffect(() => {
    tripsApi.getAll()
      .then((all) => setActiveTrips(all.filter((t) => t.isActive)))
      .catch(() => {});
  }, []);

  // Check token status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Reconnect to an in-flight sync after a page reload (the job runs server-side).
  useEffect(() => {
    const storedJobId = localStorage.getItem(SYNC_JOB_KEY);
    if (storedJobId) {
      void pollSyncJob(storedJobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const status = await monobankApi.checkTokenStatus();
      setTokenStatus(status);

      if (!status.hasToken) {
        setShowTokenModal(true);
      } else if (status.hasTransactions) {
        await loadTransactions();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await monobankApi.getTransactions({ 
        page: 1, 
        limit: 10000 
      });
      setTxns(data.transactions || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Polls a background sync job to completion, driving the progress UI. Used both
  // right after saving a token and when reconnecting to a job after a page reload.
  const pollSyncJob = async (jobId: string) => {
    setIsSyncing(true);

    try {
      let job: SyncJob;
      do {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        job = await monobankApi.getSyncStatus(jobId);
        setSyncProgress(job);
      } while (job.status === 'pending' || job.status === 'running');

      if (job.status === 'completed') {
        toast.success(`Synced ${job.transactionsCount} transactions!`);
        await checkStatus();
      } else {
        const message = job.error || 'Sync failed';
        toast.error(message);
        setError(message);
      }
    } catch (err: any) {
      // A 404 means the job is no longer tracked (e.g. the API restarted mid-sync).
      // Just refresh with whatever landed rather than showing a scary error.
      if (err?.response?.status === 404) {
        await checkStatus();
      } else {
        setError(err?.message ?? 'Lost track of the sync job');
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
      localStorage.removeItem(SYNC_JOB_KEY);
    }
  };

  const handleTokenSaved = async () => {
    setShowTokenModal(false);
    setIsSyncing(true);
    setError(null);

    try {
      toast.info('Starting initial sync…', { duration: 2000 });
      // Initial onboarding sync: last 31 days only, so the first run needs ~one
      // request per account instead of the full 3-month history (much faster).
      // POST /monobank/sync returns a jobId immediately; the real work runs in a
      // background job we then poll. Persist the jobId so a reload can reconnect.
      const { jobId } = await monobankApi.syncTransactions(31);
      localStorage.setItem(SYNC_JOB_KEY, jobId);
      await pollSyncJob(jobId);
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message);
      setError(err.message);
      setIsSyncing(false);
      localStorage.removeItem(SYNC_JOB_KEY);
    }
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTx, setSelectedTx] = useState<MonoTxn | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Honor the welcome-flow "Add manually" signal exactly once.
  const autoOpenHandled = useRef(false);
  useEffect(() => {
    if (autoOpenCreate && !autoOpenHandled.current) {
      autoOpenHandled.current = true;
      setCreateDialogOpen(true);
      onAutoOpenCreateConsumed?.();
    }
  }, [autoOpenCreate, onAutoOpenCreateConsumed]);

  // Inline category editing state
  // categoryCache stores category lists keyed by "YYYY-M" (month of the transaction)
  const categoryCache = useRef<Record<string, Category[]>>({});
  const [inlineCategoryOptions, setInlineCategoryOptions] = useState<Record<string, Category[]>>({});
  const [savingCategoryForTx, setSavingCategoryForTx] = useState<string | null>(null);

  // Inline trip assignment state
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [savingTripForTx, setSavingTripForTx] = useState<string | null>(null);

  const monthKey = (isoTime: string) => {
    const d = new Date(isoTime);

    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  };

  const loadCategoriesForMonth = useCallback(async (isoTime: string) => {
    const key = monthKey(isoTime);
    if (categoryCache.current[key]) {
      return;
    }

    const d = new Date(isoTime);
    try {
      const cats = await categoriesApi.getAll({
        from: isoTime,
        calendarYear: d.getFullYear(),
        calendarMonth: d.getMonth() + 1,
      });

      categoryCache.current[key] = cats;
      setInlineCategoryOptions((prev) => ({ ...prev, [key]: cats }));
    } catch {
      // silently ignore — user can still open the drawer if needed
    }
  }, []);

  const [webhookConnecting, setWebhookConnecting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'not_connected' | 'running' | 'stopped' | null>(null);

  const fetchWebhookStatus = useCallback(async () => {
    try {
      const result = await monobankApi.getWebhookStatus();
      setWebhookStatus(result.status);
    } catch {
      // silently ignore — status indicator just won't update
    }
  }, []);

  // Poll webhook status on mount and every 3 minutes (backend caches the
  // rate-limited Monobank call for 60s, so polling is safe).
  useEffect(() => {
    fetchWebhookStatus();
    const interval = setInterval(fetchWebhookStatus, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWebhookStatus]);

  const handleConnectWebhook = async () => {
    setWebhookConnecting(true);

    try {
      const result = await monobankApi.setupWebhook();
      toast.success(`Webhook connected: ${result.webhookUrl}`);
      await fetchWebhookStatus();
    } catch (err: any) {
      toast.error('Failed to connect webhook: ' + err.message);
    } finally {
      setWebhookConnecting(false);
    }
  };

  const handleRefetch = async () => {
    setRefetching(true);
    setError(null);

    try {
      toast.info('Fetching new transactions...');
      const result = await monobankApi.syncIncremental();
      
      if (result.fallbackTo31Days) {
        // Period exceeded 31 days, fetched last 31 days instead
        toast.success(
          `Fetched ${result.transactionsCount} transactions from the last 31 days (Monobank API limit)`,
          { duration: 5000 }
        );
      } else if (result.transactionsCount > 0) {
        toast.success(`Found ${result.transactionsCount} new transactions!`);
      } else {
        toast.info('No new transactions found');
      }
      
      await loadTransactions();
      await checkStatus();
    } catch (err: any) {
      toast.error('Refetch failed: ' + err.message);
      setError(err.message);
    } finally {
      setRefetching(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Sorting logic
  const sortedTransactions = useMemo(() => {
    if (!sortColumn) return txns;

    return [...txns].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case 'name':
          aVal = a.description.toLowerCase();
          bVal = b.description.toLowerCase();
          break;
        case 'category':
          aVal = mccName(a.mcc || 0, mccCatalog);
          bVal = mccName(b.mcc || 0, mccCatalog);
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'date':
          aVal = new Date(a.time).getTime();
          bVal = new Date(b.time).getTime();
          break;
        case 'card':
          aVal = a.account?.type || '';
          bVal = b.account?.type || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [txns, sortColumn, sortDirection, mccCatalog]);

  // Filtering logic
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      // Name filter (text)
      const matchesName = tx.description
        .toLowerCase()
        .includes(filters.name.toLowerCase());
      
      // Category filter (multi-select)
      const matchesCategory = filters.categories.length === 0 ||
        filters.categories.includes(tx.categoryId ?? '__uncategorized__');
      
      // Amount filter (comparison mode)
      let matchesAmount = true;
      if (filters.amount.mode && filters.amount.value !== null) {
        const txAmount = Math.abs(tx.amount / 100);
        switch (filters.amount.mode) {
          case 'greater':
            matchesAmount = txAmount > filters.amount.value;
            break;
          case 'less':
            matchesAmount = txAmount < filters.amount.value;
            break;
          case 'equal':
            matchesAmount = Math.abs(txAmount - filters.amount.value) < 0.01; // floating point tolerance
            break;
        }
      }
      
      // Date range filter
      let matchesDate = true;
      if (filters.dateRange.from || filters.dateRange.to) {
        const txDate = new Date(tx.time);
        if (filters.dateRange.from) {
          const fromDate = new Date(filters.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && txDate >= fromDate;
        }
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && txDate <= toDate;
        }
      }
      
      // Card filter (multi-select)
      const matchesCard = filters.cards.length === 0 || 
        filters.cards.includes(tx.account?.type || '');

      return matchesName && matchesCategory && matchesAmount && matchesDate && matchesCard;
    });
  }, [sortedTransactions, filters, mccCatalog]);

  // Pagination logic
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Extract unique categories and cards for filter dropdowns
  const categoryOptions = useMemo(() => {
    const options = categories.map(cat => ({
      value: cat.id,
      label: `${cat.icon} ${cat.name}`,
    }));
    const hasUncategorized = txns.some(t => !t.categoryId);
    if (hasUncategorized) {
      options.push({ value: '__uncategorized__', label: '— Uncategorized' });
    }

    return options;
  }, [categories, txns]);

  const cardOptions = useMemo(() => {
    const uniqueCards = new Set(txns.map(t => t.account?.type).filter(Boolean));
    return Array.from(uniqueCards)
      .sort()
      .map(type => ({
        value: type as string,
        label: formatCardType(type as string, ''),
      }));
  }, [txns]);

  // Statistics — convert non-UAH amounts to UAH using current exchange rates
  const toUAH = (tx: MonoTxn) => {
    if (tx.currency === UAH_CODE) return tx.amount;
    const rate = rateToUAH(tx.currency);
    // Guard against a missing/NaN rate poisoning the running total (?? misses NaN).
    const safeRate = rate != null && !Number.isNaN(rate) ? rate : 1;
    return Math.round(tx.amount * safeRate);
  };

  const totalExpense = useMemo(() => {
    return filteredTransactions.filter(t => t.amount < 0).reduce((s, t) => s + toUAH(t), 0);
  }, [filteredTransactions, rateToUAH]);

  const totalIncome = useMemo(() => {
    return filteredTransactions.filter(t => t.amount > 0).reduce((s, t) => s + toUAH(t), 0);
  }, [filteredTransactions, rateToUAH]);

  const uniqueCategories = useMemo(() => {
    return new Set(filteredTransactions.map(t => t.mcc)).size;
  }, [filteredTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.name !== '' ||
      filters.categories.length > 0 ||
      (filters.amount.mode !== null && filters.amount.value !== null) ||
      filters.dateRange.from !== null ||
      filters.dateRange.to !== null ||
      filters.cards.length > 0
    );
  }, [filters]);

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      name: '',
      categories: [],
      amount: { mode: null, value: null },
      dateRange: { from: null, to: null },
      cards: [],
    });
  };

  const handleRowClick = (tx: MonoTxn) => {
    setSelectedTx(tx);
    setDrawerOpen(true);
  };

  const handleTransactionUpdate = (updated: MonoTxn) => {
    setTxns((prev) => prev.map((tx) => (tx.id === updated.id ? updated : tx)));
    setSelectedTx(updated);
  };

  const handleTransactionDelete = (id: string) => {
    setTxns((prev) => prev.filter((tx) => tx.id !== id));
    setSelectedTx(null);
  };

  const handleTransactionCreate = (created: MonoTxn) => {
    setTxns((prev) => [created, ...prev]);
  };

  const handleInlineTripChange = async (tx: MonoTxn, newTripId: string) => {
    setSavingTripForTx(tx.id);
    try {
      const updated = await transactionsApi.update(tx.id, {
        tripId: newTripId === "none" ? null : newTripId,
      });
      handleTransactionUpdate(updated);
      toast.success("Trip updated");
    } catch {
      toast.error("Failed to update trip");
    } finally {
      setSavingTripForTx(null);
    }
  };

  const handleInlineCategoryChange = async (tx: MonoTxn, newCategoryId: string) => {
    setSavingCategoryForTx(tx.id);

    try {
      const updated = await transactionsApi.update(tx.id, {
        categoryId: newCategoryId === "none" ? null : newCategoryId,
      });

      handleTransactionUpdate(updated);
      toast.success("Category updated");
    } catch {
      toast.error("Failed to update category");
    } finally {
      setSavingCategoryForTx(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (syncing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Syncing Your Transactions</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {syncProgress?.message ||
                "This may take several minutes due to Monobank API rate limits. Please don't close this page."}
            </p>
            {syncProgress && syncProgress.totalAccounts > 0 && (
              <div className="w-full max-w-md space-y-1">
                <Progress
                  value={(syncProgress.currentAccount / syncProgress.totalAccounts) * 100}
                />
                <p className="text-xs text-muted-foreground text-center">
                  {syncProgress.currentAccount} of {syncProgress.totalAccounts} accounts
                  {syncProgress.transactionsCount > 0 && ` · ${syncProgress.transactionsCount} transactions`}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Monobank limits requests to one per minute, so this runs in the background — you can safely leave and come back.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AddTokenModal
        open={showTokenModal}
        onOpenChange={setShowTokenModal}
        onSuccess={handleTokenSaved}
      />

      <TransactionDrawer
        transaction={selectedTx}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={handleTransactionUpdate}
        onDelete={handleTransactionDelete}
      />

      <CreateTransactionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleTransactionCreate}
      />

      <div>
        <ExpensesTip />
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Expenses</CardTitle>
                {tokenStatus && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tokenStatus.transactionCount} transactions
                    {tokenStatus.lastTransactionDate && (
                      <> • Last: {new Date(tokenStatus.lastTransactionDate).toLocaleDateString()}</>
                    )}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Primary action — this is what users come to this page to do */}
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.newTransaction}</span>
                  <span className="sm:hidden">{t.newTransactionShort}</span>
                </Button>

                {/* Technical Monobank actions live in an overflow menu so the page
                    stays focused on transactions. A dot on the trigger surfaces the
                    only state that needs attention (sync stopped). */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="relative gap-1 px-2"
                      aria-label={t.monobankOptions}
                    >
                      <MoreVertical className="h-4 w-4" />
                      {webhookStatus === 'stopped' && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2 font-normal text-xs text-muted-foreground">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          webhookStatus === 'running'
                            ? 'bg-green-500'
                            : webhookStatus === 'stopped'
                              ? 'bg-destructive'
                              : 'bg-muted-foreground/40'
                        }`}
                      />
                      {webhookStatus === 'running'
                        ? t.monobankConnected
                        : webhookStatus === 'stopped'
                          ? t.syncStopped
                          : t.notConnected}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {!tokenStatus?.hasToken ? (
                      <DropdownMenuItem onClick={() => setShowTokenModal(true)}>
                        <Webhook className="h-4 w-4" />
                        {t.connectMonobank}
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {webhookStatus !== 'running' && (
                          <DropdownMenuItem
                            onClick={handleConnectWebhook}
                            disabled={webhookConnecting}
                          >
                            {webhookConnecting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Webhook className="h-4 w-4" />
                            )}
                            {webhookStatus === 'stopped' ? t.reconnectMonobank : t.connectMonobank}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleRefetch} disabled={refetching}>
                          {refetching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          {t.refetchNew}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {txns.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t.expensesEmptyBody}
                </p>
              </div>
            ) : (
              <>
                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="mb-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="gap-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Clear All Filters
                    </Button>
                  </div>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Expenses</div>
                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {currencySymbolFromCode(980)}
                        {Math.abs(totalExpense / 100).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Income</div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {currencySymbolFromCode(980)}
                        {Math.abs(totalIncome / 100).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="text-xs sm:text-sm text-muted-foreground">Transactions</div>
                      <div className="text-xl sm:text-2xl font-bold">
                        {filteredTransactions.length}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="text-xs sm:text-sm text-muted-foreground">Categories</div>
                      <div className="text-xl sm:text-2xl font-bold">
                        {uniqueCategories}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[780px]">
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          column="name"
                          label="Name"
                          currentSort={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableHead
                          column="category"
                          label="Category"
                          currentSort={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <TableHead className="text-xs font-semibold text-muted-foreground">Trip</TableHead>
                        <SortableTableHead
                          column="amount"
                          label="Amount"
                          currentSort={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableHead 
                          column="date" 
                          label="Date" 
                          currentSort={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableHead 
                          column="card" 
                          label="Card" 
                          currentSort={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </TableRow>
                      
                      {/* Filter Row */}
                      <TableRow>
                        <TableHead>
                          <Input
                            placeholder="Filter name..."
                            value={filters.name}
                            onChange={(e) => setFilters({...filters, name: e.target.value})}
                            className="h-8"
                          />
                        </TableHead>
                        <TableHead>
                          <MultiSelectFilter
                            options={categoryOptions}
                            selected={filters.categories}
                            onChange={(categories) => setFilters({...filters, categories})}
                            placeholder="Filter categories..."
                          />
                        </TableHead>
                        <TableHead />
                        <TableHead>
                          <AmountFilter
                            filter={filters.amount}
                            onChange={(amount) => setFilters({...filters, amount})}
                          />
                        </TableHead>
                        <TableHead>
                          <DateRangeFilter
                            filter={filters.dateRange}
                            onChange={(dateRange) => setFilters({...filters, dateRange})}
                          />
                        </TableHead>
                        <TableHead>
                          <MultiSelectFilter
                            options={cardOptions}
                            selected={filters.cards}
                            onChange={(cards) => setFilters({...filters, cards})}
                            placeholder="Filter cards..."
                          />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    
                    <TableBody>
                      {paginatedTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No transactions match your filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedTransactions.map((tx) => (
                          <TableRow
                            key={tx.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(tx)}
                          >
                            <TableCell className="font-medium">
                              {tx.description}
                            </TableCell>
                            <TableCell
                              onClick={(e) => e.stopPropagation()}
                              onMouseEnter={() => loadCategoriesForMonth(tx.time)}
                              className="w-[160px] max-w-[160px]"
                            >
                              {savingCategoryForTx === tx.id ? (
                                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Saving…
                                </span>
                              ) : (
                                <Select
                                  value={tx.categoryId ?? "none"}
                                  onValueChange={(val) => handleInlineCategoryChange(tx, val)}
                                  disabled={savingCategoryForTx !== null}
                                >
                                  <SelectTrigger
                                    size="sm"
                                    className="h-auto border-0 shadow-none bg-transparent px-0 py-0 gap-1 focus-visible:ring-0 hover:bg-muted/60 rounded-md w-full"
                                  >
                                    <SelectValue>
                                      {tx.category ? (
                                        <span className="flex items-center gap-1">
                                          <span>{tx.category.icon}</span>
                                          <span
                                            className="text-xs font-medium px-2 py-0.5 rounded-full truncate max-w-[110px] inline-block"
                                            style={{ backgroundColor: tx.category.color + '33', color: tx.category.color }}
                                          >
                                            {tx.category.name}
                                          </span>
                                        </span>
                                      ) : tx.mcc ? (
                                        <span className="text-xs text-muted-foreground">
                                          {mccName(tx.mcc, mccCatalog)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">— no category</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      <span className="text-muted-foreground">No category</span>
                                    </SelectItem>
                                    {(inlineCategoryOptions[monthKey(tx.time)] ?? categories).map((cat) => (
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
                            </TableCell>
                            <TableCell
                              onClick={(e) => e.stopPropagation()}
                              className="min-w-[140px]"
                            >
                              {savingTripForTx === tx.id ? (
                                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Saving…
                                </span>
                              ) : (
                                <Select
                                  value={tx.tripId ?? "none"}
                                  onValueChange={(val) => handleInlineTripChange(tx, val)}
                                  disabled={savingTripForTx !== null}
                                >
                                  <SelectTrigger
                                    size="sm"
                                    className="h-auto border-0 shadow-none bg-transparent px-0 py-0 gap-1 focus-visible:ring-0 hover:bg-muted/60 rounded-md w-full"
                                  >
                                    <SelectValue>
                                      {tx.trip ? (
                                        <span className="flex items-center gap-1">
                                          <span>{tx.trip.icon}</span>
                                          <span
                                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                                            style={{ backgroundColor: tx.trip.color + '33', color: tx.trip.color }}
                                          >
                                            {tx.trip.name}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">— no trip</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      <span className="text-muted-foreground">No trip</span>
                                    </SelectItem>
                                    {activeTrips.map((trip) => (
                                      <SelectItem key={trip.id} value={trip.id}>
                                        <span className="flex items-center gap-2">
                                          <span>{trip.icon}</span>
                                          <span>{trip.name}</span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const isCross = tx.operationAmount != null && tx.operationCurrency !== tx.currency;
                                const isForeignAccount = !isCross && tx.currency !== UAH_CODE;
                                const primaryAmt = tx.amount / 100;
                                const primaryCur = isCross ? tx.operationCurrency! : tx.currency;
                                const rate = isForeignAccount ? rateToUAH(tx.currency) : null;
                                return (
                                  <div className="text-right">
                                    <span className="font-semibold" style={{ color: primaryAmt < 0 ? '#E53935' : '#2E7D32' }}>
                                      {primaryAmt > 0 ? '+' : ''}
                                      {currencySymbolFromCode(primaryCur)}
                                      {Math.abs(primaryAmt).toLocaleString()}
                                    </span>
                                    {isCross && (
                                      <p className="text-xs text-muted-foreground">
                                        {tx.operationAmount! > 0 ? '+' : ''}
                                        {currencySymbolFromCode(tx.currency)}
                                        {Math.abs(tx.operationAmount! / 100).toLocaleString()}
                                      </p>
                                    )}
                                    {isForeignAccount && rate && (
                                      <p className="text-xs text-muted-foreground">
                                        ≈{primaryAmt < 0 ? '' : '+'}₴{Math.abs(primaryAmt * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(tx.time).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {formatCardType(tx.account?.type || '', tx.account?.id || '')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
                  <div className="text-sm text-muted-foreground text-center sm:text-left">
                    Showing {filteredTransactions.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center px-3 text-sm whitespace-nowrap">
                      Page {currentPage} of {Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage * itemsPerPage >= filteredTransactions.length}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mt-4">
                  MCC Source: <a className="underline" href="https://mcc.in.ua/ua/mccs" target="_blank" rel="noreferrer">mcc.in.ua</a>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}


