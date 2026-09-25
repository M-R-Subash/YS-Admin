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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";

export interface EditorTopBarProps {
  title: string;
  subtitle?: string;
  status: string; // "draft" | "published"
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

  // Save / Publish
  onPublish: () => void;
  isPublishing?: boolean;
  canPublish?: boolean;
  publishLabel?: string;

  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  canSaveDraft?: boolean;

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
  extraActions,
  className = "",
}: EditorTopBarProps) {
  const isPublished = status === "published";
  const defaultPublishLabel = isPublished
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
            {isEditMode && status === "draft" ? (
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
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-border shadow-xs">
          <button
            type="button"
            onClick={() => onViewChange("editor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeView === "editor"
                ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Visual Editor</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange("seo")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeView === "seo"
                ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>SEO Suite</span>
            {typeof seoScore === "number" && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  seoScore >= 80
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : seoScore >= 50
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
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
            <TooltipTrigger>
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
            </TooltipTrigger>
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
            <TooltipTrigger>
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
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                {isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Split Publish Button with Save Draft Dropdown */}
        <div className="flex items-center">
          <Button
            onClick={onPublish}
            disabled={isPublishing || isSavingDraft || !canPublish}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm rounded-r-none shadow-md transition-all hover:scale-[1.02] bg-black hover:bg-black/90 text-white disabled:opacity-50 cursor-pointer"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {effectivePublishLabel}
          </Button>

          {onSaveDraft && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    className="h-9 w-8 p-0 rounded-sm rounded-l-none border-l border-white/20 bg-black hover:bg-black/90 text-white shadow-md cursor-pointer flex items-center justify-center"
                  />
                }
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-44">
                <DropdownMenuItem
                  onClick={onSaveDraft}
                  disabled={isPublishing || isSavingDraft || !canSaveDraft}
                  className="cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-2 text-muted-foreground" />
                  Save Draft
                  <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {extraActions}
      </div>
    </header>
  );
}
