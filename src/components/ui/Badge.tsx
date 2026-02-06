import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        danger: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        info: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
        outline: "border border-border text-foreground",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px] rounded",
        md: "px-2 py-0.5 text-xs rounded-md",
        lg: "px-2.5 py-1 text-xs rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, size, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
};

export { Badge, badgeVariants };
export type { BadgeProps };
