"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface CopyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The text or value to copy to clipboard */
  value?: string;
  /** Backwards compatibility alias for value */
  text?: string;
  /** Human-readable label for tooltip and toast (e.g. "Email", "URL") */
  label?: string;
  /** Explicit custom tooltip text. Pass empty string "" to disable tooltip */
  tooltip?: string;
  /** Tooltip placement side (default: "top") */
  tooltipSide?: "top" | "bottom" | "left" | "right";
  /** Whether to show a toast notification on copy (default: true) */
  showToast?: boolean;
  /** Custom toast title */
  toastMessage?: string;
  /** If true, renders idleText / copiedText alongside the icon */
  withText?: boolean;
  /** Text to display when not copied (default: "Copy") */
  idleText?: string;
  /** Text to display when copied (default: "Copied!") */
  copiedText?: string;
  /** Custom icon size/styling class (default: "w-3.5 h-3.5") */
  iconClassName?: string;
  /** Optional custom children if rendering custom content inside button */
  children?: React.ReactNode;
}

export function CopyButton({
  value,
  text,
  label,
  tooltip,
  tooltipSide = "top",
  showToast = true,
  toastMessage,
  withText = false,
  idleText,
  copiedText = "Copied!",
  iconClassName = "w-3.5 h-3.5",
  className,
  onClick,
  children,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const copyTarget = value ?? text ?? "";

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!copyTarget) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyTarget);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = copyTarget;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopied(true);

      if (showToast) {
        toast.add({
          title:
            toastMessage ||
            (label ? `Copied ${label} to clipboard` : "Copied to clipboard"),
          type: "success",
        });
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.add({ title: "Failed to copy to clipboard", type: "error" });
    }

    onClick?.(e);
  };

  const tooltipLabel =
    tooltip ||
    (copied
      ? copiedText
      : label
      ? `Copy ${label}`
      : "Copy to clipboard");

  const buttonElement = (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ? `Copy ${label}` : "Copy to clipboard"}
      className={cn(
        "p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0",
        className
      )}
      {...props}
    >
      {copied ? (
        <Check className={cn("text-emerald-600 transition-transform duration-150 scale-110", iconClassName)} />
      ) : (
        <Copy className={cn("transition-transform duration-150", iconClassName)} />
      )}
      {withText && (
        <span className="text-xs font-semibold">
          {copied ? copiedText : idleText || (label ? `Copy ${label}` : "Copy")}
        </span>
      )}
      {children}
    </button>
  );

  if (tooltip === "") {
    return buttonElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={buttonElement} />
      <TooltipContent side={tooltipSide}>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}
