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
          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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

  // Budgeted compact card: status drives badge + bar color.
  const status: 'none' | 'ok' | 'warn' | 'over' = !hasBudget
    ? 'none'
    : percentage <= 90
      ? 'ok'
      : percentage <= 100
        ? 'warn'
        : 'over';

  const badgeClass = {
    ok: 'bg-green-500 text-white',
    warn: 'bg-amber-500 text-white',
    over: 'bg-destructive text-white',
    none: 'bg-muted text-muted-foreground',
  }[status];

  const barClass = {
    ok: 'bg-green-500',
    warn: 'bg-amber-500',
    over: 'bg-destructive',
    none: '',
  }[status];

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-all hover:border-primary/30 group cursor-pointer"
      onClick={() => onClick?.(id)}
    >
      {/* Row 1: icon + name, status badge + hover menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {iconBox}
          <h3 className="text-sm text-card-foreground truncate">{name}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
            {status === 'none' ? translations.noBudgetSet : `${percentage.toFixed(0)}%`}
          </span>
          {menu}
        </div>
      </div>

      {/* Row 2: thin progress bar (fill capped at 100%) */}
      <div className="h-1 w-full rounded-full overflow-hidden bg-muted mb-2">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Row 3: spent (left) + remaining/over (right) */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          ₴{(spent ?? 0).toLocaleString()} {translations.spent}
        </span>
        {status !== 'none' && (
          isOverBudget ? (
            <span className="text-destructive font-medium">
              ₴{(spent - budget).toLocaleString()} {translations.over}
            </span>
          ) : (
            <span className="text-muted-foreground">
              ₴{(budget - spent).toLocaleString()} {translations.left}
            </span>
          )
        )}
      </div>
    </div>
  );
}
