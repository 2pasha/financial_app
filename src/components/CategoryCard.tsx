import { Progress } from "./ui/progress";
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
  budget: number;
  icon: string;
  color: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  translations: {
    remaining: string;
    used: string;
    edit: string;
    delete: string;
  };
}

export function CategoryCard({ id, name, spent, budget, icon, color, onEdit, onDelete, translations }: CategoryCardProps) {
  const percentage = (spent / budget) * 100;
  const isOverBudget = spent > budget;

  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:shadow-lg transition-all hover:border-primary/30 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
            style={{ 
              backgroundColor: `${color}30`,
              border: `1px solid ${color}40`
            }}
          >
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h3 className="text-card-foreground mb-1">{name}</h3>
            <p className="text-muted-foreground">
              <span className="text-card-foreground">${spent.toLocaleString()}</span> / ${budget.toLocaleString()}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-70 hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 z-[60]">
            <DropdownMenuItem 
              onClick={() => onEdit(id)} 
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              {translations.edit}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(id)} 
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {translations.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Progress 
        value={Math.min(percentage, 100)} 
        className="h-2.5 mb-2"
        style={
          {
            '--progress-background': isOverBudget ? 'var(--destructive)' : color
          } as React.CSSProperties
        }
      />
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          ${(budget - spent).toLocaleString()} {translations.remaining}
        </span>
        <span className={`${isOverBudget ? 'text-destructive' : 'text-card-foreground'}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
