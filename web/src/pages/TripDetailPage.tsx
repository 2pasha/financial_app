import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { ArrowLeft, Loader2, Plus, X, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EditTripDialog } from "../components/EditTripDialog";
import { tripsApi } from "../lib/api-client";
import type { TripDetail, TripPlannedItem, Trip } from "../lib/api-client";

function getStoredCurrency(): string {
  try { return localStorage.getItem("currency") || "UAH"; } catch { return "UAH"; }
}

function formatAmount(value: number, signed = false): string {
  const currency = getStoredCurrency();
  try {
    const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2 });
    if (signed && value > 0) return "+" + fmt.format(value);
    return fmt.format(value);
  } catch {
    const prefix = signed && value > 0 ? "+" : "";
    return `${prefix}${value.toLocaleString()} ${currency}`;
  }
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

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

export default function TripDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllTx, setShowAllTx] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    tripsApi.getOne(id)
      .then(setTrip)
      .catch(() => toast.error("Failed to load trip"))
      .finally(() => setLoading(false));
  }, [id]);

  const pct = trip ? Math.min(100, Math.round((trip.collectedAmount / trip.goalAmount) * 100)) : 0;
  const remaining = trip ? Math.max(0, trip.goalAmount - trip.collectedAmount) : 0;
  const isCompleted = trip ? (!trip.isActive || trip.collectedAmount >= trip.goalAmount) : false;

  const now = new Date();
  const thisMonthAmount = trip?.transactions
    .filter((tx) => tx.amount > 0 && new Date(tx.time).getMonth() === now.getMonth() && new Date(tx.time).getFullYear() === now.getFullYear())
    .reduce((s, tx) => s + tx.amount / 100, 0) ?? 0;

  const displayedTx = trip ? (showAllTx ? trip.transactions : trip.transactions.slice(0, 5)) : [];

  const handleToggleItem = async (item: TripPlannedItem) => {
    if (!trip || togglingItem) return;
    setTogglingItem(item.id);
    const updated = { ...item, completed: !item.completed };
    setTrip((prev) => prev ? { ...prev, plannedItems: prev.plannedItems.map((i) => i.id === item.id ? updated : i) } : prev);
    try {
      await tripsApi.updateItem(trip.id, item.id, { completed: !item.completed });
    } catch {
      setTrip((prev) => prev ? { ...prev, plannedItems: prev.plannedItems.map((i) => i.id === item.id ? item : i) } : prev);
      toast.error("Failed to update item");
    } finally {
      setTogglingItem(null);
    }
  };

  const handleAddItem = async () => {
    if (!trip || !newItemText.trim()) return;
    setAddingItem(true);
    try {
      const item = await tripsApi.addItem(trip.id, { text: newItemText.trim() });
      setTrip((prev) => prev ? { ...prev, plannedItems: [...prev.plannedItems, item] } : prev);
      setNewItemText("");
    } catch {
      toast.error("Failed to add item");
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (item: TripPlannedItem) => {
    if (!trip) return;
    setDeletingItem(item.id);
    setTrip((prev) => prev ? { ...prev, plannedItems: prev.plannedItems.filter((i) => i.id !== item.id) } : prev);
    try {
      await tripsApi.removeItem(trip.id, item.id);
    } catch {
      setTrip((prev) => prev ? { ...prev, plannedItems: [...(prev?.plannedItems ?? []), item] } : prev);
      toast.error("Failed to delete item");
    } finally {
      setDeletingItem(null);
    }
  };

  const handleTripSaved = (updated: Trip) => {
    setTrip((prev) => prev ? { ...prev, ...updated } : prev);
    toast.success("Trip updated");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Trip not found.</p>
        <Button variant="outline" onClick={() => navigate("/trips")}>Back to Trips</Button>
      </div>
    );
  }

  const completedItems = trip.plannedItems.filter((i) => i.completed).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="Moneta" className="w-8 h-8 coin-logo cursor-pointer" onClick={() => navigate("/")} />
              <h1 className="font-semibold text-foreground">Moneta</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/")}>Dashboard</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Expenses</Button>
              <Button variant="default" onClick={() => navigate("/trips")}>Trips</Button>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="Moneta" className="w-7 h-7 coin-logo cursor-pointer" onClick={() => navigate("/")} />
              <span className="font-semibold text-sm text-foreground">Moneta</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => navigate("/trips")}>← Trips</Button>
              <Button variant="default" size="sm" className="h-8 px-3 text-xs">Trips</Button>
            </div>
          </div>
        </div>
      </header>

      <EditTripDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        trip={trip}
        onSaved={handleTripSaved}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Back + title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button onClick={() => navigate("/trips")} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{trip.icon} {trip.name}</h2>
              {trip.targetDate && (
                <p className="text-sm text-muted-foreground">
                  Target: {new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(trip.targetDate))}
                  {" · "}{trip.isActive ? "Active" : "Inactive"}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            {isCompleted ? (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: "#E8F5E9", color: "#2E7D32" }}>Completed</span>
            ) : (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: pct >= 80 ? "#E8F5E9" : "#E3F2FD", color: pct >= 80 ? "#2E7D32" : "#1565C0" }}>
                {pct >= 80 ? "On Track" : "Active"}
              </span>
            )}
          </div>
        </div>

        {/* Progress section */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">
              {formatAmount(trip.collectedAmount)} saved
            </span>
            <span className="text-sm text-muted-foreground">of {formatAmount(trip.goalAmount)} goal</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#F0F0F0" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: "#2E7D32" }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium" style={{ color: "#2E7D32" }}>{pct}% complete</span>
            <span className="text-muted-foreground">{formatAmount(remaining)} remaining</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="bg-card border border-border rounded-xl p-3 md:p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground leading-tight block">Goal Amount</span>
            <p className="text-sm md:text-lg font-bold leading-tight" style={{ color: "#1565C0" }}>{formatAmount(trip.goalAmount)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 md:p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground leading-tight block">Amount Saved</span>
            <p className="text-sm md:text-lg font-bold leading-tight" style={{ color: "#2E7D32" }}>{formatAmount(trip.collectedAmount)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 md:p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground leading-tight block">This Month</span>
            <p className="text-sm md:text-lg font-bold leading-tight" style={{ color: "#2E7D32" }}>{formatAmount(thisMonthAmount, true)}</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Recent Transactions</h3>
            {trip.transactions.length > 5 && (
              <button
                onClick={() => setShowAllTx((v) => !v)}
                className="text-xs font-medium transition-colors"
                style={{ color: "#1565C0" }}
              >
                {showAllTx ? "Show Less" : "View All →"}
              </button>
            )}
          </div>
          {/* Column headers — desktop only */}
          <div className="hidden md:grid grid-cols-[1fr_110px_140px] px-5 py-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground">Description</span>
            <span className="text-xs font-semibold text-muted-foreground text-right">Date</span>
            <span className="text-xs font-semibold text-muted-foreground text-right">Amount</span>
          </div>
          {displayedTx.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions assigned to this trip yet.</p>
          ) : (
            displayedTx.map((tx) => (
              <div key={tx.id} className="border-b border-border last:border-0">
                {/* Mobile row */}
                <div className="md:hidden flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tx.category && `${tx.category.icon} ${tx.category.name} · `}
                      {formatDate(tx.time)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="text-sm font-semibold whitespace-nowrap"
                      style={{ color: tx.amount >= 0 ? "#2E7D32" : "#E53935" }}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {currencySymbolFromCode(tx.operationCurrency ?? tx.currency)}
                      {Math.abs(tx.amount / 100).toLocaleString()}
                    </span>
                    {tx.operationAmount != null && tx.operationCurrency !== tx.currency && (
                      <p className="text-xs text-muted-foreground">
                        {tx.operationAmount > 0 ? "+" : ""}
                        {currencySymbolFromCode(tx.currency)}
                        {Math.abs(tx.operationAmount / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[1fr_110px_140px] px-5 py-3 items-center">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">{tx.description}</p>
                    {tx.category && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.category.icon} {tx.category.name}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground text-right self-center whitespace-nowrap">{formatDate(tx.time)}</span>
                  <div className="text-right self-center">
                    <span
                      className="text-sm font-semibold whitespace-nowrap"
                      style={{ color: tx.amount >= 0 ? "#2E7D32" : "#E53935" }}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {currencySymbolFromCode(tx.operationCurrency ?? tx.currency)}
                      {Math.abs(tx.amount / 100).toLocaleString()}
                    </span>
                    {tx.operationAmount != null && tx.operationCurrency !== tx.currency && (
                      <p className="text-xs text-muted-foreground">
                        {tx.operationAmount > 0 ? "+" : ""}
                        {currencySymbolFromCode(tx.currency)}
                        {Math.abs(tx.operationAmount / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Planned Expenses */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Planned Expenses</h3>
            <button
              onClick={() => { setNewItemText(" "); setTimeout(() => { setNewItemText(""); inputRef.current?.focus(); }, 0); }}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          <div className="divide-y divide-border">
            {trip.plannedItems.map((item) => (
              <PlannedItem
                key={item.id}
                item={item}
                toggling={togglingItem === item.id}
                deleting={deletingItem === item.id}
                onToggle={() => handleToggleItem(item)}
                onDelete={() => handleDeleteItem(item)}
              />
            ))}

            {/* Add item input */}
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded shrink-0 border-2 border-dashed border-muted-foreground/40" />
              <Input
                ref={inputRef}
                placeholder="Add a planned expense…"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                className="flex-1 h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent placeholder:text-muted-foreground/50"
              />
              {newItemText.trim() && (
                <button
                  onClick={handleAddItem}
                  disabled={addingItem}
                  className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {addingItem ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* Footer count */}
          {trip.plannedItems.length > 0 && (
            <div className="px-5 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{completedItems} of {trip.plannedItems.length} completed</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PlannedItem({
  item, toggling, deleting, onToggle, onDelete,
}: {
  item: TripPlannedItem;
  toggling: boolean;
  deleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 px-5 py-2.5 group transition-colors"
      style={{ backgroundColor: item.completed ? "#FAFAFA" : undefined, opacity: deleting ? 0.4 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onToggle}
        disabled={toggling}
        className="shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all"
        style={{
          backgroundColor: item.completed ? "#2E7D32" : "#FFFFFF",
          borderColor: item.completed ? "#2E7D32" : "#CCCCCC",
        }}
      >
        {item.completed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        {toggling && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      </button>
      <span
        className="flex-1 text-sm"
        style={{
          color: item.completed ? "#AAAAAA" : "#1A1A1A",
          textDecoration: item.completed ? "line-through" : "none",
        }}
      >
        {item.text}
      </span>
      {hovered && !deleting && (
        <button onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
