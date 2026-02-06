import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ============================================
   KPI Card — Enterprise Data Visualization
   Hierarchy: Number → Label → Metadata
   ============================================ */

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  subtitle,
  icon,
  trend,
  className,
  onClick,
}: KPICardProps) {
  const trendIsUp = trend && trend.value > 0;
  const trendIsDown = trend && trend.value < 0;
  const trendIsFlat = trend && trend.value === 0;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-5",
        "transition-all duration-200",
        "hover:shadow-soft-md hover:border-border/80",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="flex-shrink-0 p-1.5 rounded-md bg-muted/80 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-display font-bold text-foreground tracking-tight tabular-nums">
          {value}
        </p>

        <div className="flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
                trendIsUp && "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
                trendIsDown && "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50",
                trendIsFlat && "text-muted-foreground bg-muted"
              )}
            >
              {trendIsUp && <TrendingUp className="h-3 w-3" />}
              {trendIsDown && <TrendingDown className="h-3 w-3" />}
              {trendIsFlat && <Minus className="h-3 w-3" />}
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {(subtitle || trend?.label) && (
            <span className="text-xs text-muted-foreground truncate">
              {trend?.label || subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   KPI Mini — Compact inline metric display
   ============================================ */

interface KPIMiniProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

export function KPIMini({
  label,
  value,
  icon,
  variant = "default",
  className,
}: KPIMiniProps) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/50", className)}>
      {icon && (
        <div className={cn("flex-shrink-0", colors[variant])}>{icon}</div>
      )}
      <div className="min-w-0">
        <p className={cn("text-lg font-semibold tabular-nums", colors[variant])}>
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}
