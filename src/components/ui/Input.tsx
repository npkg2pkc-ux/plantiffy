import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full px-4 py-3 text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-600 rounded-xl",
            "text-dark-900 dark:text-white",
            "placeholder:text-dark-400 dark:placeholder:text-dark-500",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            "transition-all duration-200",
            "disabled:bg-dark-100 dark:disabled:bg-dark-700 disabled:cursor-not-allowed",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-dark-500 dark:text-dark-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
