import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

interface CategoryCardProps {
  id: string;
  name: string;
  spent: number;
  net: number;
  budget: number;
  icon: string;
  color: string;
  /** When true, displays the signed net amount instead of spent, with red/green coloring */
  showNet?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
  translations: {
    remaining: string;
    used: string;
    edit: string;
    delete: string;
    spent: string;
    left: string;
    over: string;
    noBudgetSet: string;
  };
}

export function CategoryCard({ id, name, spent, net, budget, icon, color, showNet, onEdit, onDelete, onClick, translations }: CategoryCardProps) {
  const hasBudget = budget > 0;
  const percentage = hasBudget ? (spent / budget) * 100 : 0;
  const isOverBudget = hasBudget && spent > budget;
  const hasMenu = Boolean(onEdit || onDelete);

  const menu = hasMenu && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 overflow-hidden opacity-0 max-w-0 ml-0 group-hover:opacity-100 group-hover:max-w-7 group-hover:ml-1 data-[state=open]:opacity-100 data-[state=open]:max-w-7 data-[state=open]:ml-1 transition-all duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 z-[60]"
        onClick={(e) => e.stopPropagation()}
      >
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(id)} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            {translations.edit}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(id)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {translations.delete}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const iconBox = (
    <div
      className="w-[32px] h-[32px] rounded-lg flex items-center justify-center shrink-0"
      style={{
        backgroundColor: `${color}30`,
        border: `1px solid ${color}40`,
      }}
    >
      <span className="text-base leading-none">{icon}</span>
    </div>
  );

  // "Unplanned spending" net cards: signed +/- amount, no budget/progress bar.
  if (showNet) {
    const isCredit = net > 0;
    const isExpense = net < 0;
    const displayValue = Math.abs(net).toLocaleString();
    const netEl = isExpense
      ? <span className="text-destructive">−₴{displayValue}</span>
      : isCredit
        ? <span className="text-green-500">+₴{displayValue}</span>
        : <span className="text-muted-foreground">₴0</span>;

    return (
      <div
        className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-all hover:border-primary/30 group cursor-pointer"
        onClick={() => onClick?.(id)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {iconBox}
            <div className="min-w-0">
              <h3 className="text-sm text-card-foreground truncate">{name}</h3>
              <p className="text-xs">{netEl}</p>
            </div>
          </div>
          {menu}
        </div>
      </div>
    );
  }

  // Budgeted compact card: severity drives the primary ₴ amount color + bar treatment.
  const severity: 'none' | 'ok' | 'warn' | 'overMild' | 'overExtreme' = !hasBudget
    ? 'none'
    : percentage <= 90
      ? 'ok'
      : percentage <= 100
        ? 'warn'
        : percentage <= 200
          ? 'overMild'
          : 'overExtreme';

  const amountColor = {
    ok: 'text-green-600',
    warn: 'text-amber-600',
    overMild: 'text-red-500',
    overExtreme: 'text-red-700',
    none: 'text-muted-foreground',
  }[severity];

  // 0–100% portion: green under budget, amber at/near the limit.
  const baseFillClass = severity === 'ok' ? 'bg-green-500' : 'bg-amber-500';

  // Overflow cap past 100%: length scales subtly with overage (capped so it never dominates),
  // muted red for 100–200%, intense red for >200%.
  const overflowWidth = isOverBudget ? Math.min(6 + (percentage - 100) * 0.08, 24) : 0;
  const stripeBg = severity === 'overExtreme' ? '#b91c1c' : '#f87171';

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-all hover:border-primary/30 group cursor-pointer"
      onClick={() => onClick?.(id)}
    >
      {/* Row 1: icon + name, primary ₴ amount (colored) + muted % + hover menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {iconBox}
          <h3 className="text-sm text-card-foreground truncate">{name}</h3>
        </div>
        <div className="flex items-start shrink-0">
          <div className="flex flex-col items-end leading-tight">
            {severity === 'none' ? (
              <span className="text-sm font-medium text-muted-foreground">{translations.noBudgetSet}</span>
            ) : (
              <>
                <span className={`text-sm font-bold whitespace-nowrap ${amountColor}`}>
                  ₴{(isOverBudget ? spent - budget : budget - spent).toLocaleString()}
                  <span className="text-[11px] font-medium ml-0.5">
                    {isOverBudget ? translations.over : translations.left}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">({percentage.toFixed(0)}%)</span>
              </>
            )}
          </div>
          {menu}
        </div>
      </div>

      {/* Row 2: bar capped at 100% + striped overflow cap when over budget */}
      <div className="flex items-center gap-1 mb-2">
        <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-muted">
          <div
            className={`h-full rounded-full transition-all ${baseFillClass}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {isOverBudget && (
          <div
            className="h-2 rounded-sm shrink-0"
            aria-hidden
            style={{
              width: `${overflowWidth}px`,
              backgroundColor: stripeBg,
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.45) 0 2px, transparent 2px 4px)',
            }}
          />
        )}
      </div>

      {/* Row 3: spent line */}
      <div className="text-xs text-muted-foreground">
        ₴{(spent ?? 0).toLocaleString()} {translations.spent}
      </div>
    </div>
  );
}
