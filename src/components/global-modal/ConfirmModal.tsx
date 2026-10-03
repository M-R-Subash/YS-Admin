"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "danger" | "warning" | "success" | "neutral" | "default";

export interface ConfirmModalSecondaryAction {
  label: string;
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  secondaryAction?: ConfirmModalSecondaryAction;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    actionClass: string;
    defaultConfirmText: string;
  }
> = {
  danger: {
    icon: AlertTriangle,
    iconBg: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    iconColor: "text-red-600 dark:text-red-400",
    actionClass: "bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer",
    defaultConfirmText: "Confirm Delete",
  },
  warning: {
    icon: AlertCircle,
    iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
    actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-semibold cursor-pointer",
    defaultConfirmText: "Proceed",
  },
  success: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-semibold cursor-pointer",
    defaultConfirmText: "Approve",
  },
  neutral: {
    icon: Info,
    iconBg: "bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
    iconColor: "text-zinc-700 dark:text-zinc-300",
    actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-semibold cursor-pointer",
    defaultConfirmText: "Confirm",
  },
  default: {
    icon: Info,
    iconBg: "bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
    iconColor: "text-zinc-700 dark:text-zinc-300",
    actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-semibold cursor-pointer",
    defaultConfirmText: "Confirm",
  },
};

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  confirmText,
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  secondaryAction,
  icon,
  children,
}: ConfirmModalProps) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.default;
  const IconComponent = config.icon;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-card border border-border p-6 shadow-xl">
        <AlertDialogHeader className="flex flex-row items-start gap-3.5 space-y-0 text-left">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              config.iconBg
            )}
          >
            {icon ? icon : <IconComponent className={cn("h-5 w-5", config.iconColor)} />}
          </div>
          <div className="space-y-1.5 pt-0.5">
            <AlertDialogTitle className="text-base font-semibold leading-tight text-foreground">
              {title}
            </AlertDialogTitle>
            {description && (
              <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </AlertDialogDescription>
            )}
          </div>
        </AlertDialogHeader>

        {children && <div className="mt-3">{children}</div>}

        <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
          <AlertDialogCancel
            disabled={loading}
            onClick={handleCancel}
            className="w-full sm:w-auto h-9 px-4 text-xs font-medium cursor-pointer"
          >
            {cancelText}
          </AlertDialogCancel>

          {secondaryAction && (
            <button
              type="button"
              disabled={loading || secondaryAction.disabled}
              onClick={secondaryAction.onClick}
              className={cn(
                "w-full sm:w-auto inline-flex items-center justify-center h-9 px-4 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer disabled:opacity-50",
                secondaryAction.className
              )}
            >
              {secondaryAction.label}
            </button>
          )}

          {onConfirm && (
            <AlertDialogAction
              disabled={loading}
              onClick={handleConfirm}
              className={cn(
                "w-full sm:w-auto h-9 px-4 text-xs cursor-pointer shadow-sm",
                config.actionClass
              )}
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {loading ? "Processing..." : (confirmText || config.defaultConfirmText)}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
