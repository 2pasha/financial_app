import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Filter } from "lucide-react";
import { type getTranslation } from "../../lib/translations";

export type AmountFilterMode = 'greater' | 'less' | 'equal' | null;

export interface AmountFilterValue {
  mode: AmountFilterMode;
  value: number | null;
}

interface AmountFilterProps {
  filter: AmountFilterValue;
  onChange: (filter: AmountFilterValue) => void;
  t: ReturnType<typeof getTranslation>;
}

export function AmountFilter({ filter, onChange, t }: AmountFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(filter.value?.toString() || '');

  const modes = [
    { id: 'greater' as const, label: t.greaterThan, symbol: '>' },
    { id: 'less' as const, label: t.lessThan, symbol: '<' },
    { id: 'equal' as const, label: t.equalTo, symbol: '=' },
  ];

  const handleModeChange = (mode: AmountFilterMode) => {
    onChange({ mode, value: filter.value });
  };

  const handleValueChange = (value: string) => {
    setLocalValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ mode: filter.mode, value: numValue });
    } else if (value === '') {
      onChange({ mode: filter.mode, value: null });
    }
  };

  const handleClear = () => {
    setLocalValue('');
    onChange({ mode: null, value: null });
    setOpen(false);
  };

  const isActive = filter.mode !== null && filter.value !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="h-8 w-full justify-start text-xs"
        >
          <Filter className="mr-2 h-3 w-3" />
          {isActive ? (
            <span>
              {modes.find(m => m.id === filter.mode)?.symbol} {filter.value}
            </span>
          ) : (
            <span className="text-muted-foreground">{t.filterAmount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px]" align="start">
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.comparison}</label>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((mode) => (
                <Button
                  key={mode.id}
                  variant={filter.mode === mode.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange(mode.id)}
                  className="text-xs"
                >
                  {mode.symbol}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.amountLabel}</label>
            <Input
              type="number"
              placeholder={t.enterAmount}
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="h-8"
              min="0"
              step="0.01"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              {t.clear}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
