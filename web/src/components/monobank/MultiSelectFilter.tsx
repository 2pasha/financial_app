import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

interface MultiSelectFilterProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-xs"
        >
          {selected.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              <Badge variant="secondary" className="text-xs px-1">
                {selected.length} selected
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="max-h-[300px] overflow-auto">
          {selected.length > 0 && (
            <div className="flex items-center justify-between p-2 border-b">
              <span className="text-sm font-medium">{selected.length} selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleOption(option.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer",
                  selected.includes(option.value) && "bg-accent"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 border rounded flex items-center justify-center",
                    selected.includes(option.value)
                      ? "bg-primary border-primary"
                      : "border-input"
                  )}
                >
                  {selected.includes(option.value) && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
