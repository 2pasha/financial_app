import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { SiteHeader } from "../components/SiteHeader";
import { useAppSettings } from "../hooks/useAppSettings";
import { pluralize, type getTranslation } from "../lib/translations";
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
    return `${(value ?? 0).toLocaleString()} ${currency}`;
  }
}

export default function TripsPage() {
  const navigate = useNavigate();
  const { language, toggleLanguage, isDarkMode, toggleTheme, t } = useAppSettings();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  useEffect(() => {
    tripsApi.getAll()
      .then(setTrips)
      .catch(() => toast.error(t.loadTripsFailed))
      .finally(() => setLoading(false));
  }, []);

  const handleTripSaved = (updated: Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTrip(null);
    toast.success(t.tripUpdated);
  };

  const handleCreated = async (dto: {
    name: string; icon: string; color: string; goalAmount: number; targetDate: string | null;
  }) => {
    const created = await tripsApi.create(dto);
    setTrips((prev) => [created, ...prev]);
    toast.success(t.tripCreated);
  };

  const totalGoal = trips.reduce((s, t) => s + t.goalAmount, 0);
  const totalCollected = trips.reduce((s, t) => s + t.collectedAmount, 0);
  const totalSpent = trips.reduce((s, t) => s + t.spentAmount, 0);
  const activeCount = trips.filter((t) => t.isActive).length;
  const completedCount = trips.filter((t) => !t.isActive).length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        t={t}
        language={language}
        isDarkMode={isDarkMode}
        onToggleLanguage={toggleLanguage}
        onToggleTheme={toggleTheme}
        activeView="trips"
      />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.tripsTitle}</h2>
            <p className="text-sm text-muted-foreground">{activeCount} {pluralize(language, activeCount, [t.activeGoalOne, t.activeGoalFew, t.activeGoalMany])}</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-1">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.createNewTrip}</span>
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard accent="#0D9488" label={t.totalPlanned} value={formatAmount(totalGoal)} />
          <StatCard accent="#43A047" label={t.totalCollected} value={formatAmount(totalCollected)} />
          <StatCard accent="#E53935" label={t.totalSpentLabel} value={formatAmount(totalSpent)} />
          <StatCard accent="#1E88E5" label={t.activeTrips} value={String(activeCount)} />
        </div>

        <TripsTip t={t} />

        {/* Trips table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-2">{t.noTripsYet}</p>
            <p className="text-sm mb-4">{t.noTripsBody}</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> {t.createNewTrip}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_90px_100px_120px_90px_90px] gap-x-4 border-b border-border px-5 py-3">
              {[t.tripName, t.tripGoal, t.collected, t.tripProgress, t.tripStatus, t.targetDate].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            {trips.map((trip) => (
              <TripRow key={trip.id} trip={trip} t={t} onClick={() => navigate(`/trips/${trip.id}`)} onEdit={() => setEditingTrip(trip)} />
            ))}
          </div>
        )}
      </main>

      <AddTripDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onCreated={handleCreated} />
      <EditTripDialog open={editingTrip !== null} onOpenChange={(o) => { if (!o) setEditingTrip(null); }} trip={editingTrip} onSaved={handleTripSaved} />
    </div>
  );
}

function TripsTip({ t }: { t: ReturnType<typeof getTranslation> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>💡</span> {t.tripsTipTitle}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-muted-foreground border-t border-border pt-3">
          <p>
            {t.tripsTipIntroA} <strong className="text-foreground">{t.tripsTipIntroAnd}</strong> {t.tripsTipIntroB}
          </p>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{t.tripsTipTagTitle}</p>
            <ul className="space-y-1 list-none">
              <li className="flex gap-2"><span className="text-green-600 shrink-0">+</span>{t.tripsTipTagSavings} <strong className="text-foreground">{t.collected}</strong></li>
              <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>{t.tripsTipTagPurchases} <strong className="text-foreground">{t.totalSpentLabel}</strong></li>
              <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>{t.tripsTipTagDirect}</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{t.tripsTipDontTitle}</p>
            <ul className="space-y-1 list-none">
              <li className="flex gap-2"><span className="text-muted-foreground shrink-0">−</span>{t.tripsTipDontWithdrawals}</li>
              <li className="flex gap-2"><span className="text-muted-foreground shrink-0">−</span>{t.tripsTipDontTopups}</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{t.tripsTipNumbersTitle}</p>
            <ul className="space-y-1 list-none">
              <li className="flex gap-2"><span className="font-semibold text-green-600 shrink-0">{t.collected}</span> {t.tripsTipCollected}</li>
              <li className="flex gap-2"><span className="font-semibold text-red-500 shrink-0">{t.totalSpentLabel}</span> {t.tripsTipSpent}</li>
              <li className="flex gap-2"><span className="font-semibold text-blue-600 shrink-0">{t.available}</span> {t.tripsTipAvailable}</li>
            </ul>
            <p className="pt-1">{t.tripsTipProgressA} <span className="text-red-500 font-medium">{t.tripsTipProgressRed}</span> {t.tripsTipProgressB} <span className="text-green-600 font-medium">{t.tripsTipProgressGreen}</span> {t.tripsTipProgressC}</p>
          </div>
        </div>
      )}
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

function TripRow({ trip, t, onClick, onEdit }: { trip: Trip; t: ReturnType<typeof getTranslation>; onClick: () => void; onEdit: () => void }) {
  const collectedPct = trip.goalAmount > 0 ? Math.min(100, Math.round((trip.collectedAmount / trip.goalAmount) * 100)) : 0;
  const spentPct = trip.goalAmount > 0 ? Math.min(collectedPct, Math.round((trip.spentAmount / trip.goalAmount) * 100)) : 0;
  const isCompleted = !trip.isActive;

  return (
    <div
      onClick={onClick}
      className="group grid grid-cols-1 md:grid-cols-[1fr_90px_100px_120px_90px_90px] gap-y-1.5 md:gap-y-0 gap-x-4 px-5 py-3.5 md:py-3 border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
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
            {` ${t.collectedLower} · `}
            <span style={{ color: "#E53935" }}>{formatAmount(trip.spentAmount)}</span>
            {` ${t.spentLower}`}
            {trip.targetDate && ` · ${formatTargetDate(trip.targetDate)}`}
          </p>
        </div>
      </div>
      {/* Goal */}
      <span className="text-sm text-muted-foreground hidden md:block self-center">
        {formatAmount(trip.goalAmount)}
      </span>
      {/* Collected */}
      <span className="text-sm font-medium hidden md:block self-center" style={{ color: "#43A047" }}>
        {formatAmount(trip.collectedAmount)}
      </span>
      {/* Progress — stacked: spent (dark) + available (light) against goal */}
      <div className="hidden md:flex items-center gap-2 self-center">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex">
          <div className="h-full transition-all" style={{ width: `${spentPct}%`, backgroundColor: "#E53935" }} />
          <div className="h-full transition-all" style={{ width: `${collectedPct - spentPct}%`, backgroundColor: trip.color }} />
        </div>
        <span className="text-xs text-muted-foreground w-7 text-right">{collectedPct}%</span>
      </div>
      {/* Mobile progress line */}
      <div className="flex md:hidden items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex">
          <div className="h-full" style={{ width: `${spentPct}%`, backgroundColor: "#E53935" }} />
          <div className="h-full" style={{ width: `${collectedPct - spentPct}%`, backgroundColor: trip.color }} />
        </div>
        <span>{collectedPct}%</span>
        <StatusBadge completed={isCompleted} t={t} />
      </div>
      {/* Status */}
      <div className="hidden md:flex items-center self-center">
        <StatusBadge completed={isCompleted} t={t} />
      </div>
      {/* Target date */}
      <span className="text-xs text-muted-foreground hidden md:block self-center">
        {formatTargetDate(trip.targetDate)}
      </span>
    </div>
  );
}

function StatusBadge({ completed, t }: { completed: boolean; t: ReturnType<typeof getTranslation> }) {
  return completed ? (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#E8F5E9", color: "#2E7D32" }}>
      {t.completedLabel}
    </span>
  ) : (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#E3F2FD", color: "#1565C0" }}>
      {t.activeLabel}
    </span>
  );
}
