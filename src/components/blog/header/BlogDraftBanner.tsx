"use client";

import React from "react";
import { CalendarClock } from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { EditorDraftBanner } from "@/components/editor-shell";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogDraftBanner() {
  const {
    hasCloudDraft,
    loadedFromBackup,
    lastSavedAt,
    setShowDiscardConfirm,
    discarding,
    scheduledAt,
    setShowScheduleModal,
    handleCancelSchedule,
    handlePublishNow,
    watch,
  } = useBlogForm();

  const status = watch("status");
  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const hasValidScheduleDate = Boolean(scheduleDate && !isNaN(scheduleDate.getTime()));
  const isFutureSchedule = Boolean(hasValidScheduleDate && scheduleDate!.getTime() > Date.now());

  // An active scheduled release is true whenever status === "scheduled" OR scheduledAt is in the future
  const isActivelyScheduled = Boolean(status === "scheduled" || isFutureSchedule);

  let scheduleText = "";
  let relativeText = "";
  if (isActivelyScheduled && scheduleDate) {
    const timeStr = format(scheduleDate, "h:mm a");
    relativeText = formatDistanceToNow(scheduleDate, { addSuffix: true });
    if (isToday(scheduleDate)) {
      scheduleText = `Today at ${timeStr}`;
    } else if (isTomorrow(scheduleDate)) {
      scheduleText = `Tomorrow at ${timeStr}`;
    } else {
      scheduleText = format(scheduleDate, "MMM d, yyyy 'at' h:mm a");
    }
  }

  return (
    <>
      {isActivelyScheduled && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-2 bg-purple-500/10 border-b border-purple-500/30 text-purple-950 dark:text-purple-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <p className="text-xs font-semibold">
              <span className="font-bold text-purple-700 dark:text-purple-300">Scheduled Release:</span>{" "}
              This article will publish on <span className="font-bold underline decoration-purple-400">{scheduleText}</span> ({relativeText}). Changes saved here will be published at that time.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 rounded-sm border border-purple-500/40 transition-all cursor-pointer"
            >
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => handlePublishNow()}
              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 rounded-sm border border-emerald-500/40 transition-all cursor-pointer"
            >
              Publish Now
            </button>
            <button
              type="button"
              onClick={() => handleCancelSchedule()}
              className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm border border-border transition-all cursor-pointer"
            >
              Cancel Schedule
            </button>
          </div>
        </div>
      )}

      {/* Only show the standard draft banner if the post is NOT actively scheduled */}
      <EditorDraftBanner
        hasDraft={!isActivelyScheduled && (hasCloudDraft || loadedFromBackup)}
        lastSavedAt={lastSavedAt}
        onDiscard={() => setShowDiscardConfirm(true)}
        isDiscarding={discarding}
      />
    </>
  );
}

