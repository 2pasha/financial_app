import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "lucide-react";

export interface DateRangeValue {
  from: string | null;
  to: string | null;
}

interface DateRangeFilterProps {
  filter: DateRangeValue;
  onChange: (filter: DateRangeValue) => void;
}

export function DateRangeFilter({ filter, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const handleFromChange = (value: string) => {
    onChange({ ...filter, from: value || null });
  };

  const handleToChange = (value: string) => {
    onChange({ ...filter, to: value || null });
  };

  const handleClear = () => {
    onChange({ from: null, to: null });
    setOpen(false);
  };

  const isActive = filter.from !== null || filter.to !== null;

  const formatDisplayDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="h-8 w-full justify-start text-xs"
        >
          <Calendar className="mr-2 h-3 w-3" />
          {isActive ? (
            <span className="truncate">
              {filter.from ? formatDisplayDate(filter.from) : '...'} - {filter.to ? formatDisplayDate(filter.to) : '...'}
            </span>
          ) : (
            <span className="text-muted-foreground">Filter date...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px]" align="start">
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Input
              type="date"
              value={filter.from || ''}
              onChange={(e) => handleFromChange(e.target.value)}
              className="h-8"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Input
              type="date"
              value={filter.to || ''}
              onChange={(e) => handleToChange(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
