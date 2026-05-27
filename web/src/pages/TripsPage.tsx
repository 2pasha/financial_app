import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Loader2, Plus, Pencil, Menu } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { AddTripDialog } from "../components/AddTripDialog";
import { EditTripDialog } from "../components/EditTripDialog";
import { tripsApi } from "../lib/api-client";
import type { Trip } from "../lib/api-client";

function formatTargetDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(iso));
}

function getStoredCurrency(): string {
  try { return localStorage.getItem("currency") || "UAH"; } catch { return "UAH"; }
}

function formatAmount(value: number): string {
  const currency = getStoredCurrency();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

export default function TripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    tripsApi.getAll()
      .then(setTrips)
      .catch(() => toast.error("Failed to load trips"))
      .finally(() => setLoading(false));
  }, []);

  const handleTripSaved = (updated: Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTrip(null);
    toast.success("Trip updated");
  };

  const handleCreated = async (dto: {
    name: string; icon: string; color: string; goalAmount: number; targetDate: string | null;
  }) => {
    const created = await tripsApi.create(dto);
    setTrips((prev) => [created, ...prev]);
    toast.success("Trip created");
  };

  const totalGoal = trips.reduce((s, t) => s + t.goalAmount, 0);
  const totalSaved = trips.reduce((s, t) => s + t.collectedAmount, 0);
  const activeCount = trips.filter((t) => t.isActive).length;
  const completedCount = trips.filter((t) => !t.isActive || t.collectedAmount >= t.goalAmount).length;

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
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> New Trip
              </Button>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="Moneta" className="w-7 h-7 coin-logo cursor-pointer" onClick={() => navigate("/")} />
              <span className="font-semibold text-sm text-foreground">Moneta</span>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-4 h-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Trips &amp; Goals</h2>
            <p className="text-sm text-muted-foreground">{activeCount} active goal{activeCount !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-1">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Trip</span>
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard accent="#0D9488" label="Total Goal Amount" value={formatAmount(totalGoal)} />
          <StatCard accent="#43A047" label="Total Saved" value={formatAmount(totalSaved)} />
          <StatCard accent="#1E88E5" label="Active Trips" value={String(activeCount)} />
          <StatCard accent="#7E57C2" label="Completed" value={String(completedCount)} />
        </div>

        {/* Trips table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No trips yet</p>
            <p className="text-sm mb-4">Create your first trip to start tracking your savings goals.</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create New Trip
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_100px_100px_110px_95px_100px] gap-0 border-b border-border px-4 py-3">
              {["Trip Name", "Goal", "Saved", "Progress", "Status", "Target Date"].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            {trips.map((trip) => (
              <TripRow key={trip.id} trip={trip} onClick={() => navigate(`/trips/${trip.id}`)} onEdit={() => setEditingTrip(trip)} />
            ))}
          </div>
        )}
      </main>

      <AddTripDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onCreated={handleCreated} />
      <EditTripDialog open={editingTrip !== null} onOpenChange={(o) => { if (!o) setEditingTrip(null); }} trip={editingTrip} onSaved={handleTripSaved} />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-72 flex flex-col">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-4 px-2 flex-1">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Navigation</span>
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/"); setMobileMenuOpen(false); }}>Dashboard</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/"); setMobileMenuOpen(false); }}>Expenses</Button>
                <Button variant="default" className="w-full justify-start">Trips</Button>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-border flex items-center gap-3">
              <UserButton afterSignOutUrl="/sign-in" />
              <span className="text-sm text-foreground">Account</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ accent, label, value }: { accent: string; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col gap-1.5">
      <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-xs font-medium text-muted-foreground leading-tight">{label}</span>
      <span className="text-lg md:text-xl font-bold text-foreground">{value}</span>
    </div>
  );
}

function TripRow({ trip, onClick, onEdit }: { trip: Trip; onClick: () => void; onEdit: () => void }) {
  const pct = trip.goalAmount > 0 ? Math.min(100, Math.round((trip.collectedAmount / trip.goalAmount) * 100)) : 0;
  const isCompleted = !trip.isActive || trip.collectedAmount >= trip.goalAmount;

  return (
    <div
      onClick={onClick}
      className="group grid grid-cols-1 md:grid-cols-[1fr_100px_100px_110px_95px_100px] gap-1.5 md:gap-0 px-4 py-3.5 md:py-3 border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
    >
      {/* Trip name */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">{trip.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">{trip.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground md:hidden mt-0.5">
            <span style={{ color: "#43A047" }}>{formatAmount(trip.collectedAmount)}</span>
            {" / "}{formatAmount(trip.goalAmount)}
            {trip.targetDate && ` · ${formatTargetDate(trip.targetDate)}`}
          </p>
        </div>
      </div>
      {/* Goal */}
      <span className="text-sm text-muted-foreground hidden md:block self-center">
        {formatAmount(trip.goalAmount)}
      </span>
      {/* Saved */}
      <span className="text-sm font-medium hidden md:block self-center" style={{ color: "#43A047" }}>
        {formatAmount(trip.collectedAmount)}
      </span>
      {/* Progress */}
      <div className="hidden md:flex items-center gap-2 self-center">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: trip.color }} />
        </div>
        <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
      </div>
      {/* Mobile progress line */}
      <div className="flex md:hidden items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: trip.color }} />
        </div>
        <span>{pct}%</span>
        <StatusBadge completed={isCompleted} />
      </div>
      {/* Status */}
      <div className="hidden md:flex items-center self-center">
        <StatusBadge completed={isCompleted} />
      </div>
      {/* Target date */}
      <span className="text-xs text-muted-foreground hidden md:block self-center">
        {formatTargetDate(trip.targetDate)}
      </span>
    </div>
  );
}

function StatusBadge({ completed }: { completed: boolean }) {
  return completed ? (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#E8F5E9", color: "#2E7D32" }}>
      Completed
    </span>
  ) : (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#E3F2FD", color: "#1565C0" }}>
      Active
    </span>
  );
}
