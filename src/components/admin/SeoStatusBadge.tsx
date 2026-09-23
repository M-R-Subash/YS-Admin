"use client";

import { cn } from "@/lib/utils";

export interface SeoData {
  metaTitle?: string | null;
  metaDesc?: string | null;
  focusKeyword?: string | null;
  ogImage?: string | null;
  [key: string]: any;
}

export function calculateSeoStatus(
  seo: SeoData | null | undefined,
  fallbackImage?: string | null
): {
  label: string;
  variant: "destructive" | "warning" | "success" | "default";
} {
  if (!seo) return { label: "Bad", variant: "destructive" };

  const image = seo.ogImage || fallbackImage;
  const coreFields = [seo.metaTitle, seo.metaDesc, seo.focusKeyword, image].filter(Boolean);
  const coreCount = coreFields.length;

  if (coreCount <= 1) {
    return { label: "Bad", variant: "destructive" };
  }

  const titleLen = seo.metaTitle?.length || 0;
  const descLen = seo.metaDesc?.length || 0;

  if (titleLen >= 40 && titleLen <= 60 && descLen >= 120 && descLen <= 160) {
    return { label: "Good", variant: "success" };
  }

  if (coreCount >= 2) {
    return { label: "Medium", variant: "warning" };
  }

  return { label: "Needs Improvement", variant: "default" };
}

interface SeoStatusBadgeProps {
  seo?: SeoData | null;
  fallbackImage?: string | null;
  className?: string;
}

export function SeoStatusBadge({
  seo,
  fallbackImage,
  className,
}: SeoStatusBadgeProps) {
  const status = calculateSeoStatus(seo, fallbackImage);

  let variantClasses = "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800";
  if (status.variant === "destructive") {
    variantClasses = "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
  } else if (status.variant === "warning") {
    variantClasses = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800";
  } else if (status.variant === "success") {
    variantClasses = "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800";
  }

  return (
    <span
      className={cn(
        "text-xs px-2.5 py-1 rounded-sm font-semibold border inline-block",
        variantClasses,
        className
      )}
    >
      {status.label}
    </span>
  );
}
