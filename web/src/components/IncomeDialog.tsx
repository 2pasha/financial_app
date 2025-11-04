import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface IncomeItem {
  id: string;
  source: string;
  amount: number;
}

interface IncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (items: IncomeItem[]) => void;
  translations: Record<string, string>;
}

export function IncomeDialog({ open, onOpenChange, onConfirm, translations }: IncomeDialogProps) {
  const [items, setItems] = useState<IncomeItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('incomeItems');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('incomeItems', JSON.stringify(items));
  }, [items]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), source: "", amount: 0 }]);
  };

  const updateItem = (id: string, field: 'source' | 'amount', value: string) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: field === 'amount' ? Number(value) || 0 : value } : it));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handleConfirm = () => {
    onConfirm(items);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translations.manageIncomes}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div className="sm:col-span-3">
                <Label>{translations.incomeSource}</Label>
                <Input value={item.source} onChange={e => updateItem(item.id, 'source', e.target.value)} placeholder="Salary, Freelance..." />
              </div>
              <div className="sm:col-span-2">
                <Label>{translations.incomeAmount}</Label>
                <Input type="number" value={item.amount || ''} onChange={e => updateItem(item.id, 'amount', e.target.value)} />
              </div>
              <div>
                <Button variant="outline" onClick={() => removeItem(item.id)} className="w-full">{translations.delete}</Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={addItem}>{translations.addIncome}</Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{translations.cancel}</Button>
          <Button onClick={handleConfirm}>{translations.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


