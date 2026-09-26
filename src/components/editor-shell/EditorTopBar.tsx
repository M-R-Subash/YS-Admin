"use client";

import React from "react";
import {
  ArrowLeft,
  Loader2,
  Send,
  Save,
  Eye,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ChevronDown,
  Layout,
  Globe,
  Calendar,
  Clock,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

export interface EditorTopBarProps {
  title: string;
  subtitle?: string;
  status: string; // "draft" | "published" | "scheduled"
  scheduledAt?: string | Date | null;
  isEditMode?: boolean;
  hasCloudDraft?: boolean;
  loadedFromBackup?: boolean;
  isDirty?: boolean;
  lastSavedAt?: string | null;

  // Segmented view switcher (Visual Editor vs SEO Suite)
  activeView?: "editor" | "seo";
  onViewChange?: (view: "editor" | "seo") => void;
  seoScore?: number | null;

  // Navigation
  onBack: () => void;
  backTitle?: string;

  // Live Preview (Fullscreen Workspace)
  onPreview?: () => void;
  isPreviewSaving?: boolean;
  previewTooltip?: string;

  // Fullscreen toggle (optional)
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;

  // Save / Publish / Schedule
  onPublish: () => void;
  isPublishing?: boolean;
  canPublish?: boolean;
  publishLabel?: string;

  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  canSaveDraft?: boolean;

  onOpenSchedule?: () => void;
  onPublishNow?: () => void;
  onCancelSchedule?: () => void;
  isPublishingNow?: boolean;

  // Extra action slot
  extraActions?: React.ReactNode;
  className?: string;
}

export function EditorTopBar({
  title,
  subtitle,
  status,
  isEditMode = true,
  hasCloudDraft = false,
  loadedFromBackup = false,
  isDirty = false,
  lastSavedAt = null,
  activeView = "editor",
  onViewChange,
  seoScore = null,
  onBack,
  backTitle = "Back",
  onPreview,
  isPreviewSaving = false,
  previewTooltip,
  isFullscreen,
  onToggleFullscreen,
  onPublish,
  isPublishing = false,
  canPublish = true,
  publishLabel,
  onSaveDraft,
  isSavingDraft = false,
  canSaveDraft = true,
  scheduledAt = null,
  onOpenSchedule,
  onPublishNow,
  onCancelSchedule,
  isPublishingNow = false,
  extraActions,
  className = "",
}: EditorTopBarProps) {
  const isPublished = status === "published";
  const isScheduled = status === "scheduled";

  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const isOverdue =
    isScheduled && scheduleDate && !isNaN(scheduleDate.getTime())
      ? scheduleDate.getTime() <= Date.now()
      : false;

  let scheduleBadgeText = "Scheduled";
  let scheduleBadgeTooltip = "This post is scheduled for future release.";

  if (isScheduled && scheduleDate && !isNaN(scheduleDate.getTime())) {
    const timeStr = format(scheduleDate, "h:mm a");
    const relStr = formatDistanceToNow(scheduleDate, { addSuffix: true });

    if (isOverdue) {
      scheduleBadgeText = "Pending Publish";
      scheduleBadgeTooltip = `Scheduled time (${timeStr}) passed. Cron will publish shortly, or you can click 'Publish Immediately'.`;
    } else if (isToday(scheduleDate)) {
      scheduleBadgeText = `Scheduled · Today ${timeStr}`;
      scheduleBadgeTooltip = `Scheduled for Today at ${timeStr} (${relStr})`;
    } else if (isTomorrow(scheduleDate)) {
      scheduleBadgeText = `Scheduled · Tomorrow ${timeStr}`;
      scheduleBadgeTooltip = `Scheduled for Tomorrow at ${timeStr} (${relStr})`;
    } else {
      scheduleBadgeText = `Scheduled · ${format(scheduleDate, "MMM d, h:mm a")}`;
      scheduleBadgeTooltip = `Scheduled for ${format(
        scheduleDate,
        "MMM d, yyyy 'at' h:mm a"
      )} (${relStr})`;
    }
  }

  const defaultPublishLabel = isScheduled
    ? isDirty
      ? "Save Schedule"
      : "Update Schedule"
    : isPublished
    ? hasCloudDraft || loadedFromBackup
      ? "Publish"
      : "Update"
    : "Publish";
  const effectivePublishLabel = publishLabel || defaultPublishLabel;

  return (
    <header
      className={`flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 shadow-sm z-50 relative ${className}`}
    >
      {/* Left: Back & Title & Draft Status Badge */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-sm bg-black border border-black hover:bg-zinc-800 transition-all text-white shadow-sm cursor-pointer shrink-0"
          title={backTitle}
        >
          <ArrowLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-black tracking-tight truncate max-w-70 sm:max-w-100">
              {title || "Untitled"}
            </h1>

            {/* Dynamic Status Badges matching Blog editor design */}
            {isEditMode && isScheduled ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs shrink-0 cursor-default ${
                        isOverdue
                          ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                          : "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOverdue
                            ? "bg-amber-500 animate-ping"
                            : isDirty
                            ? "bg-purple-500 animate-pulse"
                            : "bg-purple-500"
                        }`}
                      />
                      {scheduleBadgeText}
                    </span>
                  }
                />
                <TooltipContent side="bottom">
                  <p className="text-xs">{scheduleBadgeTooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : isEditMode && status === "draft" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${
                    isDirty ? "animate-pulse" : ""
                  }`}
                />
                {isDirty
                  ? "Unsaved Edits"
                  : lastSavedAt
                    ? `Draft · Saved ${lastSavedAt}`
                    : "Draft Saved"}
              </span>
            ) : isEditMode && status === "published" ? (
              hasCloudDraft || loadedFromBackup ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs shrink-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${
                      isDirty ? "animate-pulse" : ""
                    }`}
                  />
                  {isDirty ? "Live · Unsaved Edits" : "Live · Draft Staged"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs shrink-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${
                      isDirty ? "animate-pulse" : ""
                    }`}
                  />
                  {isDirty ? "Unsaved Changes" : "Live Published"}
                </span>
              )
            ) : !isEditMode ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-300 shadow-xs shrink-0">
                Draft
              </span>
            ) : null}
          </div>

          {subtitle && (
            <p className="text-xs text-black font-medium mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: Segmented View Switcher (Visual Editor vs SEO Suite) */}
      {onViewChange && (
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-border shadow-xs">
          <button
            type="button"
            onClick={() => onViewChange("editor")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-md transition-all cursor-pointer ${
              activeView === "editor"
                ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm font-bold border border-border/80"
                : "text-muted-foreground hover:text-foreground font-medium hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Visual Editor</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange("seo")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-md transition-all cursor-pointer ${
              activeView === "seo"
                ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm font-bold border border-border/80"
                : "text-muted-foreground hover:text-foreground font-medium hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>SEO Suite</span>
            {typeof seoScore === "number" && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  seoScore >= 80
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60"
                    : seoScore >= 50
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60"
                    : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300/60"
                }`}
              >
                {seoScore}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Right: Autosave status + Preview + Fullscreen + Split Publish Button */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Autosave Status Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium mr-1">
          {isPublishing || isSavingDraft ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          ) : isDirty ? (
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          ) : lastSavedAt ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              Saved {lastSavedAt}
            </span>
          ) : null}
        </div>

        {/* Live Preview Button (Icon-Only with Tooltip) */}
        {onPreview && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  type="button"
                  disabled={isPreviewSaving || isPublishing || isSavingDraft}
                  onClick={onPreview}
                  className="h-9 w-9 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  {isPreviewSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              }
            />
            <TooltipContent side="bottom">
              <p className="text-xs">
                {isPreviewSaving
                  ? "Saving draft for live preview..."
                  : previewTooltip || "Live preview (auto-saves draft)"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Fullscreen Toggle Button (Icon-Only, lg+ only) */}
        {onToggleFullscreen && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  type="button"
                  onClick={onToggleFullscreen}
                  className="hidden lg:flex h-9 w-9 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer items-center justify-center"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              }
            />
            <TooltipContent side="bottom">
              <p className="text-xs">
                {isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Split Publish Button with Save Draft & Schedule Dropdown */}
        <div className="flex items-center">
          <Button
            onClick={onPublish}
            disabled={isPublishing || isSavingDraft || !canPublish}
            className={`flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm ${
              onSaveDraft || onOpenSchedule || isScheduled ? "rounded-r-none" : ""
            } shadow-md transition-all hover:scale-[1.02] ${
              isScheduled
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-black hover:bg-black/90 text-white"
            } disabled:opacity-50 cursor-pointer`}
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isScheduled ? (
              <Calendar className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {effectivePublishLabel}
          </Button>

          {(onSaveDraft || onOpenSchedule || isScheduled) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    className={`h-9 w-8 p-0 rounded-sm rounded-l-none border-l border-white/20 ${
                      isScheduled
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-black hover:bg-black/90"
                    } text-white shadow-md cursor-pointer flex items-center justify-center`}
                  />
                }
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={6}
                className="w-56"
              >
                {/* 1. Schedule for later / Change schedule */}
                {onOpenSchedule && (
                  <DropdownMenuItem
                    onClick={onOpenSchedule}
                    disabled={isPublishing || isSavingDraft}
                    className="cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                    <span>
                      {isScheduled
                        ? "Change Schedule Time..."
                        : "Schedule for Later..."}
                    </span>
                  </DropdownMenuItem>
                )}

                {/* 2. Publish Immediately if Scheduled */}
                {isScheduled && onPublishNow && (
                  <DropdownMenuItem
                    onClick={onPublishNow}
                    disabled={isPublishing || isSavingDraft || isPublishingNow}
                    className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-semibold focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    <span>Publish Immediately</span>
                  </DropdownMenuItem>
                )}

                {/* 3. Revert Scheduled to Draft */}
                {isScheduled && onCancelSchedule && (
                  <DropdownMenuItem
                    onClick={onCancelSchedule}
                    disabled={isPublishing || isSavingDraft}
                    className="cursor-pointer text-muted-foreground hover:text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    <span>Revert to Draft</span>
                  </DropdownMenuItem>
                )}

                {(onOpenSchedule || isScheduled) && onSaveDraft && (
                  <DropdownMenuSeparator />
                )}

                {/* 4. Save Draft */}
                {onSaveDraft && (
                  <DropdownMenuItem
                    onClick={onSaveDraft}
                    disabled={isPublishing || isSavingDraft || !canSaveDraft}
                    className="cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2 text-muted-foreground" />
                    Save Draft
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {extraActions}
      </div>
    </header>
  );
}
