"use client";

import { cn } from "@/lib/utils";
import { calculateQuickSeoScore } from "@/lib/seo/seo-engine";

export interface SeoData {
  metaTitle?: string | null;
  metaDesc?: string | null;
  focusKeyword?: string | null;
  ogImage?: string | null;
  auditScore?: number | null;
  [key: string]: any;
}

export function calculateSeoStatus(
  seo: SeoData | null | undefined,
  fallbackImage?: string | null
): {
  label: string;
  score: number;
  variant: "destructive" | "warning" | "success" | "default";
} {
  const result = calculateQuickSeoScore(seo as any, undefined, fallbackImage);
  return {
    label: result.label,
    score: result.score,
    variant: result.variant,
  };
}

interface SeoStatusBadgeProps {
  seo?: SeoData | null;
  fallbackImage?: string | null;
  showScore?: boolean;
  className?: string;
}

export function SeoStatusBadge({
  seo,
  fallbackImage,
  showScore = true,
  className,
}: SeoStatusBadgeProps) {
  const status = calculateSeoStatus(seo, fallbackImage);

  let variantClasses =
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  let dotColor = "bg-amber-500";

  if (status.variant === "destructive") {
    variantClasses =
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    dotColor = "bg-rose-500";
  } else if (status.variant === "success") {
    variantClasses =
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    dotColor = "bg-emerald-500";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm font-bold border transition-colors",
        variantClasses,
        className
      )}
      title={`SEO Score: ${status.score}/100 • ${status.label}`}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
      {showScore && <span className="font-mono">{status.score}</span>}
      <span className={showScore ? "opacity-80 font-semibold" : ""}>{status.label}</span>
    </span>
  );
}
