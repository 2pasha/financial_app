import { useEffect, useMemo, useState } from "react";
import { monobankApi } from "../lib/api-client";
import { AddTokenModal } from "../components/monobank/AddTokenModal";
import { SortableTableHead } from "../components/monobank/SortableTableHead";
import { MultiSelectFilter } from "../components/monobank/MultiSelectFilter";
import { AmountFilter, type AmountFilterValue } from "../components/monobank/AmountFilter";
import { DateRangeFilter, type DateRangeValue } from "../components/monobank/DateRangeFilter";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Loader2, RefreshCw, AlertCircle, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type MonoTxn = {
  id: string;
  time: string; // ISO string from DB
  description: string;
  mcc: number | null;
  originalMcc: number | null;
  hold: boolean;
  amount: number; // negative = expense in minor units (e.g., cents)
  currency: number; // currencyCode from DB
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  account?: {
    id: string;
    type: string;
  };
};

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

export default function ExpensesPage() {
  const [tokenStatus, setTokenStatus] = useState<{
    hasToken: boolean;
    hasTransactions: boolean;
    transactionCount: number;
    lastTransactionDate: string | null;
  } | null>(null);
  
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setIsSyncing] = useState(false);
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

  // Check token status on mount
  useEffect(() => {
    checkStatus();
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

  const handleTokenSaved = async () => {
    setShowTokenModal(false);
    setIsSyncing(true);
    
    try {
      toast.info('Starting initial sync...', { duration: 2000 });
      const result = await monobankApi.syncTransactions();
      toast.success(`Synced ${result.transactionsCount} transactions!`);
      
      await checkStatus();
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message);
      setError(err.message);
    } finally {
      setIsSyncing(false);
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
        filters.categories.includes(String(tx.mcc || 0));
      
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
    const uniqueMccs = new Set(txns.map(t => t.mcc || 0));
    return Array.from(uniqueMccs)
      .sort((a, b) => a - b)
      .map(mcc => ({
        value: String(mcc),
        label: mccName(mcc, mccCatalog),
      }));
  }, [txns, mccCatalog]);

  const cardOptions = useMemo(() => {
    const uniqueCards = new Set(txns.map(t => t.account?.type).filter(Boolean));
    return Array.from(uniqueCards)
      .sort()
      .map(type => ({
        value: type as string,
        label: formatCardType(type as string, ''),
      }));
  }, [txns]);

  // Statistics
  const totalExpense = useMemo(() => {
    return filteredTransactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return filteredTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  }, [filteredTransactions]);

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Syncing Your Transactions</h3>
              <p className="text-muted-foreground text-center max-w-md">
                This may take several minutes due to Monobank API rate limits. 
                Please don't close this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AddTokenModal 
        open={showTokenModal} 
        onSuccess={handleTokenSaved} 
      />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
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
              <Button
                onClick={handleRefetch}
                disabled={refetching || !tokenStatus?.hasToken}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {refetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refetch New
              </Button>
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
                <p className="text-muted-foreground">
                  No transactions yet. Sync your Monobank account to see expenses.
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Expenses</div>
                      <div className="text-2xl font-bold text-red-600">
                        {currencySymbolFromCode(980)}
                        {Math.abs(totalExpense / 100).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Income</div>
                      <div className="text-2xl font-bold text-green-600">
                        {currencySymbolFromCode(980)}
                        {Math.abs(totalIncome / 100).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Transactions</div>
                      <div className="text-2xl font-bold">
                        {filteredTransactions.length}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Categories</div>
                      <div className="text-2xl font-bold">
                        {uniqueCategories}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                  <Table>
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
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No transactions match your filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-medium">{tx.description}</TableCell>
                            <TableCell>
                              <a 
                                href={mccUrl(tx.mcc || 0)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                {mccName(tx.mcc || 0, mccCatalog)}
                              </a>
                            </TableCell>
                            <TableCell className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                              <span className="font-semibold">
                                {tx.amount > 0 ? '+' : ''}
                                {currencySymbolFromCode(tx.currency)}
                                {Math.abs(tx.amount / 100).toLocaleString()}
                              </span>
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
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredTransactions.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center px-3 text-sm">
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


