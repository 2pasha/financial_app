import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { IconPicker } from "./IconPicker";
import { Loader2 } from "lucide-react";
import { useAppSettings } from "../hooks/useAppSettings";

interface AddTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (trip: {
    name: string;
    icon: string;
    color: string;
    goalAmount: number;
    targetDate: string | null;
  }) => Promise<void>;
}

const DEFAULT_TRIP_ICON = "✈️";
const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
];

export function AddTripDialog({ open, onOpenChange, onCreated }: AddTripDialogProps) {
  const { t } = useAppSettings();
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_TRIP_ICON);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setGoalAmount("");
    setTargetDate("");
    setSelectedIcon(DEFAULT_TRIP_ICON);
    setSelectedColor(COLOR_OPTIONS[0]);
  };

  const handleSubmit = async () => {
    if (!name || !goalAmount) return;

    setLoading(true);
    try {
      await onCreated({
        name,
        icon: selectedIcon,
        color: selectedColor,
        goalAmount: parseFloat(goalAmount),
        targetDate: targetDate ? new Date(targetDate + "-01").toISOString() : null,
      });
      reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t.createNewTrip}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trip-name">{t.tripName}</Label>
            <Input
              id="trip-name"
              placeholder={t.tripNamePlaceholderAdd}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trip-goal">{t.plannedAmount}</Label>
            <Input
              id="trip-goal"
              type="number"
              min="1"
              placeholder={t.tripAmountPlaceholder}
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trip-date">{t.targetDate} <span className="text-muted-foreground font-normal">{t.optional}</span></Label>
            <Input
              id="trip-date"
              type="month"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.icon}</Label>
            <IconPicker value={selectedIcon} onChange={setSelectedIcon} t={t} />
          </div>
          <div className="space-y-2">
            <Label>{t.color}</Label>
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
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }} disabled={loading}>
            {t.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !goalAmount || loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.createTrip}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
