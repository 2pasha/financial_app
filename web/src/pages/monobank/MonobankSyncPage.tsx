import { useState, useEffect } from 'react';
import { monobankApi } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function MonobankSyncPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    accountsCount: number;
    transactionsCount: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const itemsPerPage = 50;

  useEffect(() => {
    loadTransactions();
  }, [currentPage]);

  const loadTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const data = await monobankApi.getTransactions({ page: currentPage, limit: itemsPerPage });
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
      setTotalTransactions(data.total || 0);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleSync = async () => {
    setError(null);
    setSyncResult(null);
    setIsSyncing(true);

    try {
      const response = await monobankApi.syncTransactions();
      setSyncResult(response);
      toast.success('Transactions synced successfully!');
      
      // Reload transactions after sync
      setTimeout(() => {
        loadTransactions();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to sync transactions');
      toast.error('Failed to sync transactions');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatAmount = (amount: number, currency: number) => {
    const currencyMap: Record<number, string> = {
      980: 'UAH',
      840: 'USD',
      978: 'EUR',
    };
    const currencyCode = currencyMap[currency] || 'UAH';
    const value = amount / 100; // Convert from minor units
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monobank Transactions</h1>
            <p className="text-muted-foreground">
              Sync and view your Monobank transactions
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            size="lg"
            className="gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Sync Transactions
              </>
            )}
          </Button>
        </div>

        {/* Sync Info Alert */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            The sync process fetches your last 3 months of transactions. This may take several minutes due to Monobank API rate limiting (60 seconds between requests).
          </AlertDescription>
        </Alert>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sync Result */}
        {syncResult && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">{syncResult.message}</p>
                  <p className="text-sm text-green-700">
                    Synced {syncResult.accountsCount} account(s) and {syncResult.transactionsCount} transaction(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  {totalTransactions > 0 
                    ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalTransactions)} of ${totalTransactions} transactions`
                    : 'Your synced transactions from Monobank'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No transactions yet. Click "Sync Transactions" to fetch your data.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(tx.time)}
                          </span>
                          {tx.hold && (
                            <Badge variant="outline" className="text-xs">
                              Hold
                            </Badge>
                          )}
                          {tx.mcc && (
                            <Badge variant="secondary" className="text-xs">
                              MCC: {tx.mcc}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold text-lg ${
                            tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {tx.amount > 0 ? '+' : ''}
                          {formatAmount(tx.amount, tx.currency)}
                        </p>
                        {tx.cashbackAmount > 0 && (
                          <p className="text-xs text-green-600">
                            Cashback: {formatAmount(tx.cashbackAmount, tx.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
