"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || "draft";
  const isPublished = normalizedStatus === "published";

  return (
    <span
      className={cn(
        "text-xs px-2.5 py-1 rounded-sm font-bold uppercase tracking-wider inline-block",
        isPublished
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {normalizedStatus}
    </span>
  );
}
