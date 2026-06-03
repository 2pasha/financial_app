import { useEffect, useState, useMemo } from "react";
import { Loader2, BarChart2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { categoriesApi, tripsApi, type CategoryTransaction } from "../lib/api-client";
import { useExchangeRates } from "../hooks/useExchangeRates";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
  ResponsiveContainer,
} from "recharts@2.15.2";

const UAH = 980;
const TOP_N = 8;

function txToUAH(tx: CategoryTransaction, rateToUAH: (code: number) => number | null): number {
  if (tx.operationCurrency === UAH) return tx.amount;
  if (tx.currency === UAH) return tx.operationAmount ?? tx.amount;
  return tx.amount * (rateToUAH(tx.currency) ?? 1);
}
const CHART_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
];
const OTHER_COLOR = "#94a3b8";

interface CategoryTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  dateRange: { from: string; to: string };
  tripId?: string;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function currencySymbolFromCode(code: number): string {
  switch (code) {
    case 980: return "₴";
    case 840: return "$";
    case 978: return "€";
    case 826: return "£";
    default: return "";
  }
}

function formatAmount(amount: number, currencyCode: number): string {
  const symbol = currencySymbolFromCode(currencyCode);
  const abs = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount >= 0 ? `+${symbol}${abs}` : `-${symbol}${abs}`;
}

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

function sliceColor(index: number, name: string): string {
  return name === "Other" ? OTHER_COLOR : CHART_COLORS[index % CHART_COLORS.length];
}

function CategoryChart({
  data,
  selectedName,
  onSelect,
}: {
  data: { name: string; value: number }[];
  selectedName: string | null;
  onSelect: (name: string | null) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  const selectedIndex = selectedName != null
    ? data.findIndex((d) => d.name === selectedName)
    : null;

  // Hovered takes visual priority over selected, but selected stays "popped" when nothing is hovered
  const activeIndex = hoveredIndex ?? (selectedIndex !== -1 ? selectedIndex : null);

  function handleSliceClick(_: any, index: number) {
    onSelect(data[index].name === selectedName ? null : data[index].name);
  }

  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
    return (
      <div className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-xl min-w-[130px]">
        <p className="font-medium mb-0.5 truncate max-w-[180px]">{name}</p>
        <p className="text-muted-foreground">
          ₴{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pct}%)
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              activeIndex={activeIndex ?? undefined}
              activeShape={renderActiveShape}
              cursor="pointer"
              onMouseEnter={(_: any, i: number) => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={handleSliceClick}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={sliceColor(i, entry.name)}
                  opacity={selectedName != null && entry.name !== selectedName ? 0.4 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={tooltipContent} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground/60 text-center">
        Click a slice or label to see its transactions
      </p>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {data.map((entry, i) => {
          const isSelected = entry.name === selectedName;
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={entry.name}
              className="flex items-center gap-1.5 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSelect(isSelected ? null : entry.name)}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0 transition-transform"
                style={{
                  backgroundColor: sliceColor(i, entry.name),
                  transform: isSelected || isHovered ? "scale(1.3)" : "scale(1)",
                  opacity: selectedName != null && !isSelected ? 0.4 : 1,
                }}
              />
              <span
                className="text-xs max-w-[140px] truncate transition-colors"
                style={{
                  color: isSelected
                    ? sliceColor(i, entry.name)
                    : undefined,
                  fontWeight: isSelected ? 600 : undefined,
                  opacity: selectedName != null && !isSelected ? 0.5 : 1,
                }}
              >
                {entry.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NetTotal({
  transactions,
  rateToUAH,
}: {
  transactions: CategoryTransaction[];
  rateToUAH: (code: number) => number | null;
}) {
  const netUAH = transactions.reduce((sum, tx) => sum + txToUAH(tx, rateToUAH), 0);
  const spent = Math.max(0, -netUAH);

  return (
    <div className="flex justify-between items-center pt-3 border-t border-border font-medium">
      <span className="text-muted-foreground text-sm">Net spent</span>
      <span className="text-card-foreground">₴{spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}

function TransactionRow({
  tx,
  rateToUAH,
}: {
  tx: CategoryTransaction;
  rateToUAH: (code: number) => number | null;
}) {
  const isRefund = tx.amount > 0;
  const ownCurrency = tx.operationCurrency ?? tx.currency;
  const isCross = tx.operationAmount != null && tx.operationCurrency !== tx.currency;
  const isForeignAccount = !isCross && tx.currency !== UAH;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0 mr-4">
        <span className="text-sm text-card-foreground truncate">{tx.description}</span>
        <span className="text-xs text-muted-foreground">{formatDate(tx.time)}</span>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-sm font-medium ${isRefund ? "text-green-500" : "text-destructive"}`}>
          {formatAmount(tx.amount, ownCurrency)}
        </span>
        {isCross && (
          <p className="text-xs text-muted-foreground">
            {formatAmount(tx.operationAmount!, tx.currency)}
          </p>
        )}
        {isForeignAccount && (() => {
          const rate = rateToUAH(tx.currency);
          if (!rate) return null;
          return (
            <p className="text-xs text-muted-foreground">
              ≈{formatAmount(tx.amount * rate, UAH)}
            </p>
          );
        })()}
      </div>
    </div>
  );
}

export function CategoryTransactionsModal({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  dateRange,
  tripId,
}: CategoryTransactionsModalProps) {
  const [transactions, setTransactions] = useState<CategoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedSliceName, setSelectedSliceName] = useState<string | null>(null);
  const { rateToUAH, rates } = useExchangeRates();

  useEffect(() => {
    if (!open) {
      setShowChart(false);
      setSelectedSliceName(null);
      return;
    }

    setLoading(true);

    const fetch = tripId
      ? tripsApi.getTransactions(tripId, { from: dateRange.from, to: dateRange.to })
      : categoriesApi.getTransactions(categoryId, { from: dateRange.from, to: dateRange.to });

    fetch.then(setTransactions).finally(() => setLoading(false));
  }, [open, categoryId, tripId, dateRange.from, dateRange.to]);

  const chartData = useMemo(() => {
    const groups = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.amount < 0) {
        const amountInUAH = txToUAH(tx, rateToUAH);
        groups.set(tx.description, (groups.get(tx.description) ?? 0) + Math.abs(amountInUAH));
      }
    }
    const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_N).map(([name, value]) => ({ name, value }));
    const rest = sorted.slice(TOP_N);
    if (rest.length > 0) {
      top.push({ name: "Other", value: rest.reduce((s, [, v]) => s + v, 0) });
    }
    return top;
  }, [transactions, rateToUAH]);

  const selectedTransactions = useMemo(() => {
    if (!selectedSliceName) return [];
    if (selectedSliceName === "Other") {
      const namedSlices = new Set(chartData.filter((d) => d.name !== "Other").map((d) => d.name));
      return transactions.filter((tx) => tx.amount < 0 && !namedSlices.has(tx.description));
    }
    return transactions.filter((tx) => tx.description === selectedSliceName);
  }, [selectedSliceName, transactions, chartData]);

  // Collect distinct foreign currencies present in the list
  const foreignCurrencies = Array.from(
    new Set(transactions.filter((tx) => tx.currency !== UAH && tx.operationCurrency === tx.currency).map((tx) => tx.currency)),
  );

  const listContent = (
    <>
      {foreignCurrencies.length > 0 && rates.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {foreignCurrencies.map((code) => {
            const rate = rateToUAH(code);
            if (!rate) return null;
            return (
              <span key={code} className="text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
                1 {currencySymbolFromCode(code)} = ₴{rate.toFixed(2)} (today)
              </span>
            );
          })}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-center text-muted-foreground py-10 text-sm">
          No transactions for this period.
        </p>
      ) : (
        <div className="flex flex-col">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} rateToUAH={rateToUAH} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${showChart ? "sm:max-w-5xl" : "sm:max-w-md"} max-h-[80vh] flex flex-col transition-all duration-200`}>
        {/* Balcony chart toggle — sticks out from the left edge of the modal */}
        {!loading && transactions.length > 0 && (
          <button
            onClick={() => setShowChart((v) => !v)}
            title={showChart ? "Hide chart" : "Show chart"}
            className={[
              "absolute top-[52px] right-0 translate-x-full",
              "flex items-center justify-center w-9 h-10",
              "rounded-r-lg border border-l-0 border-border bg-background",
              "shadow-[3px_2px_8px_-2px_rgba(0,0,0,0.12)]",
              "transition-colors hover:bg-muted",
              showChart ? "text-primary" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${categoryColor}30`,
                border: `1px solid ${categoryColor}40`,
              }}
            >
              <span className="text-xl">{categoryIcon}</span>
            </div>
            <span>{categoryName}</span>
          </DialogTitle>
        </DialogHeader>

        {showChart ? (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row mt-2">
            <div className="min-h-0 shrink-0 overflow-y-auto md:w-[368px] md:pr-4 md:border-r md:border-border">
              {listContent}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto md:pl-5 pt-4 md:pt-0">
              {chartData.length > 0 ? (
                <>
                  <CategoryChart
                    data={chartData}
                    selectedName={selectedSliceName}
                    onSelect={setSelectedSliceName}
                  />
                  {selectedSliceName && selectedTransactions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground font-medium mb-2 truncate">
                        {selectedSliceName}
                      </p>
                      <div className="flex flex-col">
                        {selectedTransactions.map((tx) => (
                          <TransactionRow key={tx.id} tx={tx} rateToUAH={rateToUAH} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No expense data to chart.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mt-2">
            {listContent}
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <NetTotal transactions={transactions} rateToUAH={rateToUAH} />
        )}
      </DialogContent>
    </Dialog>
  );
}
