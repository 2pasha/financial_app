import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Trash2 } from "lucide-react";
import type { IncomeItem } from "../lib/api-client";

interface IncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: IncomeItem[];
  onAdd: (data: { source: string; amount: number }) => Promise<void>;
  onUpdate: (id: string, data: { source?: string; amount?: number }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  translations: Record<string, string>;
}

export function IncomeDialog({
  open,
  onOpenChange,
  items,
  onAdd,
  onUpdate,
  onRemove,
  translations,
}: IncomeDialogProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAdd = async () => {
    if (!newSource.trim()) {
      return;
    }

    setAdding(true);

    try {
      await onAdd({ source: newSource.trim(), amount: Number(newAmount) || 0 });
      setNewSource('');
      setNewAmount('');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateSource = async (id: string, source: string) => {
    setLoadingId(id);

    try {
      await onUpdate(id, { source });
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpdateAmount = async (id: string, amount: string) => {
    setLoadingId(id);

    try {
      await onUpdate(id, { amount: Number(amount) || 0 });
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    setLoadingId(id);

    try {
      await onRemove(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{translations.manageIncomes}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div className="sm:col-span-3">
                <Label>{translations.incomeSource}</Label>
                <Input
                  defaultValue={item.source}
                  onBlur={(e) => {
                    if (e.target.value !== item.source) {
                      handleUpdateSource(item.id, e.target.value);
                    }
                  }}
                  disabled={loadingId === item.id}
                />
              </div>
              <div className="sm:col-span-1">
                <Label>{translations.incomeAmount}</Label>
                <Input
                  type="number"
                  defaultValue={item.amount || ''}
                  onBlur={(e) => {
                    if (Number(e.target.value) !== item.amount) {
                      handleUpdateAmount(item.id, e.target.value);
                    }
                  }}
                  disabled={loadingId === item.id}
                />
              </div>
              <div className="sm:col-span-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemove(item.id)}
                  disabled={loadingId === item.id}
                  className="w-full"
                >
                  {loadingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">{translations.addIncome}</p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div className="sm:col-span-3">
                <Label>{translations.incomeSource}</Label>
                <Input
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="Salary, Freelance..."
                  disabled={adding}
                />
              </div>
              <div className="sm:col-span-1">
                <Label>{translations.incomeAmount}</Label>
                <Input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  disabled={adding}
                />
              </div>
              <div className="sm:col-span-1">
                <Button
                  variant="secondary"
                  onClick={handleAdd}
                  disabled={adding || !newSource.trim()}
                  className="w-full"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : '+'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{translations.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
