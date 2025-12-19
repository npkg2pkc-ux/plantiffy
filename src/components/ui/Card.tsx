import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card = ({ children, className, onClick }: CardProps) => {
  return (
    <div
      className={cn(
        "bg-white dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-700 shadow-soft overflow-hidden",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

const CardHeader = ({ children, className }: CardHeaderProps) => {
  return (
    <div
      className={cn(
        "px-6 py-4 border-b border-dark-100 dark:border-dark-700",
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

const CardTitle = ({ children, className }: CardTitleProps) => {
  return (
    <h3
      className={cn(
        "text-lg font-semibold text-dark-900 dark:text-white",
        className
      )}
    >
      {children}
    </h3>
  );
};

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

const CardDescription = ({ children, className }: CardDescriptionProps) => {
  return (
    <p
      className={cn("text-sm text-dark-500 dark:text-dark-400 mt-1", className)}
    >
      {children}
    </p>
  );
};

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

const CardContent = ({ children, className }: CardContentProps) => {
  return <div className={cn("p-6", className)}>{children}</div>;
};

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

const CardFooter = ({ children, className }: CardFooterProps) => {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-dark-100 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/50",
        className
      )}
    >
      {children}
    </div>
  );
};

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
