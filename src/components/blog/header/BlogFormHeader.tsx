"use client";

import React from "react";
import { useRouter } from "next/navigation";
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
import { useBlogForm } from "../context/BlogFormContext";

export function BlogFormHeader() {
  const router = useRouter();
  const {
    isEditMode,
    isSubmitting,
    isDirtyOrFilled,
    hasCloudDraft,
    loadedFromBackup,
    lastSavedAt,
    isFullscreen,
    setIsFullscreen,
    handleSave,
    handlePreview,
    isPreviewSaving,
    setShowExitConfirm,
    watch,
  } = useBlogForm();

  const status = watch("status");

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 shadow-sm z-50 relative">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (isDirtyOrFilled) {
              setShowExitConfirm(true);
            } else {
              router.push("/blogs");
            }
          }}
          className="p-2 rounded-sm bg-black border border-black hover:bg-zinc-800 transition-all text-white shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-black tracking-tight">
              {isEditMode ? "Edit Blog Post" : "Create Blog Post"}
            </h1>
            {isEditMode && status === "draft" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${isDirtyOrFilled ? "animate-pulse" : ""}`}
                />
                {isDirtyOrFilled ? "Unsaved Edits" : lastSavedAt ? `Draft · Saved ${lastSavedAt}` : "Draft Saved"}
              </span>
            ) : isEditMode && status === "published" ? (
              hasCloudDraft || loadedFromBackup ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${isDirtyOrFilled ? "animate-pulse" : ""}`}
                  />
                  {isDirtyOrFilled ? "Live · Unsaved Edits" : "Live · Draft Staged"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isDirtyOrFilled ? "animate-pulse" : ""}`}
                  />
                  {isDirtyOrFilled ? "Unsaved Changes" : "Live Published"}
                </span>
              )
            ) : null}
          </div>
          <p className="text-xs text-black font-medium mt-1">
            {isEditMode ? "Make changes to your article." : "Write and publish a new article."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Autosave Status Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium mr-1">
          {isSubmitting ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          ) : isDirtyOrFilled ? (
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

        {/* Preview Button (Icon-Only with Tooltip) */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="outline"
              type="button"
              disabled={isPreviewSaving || isSubmitting}
              onClick={handlePreview}
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
              {isPreviewSaving ? "Saving draft for live preview..." : "Live preview (auto-saves draft)"}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Fullscreen Toggle Button (Icon-Only, lg+ only) */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
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
            <p className="text-xs">{isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Split Publish Button with Save Draft Dropdown */}
        <div className="flex items-center">
          <Button
            onClick={() => handleSave("published")}
            disabled={
              isSubmitting ||
              (isEditMode
                ? status === "published" && !hasCloudDraft && !loadedFromBackup && !isDirtyOrFilled
                : !isDirtyOrFilled)
            }
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm rounded-r-none shadow-md transition-all hover:scale-[1.02] bg-black hover:bg-black/90 text-white disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isEditMode && status === "published" ? (hasCloudDraft || loadedFromBackup ? "Publish" : "Update") : "Publish"}
          </Button>
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
                onClick={() => handleSave("draft")}
                disabled={isSubmitting || !isDirtyOrFilled}
                className="cursor-pointer"
              >
                <Save className="w-4 h-4 mr-2 text-muted-foreground" />
                Save Draft
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
