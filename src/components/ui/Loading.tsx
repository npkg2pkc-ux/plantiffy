import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Spinner = ({ size = "md", className }: SpinnerProps) => {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  return (
    <div
      className={cn(
        "border-primary-600 border-t-transparent rounded-full animate-spin",
        sizes[size],
        className
      )}
    />
  );
};

// Full Page Loader
interface LoaderProps {
  message?: string;
}

const Loader = ({ message = "Memuat..." }: LoaderProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

// Skeleton
interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className }: SkeletonProps) => {
  return <div className={cn("animate-pulse bg-muted rounded-md", className)} />;
};

// Card Skeleton
const CardSkeleton = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <Skeleton className="h-3 w-1/4 mb-4" />
      <Skeleton className="h-7 w-1/2 mb-2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
};

// Table Skeleton
const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Success Overlay
interface SuccessOverlayProps {
  isVisible: boolean;
  message?: string;
  onClose?: () => void;
  autoCloseDelay?: number; // in milliseconds, default 1500ms
}

const SuccessOverlay = ({
  isVisible,
  message = "Berhasil!",
  onClose,
  autoCloseDelay = 1500,
}: SuccessOverlayProps) => {
  // Auto close after delay
  useEffect(() => {
    if (isVisible && onClose && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, autoCloseDelay]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-card rounded-lg p-8 shadow-soft-xl text-center animate-scale-in border border-border">
        <div className="w-14 h-14 mx-auto mb-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center">
          <svg
            className="w-7 h-7 text-emerald-600 dark:text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-foreground">{message}</p>
      </div>
    </div>
  );
};

export {
  Spinner,
  Loader,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  SuccessOverlay,
};
