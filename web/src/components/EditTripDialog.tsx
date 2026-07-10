import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { IconPicker } from "./IconPicker";
import { Loader2 } from "lucide-react";
import type { Trip } from "../lib/api-client";

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  onSaved: (updated: Trip) => void;
}

const DEFAULT_TRIP_ICON = "✈️";
const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
];

function isoToMonthInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function EditTripDialog({ open, onOpenChange, trip, onSaved }: EditTripDialogProps) {
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_TRIP_ICON);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trip) {
      setName(trip.name);
      setGoalAmount(String(trip.goalAmount));
      setTargetDate(isoToMonthInput(trip.targetDate));
      setIsActive(trip.isActive);
      setSelectedIcon(trip.icon);
      setSelectedColor(trip.color);
    }
  }, [trip]);

  if (!trip) return null;

  const handleSubmit = async () => {
    if (!name || !goalAmount) return;
    setLoading(true);
    try {
      const { tripsApi } = await import("../lib/api-client");
      const updated = await tripsApi.update(trip.id, {
        name,
        icon: selectedIcon,
        color: selectedColor,
        goalAmount: parseFloat(goalAmount),
        targetDate: targetDate ? new Date(targetDate + "-01").toISOString() : null,
        isActive,
      });
      onSaved(updated);
      onOpenChange(false);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Failed to save trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-trip-name">Trip Name</Label>
            <Input
              id="edit-trip-name"
              placeholder="e.g. Japan 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-trip-goal">Planned Amount</Label>
            <Input
              id="edit-trip-goal"
              type="number"
              min="1"
              placeholder="e.g. 3000"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-trip-date">Target Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="edit-trip-date"
              type="month"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="edit-trip-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <div>
              <Label htmlFor="edit-trip-active" className="cursor-pointer">Active</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Uncheck to mark this trip as completed</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color ? "border-primary scale-110" : "border-border hover:border-primary/50"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !goalAmount || loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
