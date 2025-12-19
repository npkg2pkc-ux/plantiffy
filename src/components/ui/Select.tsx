import { forwardRef, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "w-full px-4 py-3 text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-600 rounded-xl",
              "text-dark-900 dark:text-white",
              "appearance-none cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
              "transition-all duration-200",
              "disabled:bg-dark-100 dark:disabled:bg-dark-700 disabled:cursor-not-allowed",
              "[&>option]:bg-white [&>option]:dark:bg-dark-800 [&>option]:text-dark-900 [&>option]:dark:text-white",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

// SelectGroup for complex select with children
interface SelectGroupProps {
  children: ReactNode;
  label?: string;
  error?: string;
}

const SelectGroup = ({ children, label, error }: SelectGroupProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export { Select, SelectGroup };
export type { SelectProps };
