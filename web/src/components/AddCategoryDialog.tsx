import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (category: {
    name: string;
    budget: number;
    icon: string;
    color: string;
    excludeFromDashboard: boolean;
  }) => void;
  translations: {
    addNewCategory: string;
    categoryName: string;
    budgetAmount: string;
    icon: string;
    color: string;
    cancel: string;
    addCategory: string;
    placeholderCategoryName: string;
    placeholderBudget: string;
    excludeFromDashboard: string;
    excludeFromDashboardHint: string;
  };
}

const ICON_OPTIONS = ["🛒", "🏠", "🚗", "💊", "🎬", "👕", "🍔", "✈️", "📚", "💰"];
const COLOR_OPTIONS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4"
];

export function AddCategoryDialog({ open, onOpenChange, onAdd, translations }: AddCategoryDialogProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [excludeFromDashboard, setExcludeFromDashboard] = useState(false);

  const handleSubmit = () => {
    if (name && budget) {
      onAdd({
        name,
        budget: parseFloat(budget),
        icon: selectedIcon,
        color: selectedColor,
        excludeFromDashboard,
      });
      setName("");
      setBudget("");
      setSelectedIcon(ICON_OPTIONS[0]);
      setSelectedColor(COLOR_OPTIONS[0]);
      setExcludeFromDashboard(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{translations.addNewCategory}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{translations.categoryName}</Label>
            <Input
              id="name"
              placeholder={translations.placeholderCategoryName}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">{translations.budgetAmount}</Label>
            <Input
              id="budget"
              type="number"
              placeholder={translations.placeholderBudget}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{translations.icon}</Label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedIcon === icon
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{translations.color}</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? "border-primary scale-110"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
          <div className="flex items-start gap-3 pt-1">
            <input
              id="add-exclude-dashboard"
              type="checkbox"
              checked={excludeFromDashboard}
              onChange={(e) => setExcludeFromDashboard(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <div>
              <Label htmlFor="add-exclude-dashboard" className="cursor-pointer">
                {translations.excludeFromDashboard}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {translations.excludeFromDashboardHint}
              </p>
            </div>
          </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translations.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !budget}>
            {translations.addCategory}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
