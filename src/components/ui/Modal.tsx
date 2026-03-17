import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = false,
  className,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const sizeClasses = {
    sm: "lg:max-w-sm",
    md: "lg:max-w-md",
    lg: "lg:max-w-lg",
    xl: "lg:max-w-2xl",
    full: "lg:max-w-4xl",
  };

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (closeOnOverlayClick || isMobile) {
        onClose();
      }
    }
  };

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bottom-sheet-overlay"
            onClick={handleOverlayClick}
          />

          {/* Mobile: Bottom Sheet | Desktop: Centered Modal */}
          <div
            className={cn(
              // Mobile: bottom-aligned
              "flex min-h-full lg:items-center lg:justify-center",
              "items-end justify-center"
            )}
            onClick={handleOverlayClick}
          >
            <motion.div
              ref={modalRef}
              // Mobile: slide-up bottom sheet | Desktop: scale animation
              initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
              transition={isMobile
                ? { type: "spring", damping: 30, stiffness: 300 }
                : { duration: 0.2, ease: "easeOut" }
              }
              className={cn(
                "relative w-full bg-card shadow-soft-2xl",
                // Mobile: bottom sheet style
                "rounded-t-3xl lg:rounded-2xl",
                "max-h-[90vh] lg:max-h-[85vh]",
                // Desktop: centered with max-width
                "lg:mx-4",
                sizeClasses[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle - mobile only */}
              <div className="lg:hidden pt-3 pb-1">
                <div className="drag-handle" />
              </div>

              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between px-5 py-3 lg:py-4 border-b border-border/60">
                  <div className="flex-1">
                    {title && (
                      <h2 className="text-base lg:text-sm font-semibold text-foreground">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-0.5 text-sm lg:text-xs text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-2 -mr-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                    >
                      <X className="h-5 w-5 lg:h-4 lg:w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="px-5 py-4 max-h-[calc(90vh-120px)] lg:max-h-[calc(85vh-120px)] overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Confirm Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) => {
  const variantClasses = {
    danger:
      "bg-red-600 text-white hover:bg-red-700",
    warning:
      "bg-amber-600 text-white hover:bg-amber-700",
    info: "bg-primary-600 text-white hover:bg-primary-700",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center py-2 lg:py-4">
        {/* Icon */}
        <div className={cn(
          "w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center",
          variant === "danger" && "bg-red-100 dark:bg-red-900/30",
          variant === "warning" && "bg-amber-100 dark:bg-amber-900/30",
          variant === "info" && "bg-primary-100 dark:bg-primary-900/30"
        )}>
          <span className="text-2xl">
            {variant === "danger" ? "🗑️" : variant === "warning" ? "⚠️" : "ℹ️"}
          </span>
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 px-2">
          {message}
        </p>
        {/* Mobile: stacked buttons | Desktop: side by side */}
        <div className="flex flex-col-reverse lg:flex-row justify-center gap-3 lg:gap-3">
          <button
            onClick={onClose}
            className="w-full lg:w-auto px-6 py-3 lg:py-2.5 text-sm font-medium text-foreground bg-secondary border border-border rounded-xl hover:bg-muted transition-colors"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "w-full lg:w-auto px-6 py-3 lg:py-2.5 text-sm font-medium rounded-xl transition-colors",
              variantClasses[variant]
            )}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export { Modal, ConfirmDialog };
export type { ModalProps, ConfirmDialogProps };
