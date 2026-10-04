"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ListTree, Save, Send, Calendar, Loader2 } from "lucide-react";
import { useBlogForm } from "../context/BlogFormContext";
import { useNow } from "@/hooks/useNow";

interface BlogMobileBottomDockProps {
  onOpenToc: () => void;
}

export function BlogMobileBottomDock({ onOpenToc }: BlogMobileBottomDockProps) {
  const {
    isEditMode,
    isSubmitting,
    isDirtyOrFilled,
    hasCloudDraft,
    loadedFromBackup,
    editorTab,
    readingTime,
    handleSave,
    restoredFromVersion,
    watch,
    isFullscreen,
  } = useBlogForm();

  const now = useNow();
  const status = watch("status");
  const scheduledAt = watch("scheduledAt");

  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const hasValidScheduleDate = Boolean(scheduleDate && !isNaN(scheduleDate.getTime()));

  const isPendingOverdue = Boolean(
    hasValidScheduleDate &&
      scheduleDate!.getTime() <= now &&
      (status === "scheduled" || hasCloudDraft || loadedFromBackup)
  );

  const isUpcoming = Boolean(
    hasValidScheduleDate &&
      scheduleDate!.getTime() > now &&
      (status === "scheduled" || status === "published")
  );

  const isActivelyScheduled = isUpcoming || isPendingOverdue;
  const isPublished = status === "published";

  const publishLabel = restoredFromVersion
    ? "Update Live"
    : isActivelyScheduled
    ? isDirtyOrFilled
      ? isPendingOverdue
        ? "Save Overdue"
        : "Save Sched"
      : isPendingOverdue
      ? "Update Post"
      : "Update Sched"
    : isPublished
    ? hasCloudDraft || loadedFromBackup
      ? "Publish"
      : "Update Live"
    : "Publish";

  const canPublish =
    !isSubmitting &&
    (Boolean(restoredFromVersion) ||
      (isEditMode
        ? isActivelyScheduled
          ? isDirtyOrFilled
          : status !== "published" || hasCloudDraft || loadedFromBackup || isDirtyOrFilled
        : isDirtyOrFilled));

  const canSaveDraft = !isSubmitting && isDirtyOrFilled;

  if (isFullscreen) return null;

  return (
    <div className="flex md:hidden sticky bottom-0 z-30 shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] items-center justify-between gap-2 shadow-lg">
      {/* Left Action: Outline & Insights when on Content tab, or current tab pill */}
      <div>
        {editorTab === "content" ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onOpenToc}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer bg-muted/40 hover:bg-muted"
          >
            <ListTree className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Outline</span>
            <span className="text-[10px] text-muted-foreground font-normal">· {readingTime}m</span>
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="capitalize">{editorTab}</span>
          </div>
        )}
      </div>

      {/* Right Actions: Save Draft & Publish / Update */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => handleSave("draft")}
          disabled={!canSaveDraft}
          className="h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Draft</span>
        </Button>

        <Button
          size="sm"
          type="button"
          onClick={() => handleSave(isActivelyScheduled ? "scheduled" : "published")}
          disabled={!canPublish}
          className={`h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer shadow-xs transition-all ${
            isActivelyScheduled
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 text-white"
          } disabled:opacity-40`}
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isActivelyScheduled ? (
            <Calendar className="w-3.5 h-3.5" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{publishLabel}</span>
        </Button>
      </div>
    </div>
  );
}
