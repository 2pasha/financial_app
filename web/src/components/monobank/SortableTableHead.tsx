import { TableHead } from "../ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "../ui/button";

interface SortableTableHeadProps {
  column: string;
  label: string;
  currentSort: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export function SortableTableHead({
  column,
  label,
  currentSort,
  sortDirection,
  onSort,
}: SortableTableHeadProps) {
  const isActive = currentSort === column;

  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowDown className="ml-2 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    </TableHead>
  );
}
