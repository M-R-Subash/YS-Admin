"use client";

import React from "react";
import {
  ChevronLeft,
  ExternalLink,
  Eye,
  Cloud,
  Check,
  Loader2,
} from "lucide-react";

export interface EditorTopBarProps {
  title: string;
  slug?: string;
  status: string; // "draft" | "published"
  hasCloudDraft?: boolean;
  isDirty?: boolean;
  lastSavedAt?: string | null;
  onBack: () => void;
  backTitle?: string;
  viewLiveUrl?: string;
  onPreview?: () => void;
  isPreviewLoading?: boolean;
  previewLabel?: string;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  canSaveDraft?: boolean;
  onPublish?: () => void;
  isPublishing?: boolean;
  canPublish?: boolean;
  publishLabel?: string;
  extraActions?: React.ReactNode;
  className?: string;
}

export function EditorTopBar({
  title,
  slug,
  status,
  hasCloudDraft = false,
  isDirty = false,
  lastSavedAt = null,
  onBack,
  backTitle = "Back",
  viewLiveUrl,
  onPreview,
  isPreviewLoading = false,
  previewLabel = "Live Preview",
  onSaveDraft,
  isSavingDraft = false,
  canSaveDraft = true,
  onPublish,
  isPublishing = false,
  canPublish = true,
  publishLabel,
  extraActions,
  className = "",
}: EditorTopBarProps) {
  const isPublished = status === "published";
  const defaultPublishLabel = isPublished ? "Publish Changes" : "Publish Page";
  const effectivePublishLabel = publishLabel || defaultPublishLabel;

  return (
    <header
      className={`flex items-center justify-between px-6 py-3.5 border-b border-border bg-card shrink-0 shadow-sm z-10 ${className}`}
    >
      {/* Left: Back & Title & Draft Status Badge */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-sm bg-black border border-black hover:bg-zinc-800 transition-all text-white shadow-sm cursor-pointer shrink-0"
          title={backTitle}
        >
          <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-black tracking-tight truncate max-w-70 sm:max-w-100">
              {title || "Untitled"}
            </h1>

            {/* Status Badge */}
            {hasCloudDraft ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs shrink-0">
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
            ) : isPublished ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isDirty ? "Live · Unsaved" : "Live Published"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-300 shadow-xs shrink-0">
                {isDirty ? "Unsaved Edits" : "Draft"}
              </span>
            )}
          </div>

          {slug !== undefined && (
            <p className="text-xs text-zinc-600 font-medium truncate">
              Slug : {slug}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* External Live Site Link */}
        {viewLiveUrl && (
          <a
            href={viewLiveUrl}
            onClick={(e) => {
              e.preventDefault();
              const separator = viewLiveUrl.includes("?") ? "&" : "?";
              window.open(`${viewLiveUrl}${separator}nocache=${Date.now()}`, "_blank");
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-sm transition-all shadow-xs cursor-pointer"
          >
            <span>View Live</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
          </a>
        )}

        {/* Live Preview Button */}
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            disabled={isPreviewLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-sm transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Open Live Preview"
          >
            {isPreviewLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span>{previewLabel}</span>
          </button>
        )}

        {/* Save Draft Button */}
        {onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSavingDraft || isPublishing || !canSaveDraft}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-sm border transition-all ${
              isSavingDraft || isPublishing || !canSaveDraft
                ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                : "bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 shadow-xs cursor-pointer"
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
          </button>
        )}

        {/* Publish Changes Button */}
        {onPublish && (
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing || isSavingDraft || !canPublish}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-sm shadow-sm transition-all ${
              isPublishing || isSavingDraft || !canPublish
                ? "bg-black/40 text-white/70 cursor-not-allowed"
                : "bg-black hover:bg-zinc-800 text-white cursor-pointer hover:scale-[1.01]"
            }`}
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isPublishing ? "Publishing..." : effectivePublishLabel}</span>
          </button>
        )}

        {/* Custom Actions (Fullscreen button, Dropdowns, Tabs, etc.) */}
        {extraActions}
      </div>
    </header>
  );
}
