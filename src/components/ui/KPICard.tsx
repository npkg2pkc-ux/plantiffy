import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ============================================
   KPI Card — Enterprise Data Visualization
   Modern Glassmorphism Design (v3.0)
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
  variant?: "default" | "gradient";
  accentColor?: string;
}

export function KPICard({
  label,
  value,
  subtitle,
  icon,
  trend,
  className,
  onClick,
  variant = "default",
  accentColor,
}: KPICardProps) {
  const trendIsUp = trend && trend.value > 0;
  const trendIsDown = trend && trend.value < 0;
  const trendIsFlat = trend && trend.value === 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl border border-border/60 p-5",
        "transition-all duration-300 ease-out",
        "hover:shadow-soft-lg hover:border-border/40 hover:-translate-y-0.5",
        "dark:bg-card/80 dark:backdrop-blur-sm",
        onClick && "cursor-pointer active:scale-[0.98]",
        variant === "gradient" && "border-0 bg-gradient-to-br from-card via-card to-muted/30",
        className
      )}
      onClick={onClick}
    >
      {/* Subtle accent line at top */}
      {accentColor && (
        <div
          className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-muted/90 transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-2xl font-display font-bold text-foreground tracking-tight tabular-nums">
          {value}
        </p>

        <div className="flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
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
            <span className="text-[11px] text-muted-foreground truncate">
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
