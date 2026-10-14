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
  ChevronDown,
  Layout,
  Globe,
  Calendar,
  Undo2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/useNow";
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

  // Revision History
  onOpenHistory?: () => void;

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
  onOpenHistory,
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
  const now = useNow();
  const isPublished = status === "published";
  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const hasValidScheduleDate = Boolean(scheduleDate && !isNaN(scheduleDate.getTime()));

  // 1. Pending Overdue Schedule: target time reached/passed, awaiting scheduler execution
  const isPendingOverdue = Boolean(
    hasValidScheduleDate &&
      scheduleDate!.getTime() <= now &&
      (status === "scheduled" || hasCloudDraft || loadedFromBackup)
  );

  // 2. Upcoming Future Schedule: target time is strictly in the future
  const isUpcoming = Boolean(
    hasValidScheduleDate &&
      scheduleDate!.getTime() > now &&
      (status === "scheduled" || status === "published")
  );

  const isScheduled = isUpcoming || isPendingOverdue;
  const isOverdue = isPendingOverdue;

  // Can schedule for later if not published, has unsaved/draft edits, or is already scheduled
  const canScheduleForLater = !isPublished || isDirty || hasCloudDraft || loadedFromBackup || isScheduled;

  let scheduleBadgeText = "Scheduled";
  let scheduleBadgeTooltip = "This post is scheduled for future release.";

  if (isScheduled && scheduleDate && !isNaN(scheduleDate.getTime())) {
    const timeStr = format(scheduleDate, "h:mm a");
    const relStr = formatDistanceToNow(scheduleDate, { addSuffix: true });

    if (isOverdue) {
      scheduleBadgeText = `Pending Release · Due ${relStr.replace(" ago", "")}`;
      scheduleBadgeTooltip = `Scheduled time (${timeStr}) passed. Waiting for scheduler execution, or click 'Publish Immediately'.`;
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
      ? "Save to Schedule"
      : "Update Scheduled Post"
    : isPublished
    ? hasCloudDraft || loadedFromBackup
      ? "Publish"
      : "Update"
    : "Publish";
  const effectivePublishLabel = publishLabel || defaultPublishLabel;

  return (
    <header
      className={`flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3.5 border-b border-border bg-card shrink-0 shadow-xs z-30 relative ${className}`}
    >
      {/* Left: Back & Title & Draft Status Badge */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 sm:p-2 rounded-sm bg-black border border-black hover:bg-zinc-800 transition-all text-white shadow-sm cursor-pointer shrink-0"
          title={backTitle}
        >
          <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" strokeWidth={2.5} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-xs sm:text-sm font-bold text-black tracking-tight truncate max-w-22 xs:max-w-36 sm:max-w-60 md:max-w-96">
              {title || "Untitled"}
            </h1>

            {/* Dynamic Status Badges matching Blog editor design */}
            {isEditMode && isScheduled ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 xs:px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs shrink-0 cursor-default ${
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
                      <span className="hidden xs:inline">{scheduleBadgeText}</span>
                    </span>
                  }
                />
                <TooltipContent side="bottom">
                  <p className="text-xs">{scheduleBadgeTooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : isEditMode && status === "draft" ? (
              <span className="inline-flex items-center gap-1.5 px-2 xs:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${
                    isDirty ? "animate-pulse" : ""
                  }`}
                />
                <span className="hidden xs:inline">
                  {isDirty
                    ? "Unsaved Edits"
                    : "Draft · Saved"}
                </span>
              </span>
            ) : isEditMode && status === "published" ? (
              hasCloudDraft || loadedFromBackup ? (
                <span className="inline-flex items-center gap-1.5 px-2 xs:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs shrink-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${
                      isDirty ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="hidden xs:inline">
                    {isDirty ? "Live · Unsaved Edits" : "Live · Draft Staged"}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 xs:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs shrink-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${
                      isDirty ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="hidden xs:inline">
                    {isDirty ? "Unsaved Changes" : "Live Published"}
                  </span>
                </span>
              )
            ) : !isEditMode ? (
              <span className="inline-flex items-center gap-1.5 px-2 xs:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-300 shadow-xs shrink-0">
                <span className="hidden xs:inline">Draft</span>
              </span>
            ) : null}
          </div>

          {subtitle && (
            <p className="hidden md:block text-xs text-black font-medium mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: Segmented View Switcher (Visual Editor vs SEO Suite) */}
      {onViewChange && (
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 sm:p-1 rounded-lg border border-border shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => onViewChange("editor")}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 text-xs rounded-md transition-all cursor-pointer ${
              activeView === "editor"
                ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm font-bold border border-border/80"
                : "text-muted-foreground hover:text-foreground font-medium hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Visual Editor</span>
            <span className="sm:hidden text-[11px]">Editor</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange("seo")}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 text-xs rounded-md transition-all cursor-pointer ${
              activeView === "seo"
                ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm font-bold border border-border/80"
                : "text-muted-foreground hover:text-foreground font-medium hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">SEO Suite</span>
            <span className="sm:hidden text-[11px]">SEO</span>
            {typeof seoScore === "number" && (
              <span
                className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold ${
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
          ) : null}
        </div>

        {/* Desktop / Tablet Icon Row (sm+) */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
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

          {/* Revision History Clock Button */}
          {isEditMode && onOpenHistory && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    type="button"
                    onClick={onOpenHistory}
                    className="h-9 w-9 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer flex items-center justify-center"
                  >
                    <History className="w-4 h-4 text-muted-foreground" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                <p className="text-xs">Revision History</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Split Publish Button with Save Draft, Preview, History & Schedule Dropdown */}
        <div className="flex items-center">
          <Button
            onClick={onPublish}
            disabled={isPublishing || isSavingDraft || !canPublish}
            className={`flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-4 text-[11px] sm:text-xs font-bold rounded-sm ${
              onSaveDraft || onOpenSchedule || isScheduled || onPreview || (isEditMode && onOpenHistory) ? "rounded-r-none" : ""
            } shadow-md transition-all hover:scale-[1.02] ${
              isScheduled
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-black hover:bg-black/90 text-white"
            } disabled:opacity-50 cursor-pointer`}
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : isScheduled ? (
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span className="truncate max-w-18.75 xs:max-w-none">{effectivePublishLabel}</span>
          </Button>

          {(onSaveDraft || onOpenSchedule || isScheduled || onPreview || (isEditMode && onOpenHistory)) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    className={`h-8 sm:h-9 w-7 sm:w-8 p-0 rounded-sm rounded-l-none border-l border-white/20 ${
                      isScheduled
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-black hover:bg-black/90"
                    } text-white shadow-md cursor-pointer flex items-center justify-center`}
                  />
                }
              >
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={6}
                className="w-56 sm:w-60"
              >
                {/* 1. Save Draft */}
                {onSaveDraft && (
                  <DropdownMenuItem
                    onClick={onSaveDraft}
                    disabled={isPublishing || isSavingDraft || !canSaveDraft}
                    className="cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Save Draft</span>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )}

                {/* 2. Live Preview */}
                {onPreview && (
                  <DropdownMenuItem
                    onClick={onPreview}
                    disabled={isPreviewSaving || isPublishing || isSavingDraft}
                    className="cursor-pointer"
                  >
                    {isPreviewSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                    )}
                    <span>{isPreviewSaving ? "Saving for preview..." : "Live Preview"}</span>
                  </DropdownMenuItem>
                )}

                {/* 3. Revision History */}
                {isEditMode && onOpenHistory && (
                  <DropdownMenuItem
                    onClick={onOpenHistory}
                    className="cursor-pointer"
                  >
                    <History className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Revision History</span>
                  </DropdownMenuItem>
                )}

                {/* Separator if schedule options exist */}
                {(onOpenSchedule || isScheduled) && (onSaveDraft || onPreview || onOpenHistory) && (
                  <DropdownMenuSeparator />
                )}

                {/* 4. Schedule for later / Reschedule */}
                {onOpenSchedule && (
                  <DropdownMenuItem
                    onClick={onOpenSchedule}
                    disabled={isPublishing || isSavingDraft || (!isScheduled && !canScheduleForLater)}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                      <span>
                        {isScheduled
                          ? "Reschedule Release..."
                          : "Schedule for Later..."}
                      </span>
                    </div>
                    {!isScheduled && !canScheduleForLater && (
                      <span className="text-[10px] text-muted-foreground italic font-normal ml-2">
                        (Edit first)
                      </span>
                    )}
                  </DropdownMenuItem>
                )}

                {/* 5. Publish Immediately if Scheduled */}
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

                {/* 6. Revert Scheduled to Draft */}
                {isScheduled && onCancelSchedule && (
                  <DropdownMenuItem
                    onClick={onCancelSchedule}
                    disabled={isPublishing || isSavingDraft}
                    className="cursor-pointer text-muted-foreground hover:text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    <span>Cancel Schedule (Draft)</span>
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
