import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (category: {
    id: string;
    name: string;
    spent: number;
    budget: number;
    icon: string;
    color: string;
  }) => void;
  category: {
    id: string;
    name: string;
    spent: number;
    budget: number;
    icon: string;
    color: string;
  } | null;
  translations: {
    editCategory: string;
    categoryName: string;
    budgetAmount: string;
    spentAmount: string;
    icon: string;
    color: string;
    cancel: string;
    saveChanges: string;
    placeholderCategoryName: string;
    placeholderBudget: string;
    placeholderSpent: string;
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

export function EditCategoryDialog({ open, onOpenChange, onSave, category, translations }: EditCategoryDialogProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [spent, setSpent] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setBudget(category.budget.toString());
      setSpent(category.spent.toString());
      setSelectedIcon(category.icon);
      setSelectedColor(category.color);
    }
  }, [category]);

  const handleSubmit = () => {
    if (name && budget && spent && category) {
      onSave({
        id: category.id,
        name,
        budget: parseFloat(budget),
        spent: parseFloat(spent),
        icon: selectedIcon,
        color: selectedColor
      });
      onOpenChange(false);
    }
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translations.editCategory}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{translations.categoryName}</Label>
            <Input
              id="edit-name"
              placeholder={translations.placeholderCategoryName}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-budget">{translations.budgetAmount}</Label>
            <Input
              id="edit-budget"
              type="number"
              placeholder={translations.placeholderBudget}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-spent">{translations.spentAmount}</Label>
            <Input
              id="edit-spent"
              type="number"
              placeholder={translations.placeholderSpent}
              value={spent}
              onChange={(e) => setSpent(e.target.value)}
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translations.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !budget || !spent}>
            {translations.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
