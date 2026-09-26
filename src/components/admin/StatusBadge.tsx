"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";

export interface StatusBadgeProps {
  status: string | null | undefined;
  scheduledAt?: string | Date | null;
  className?: string;
}

export function StatusBadge({ status, scheduledAt, className }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || "draft";
  const isPublished = normalizedStatus === "published";
  const isScheduled = normalizedStatus === "scheduled";

  const scheduleInfo = useMemo(() => {
    if (!scheduledAt) return null;
    try {
      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) return null;
      const overdue = isPast(date);
      const timeStr = format(date, "h:mm a");
      const relativeDistance = formatDistanceToNow(date, { addSuffix: true });
      let dayLabel = format(date, "MMM d, yyyy");
      if (isToday(date)) {
        dayLabel = "Today";
      } else if (isTomorrow(date)) {
        dayLabel = "Tomorrow";
      }

      return {
        date,
        overdue,
        timeStr,
        dayLabel,
        relativeDistance,
        fullFormatted: `${dayLabel} at ${timeStr}`,
        absoluteFormatted: format(date, "MMM d, yyyy 'at' h:mm a (zzz)"),
      };
    } catch {
      return null;
    }
  }, [scheduledAt]);

  // Scheduled Status Badge
  if (isScheduled) {
    if (scheduleInfo?.overdue) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border cursor-pointer select-none",
                  "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
                  className
                )}
              >
                <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Pending Publish</span>
              </span>
            }
          />
          <TooltipContent className="max-w-xs text-xs space-y-1">
            <p className="font-semibold text-amber-600 dark:text-amber-400">
              Scheduled for {scheduleInfo.fullFormatted}
            </p>
            <p className="text-muted-foreground text-[11px]">
              Pending publish (due {scheduleInfo.relativeDistance})
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border cursor-pointer select-none",
                "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
                className
              )}
            >
              <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Scheduled</span>
            </span>
          }
        />
        <TooltipContent className="max-w-xs text-xs">
          <p className="font-semibold text-purple-600 dark:text-purple-400">
            {scheduleInfo ? scheduleInfo.fullFormatted : "Scheduled"}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Published Status Badge
  if (isPublished) {
    const badgeEl = (
      <span
        className={cn(
          "text-xs px-2.5 py-1 rounded-sm font-bold uppercase tracking-wider inline-block",
          "bg-primary text-primary-foreground",
          className
        )}
      >
        Published
      </span>
    );

    if (scheduleInfo) {
      return (
        <Tooltip>
          <TooltipTrigger render={badgeEl} />
          <TooltipContent className="text-xs">
            <p>Published via Schedule (was set for {scheduleInfo.fullFormatted})</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return badgeEl;
  }

  // Draft / Other Status Badge
  return (
    <span
      className={cn(
        "text-xs px-2.5 py-1 rounded-sm font-bold uppercase tracking-wider inline-block",
        "bg-muted text-muted-foreground",
        className
      )}
    >
      {normalizedStatus}
    </span>
  );
}
