"use client";

import React from "react";
import {
  Settings2,
  FileText,
  HelpCircle,
  Globe,
  Loader2,
  Send,
  Save,
  Eye,
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
import { toast } from "@/components/ui/toast";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogFullscreenToolbar() {
  const {
    isEditMode,
    isSubmitting,
    isDirtyOrFilled,
    hasCloudDraft,
    loadedFromBackup,
    lastSavedAt,
    previewSecret,
    isFullscreen,
    setIsFullscreen,
    editorTab,
    setEditorTab,
    errors,
    handleSave,
    watch,
  } = useBlogForm();

  const status = watch("status");
  const slug = watch("slug");

  return (
    <div
      className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 ${
        isFullscreen
          ? "max-h-16 opacity-100 translate-y-0 border-b border-border"
          : "max-h-0 opacity-0 -translate-y-2 border-b-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-card shrink-0 shadow-sm z-50">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-lg">
          <button
            type="button"
            onClick={() => setEditorTab("general")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              editorTab === "general"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            General
            {(errors.title || errors.featuredImage || errors.categories || errors.excerpt) && (
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("content")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              editorTab === "content"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Article
            {errors.content && (
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("faqs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              editorTab === "faqs"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            FAQs
            {errors.faqs && (
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("seo")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              editorTab === "seo"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            SEO
            {(errors.slug || errors.metaTitle || errors.metaDesc || errors.canonicalUrl) && (
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
        </div>

        {/* Right side: autosave + preview + exit fullscreen + publish */}
        <div className="flex items-center gap-2">
          {/* Autosave indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium mr-1">
            {isSubmitting ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            ) : isDirtyOrFilled ? (
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                Saved
              </span>
            ) : null}
          </div>

          {/* Preview */}
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (!slug) {
                    toast.add({ title: "Slug Required", description: "Enter a URL slug in SEO tab to preview.", type: "warning" });
                    return;
                  }
                  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";
                  const previewUrl = previewSecret
                    ? `${frontendUrl}/api/draft?secret=${previewSecret}&slug=/blogs/${slug}`
                    : `${frontendUrl}/blogs/${slug}`;
                  window.open(previewUrl, "_blank", "noopener,noreferrer");
                }}
                className="h-8 w-8 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer flex items-center justify-center"
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Preview draft</p>
            </TooltipContent>
          </Tooltip>

          {/* Exit Fullscreen */}
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="h-8 w-8 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer flex items-center justify-center"
              >
                <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Exit fullscreen (Esc)</p>
            </TooltipContent>
          </Tooltip>

          {/* Split Publish */}
          <div className="flex items-center">
            <Button
              onClick={() => handleSave("published")}
              disabled={
                isSubmitting ||
                (isEditMode
                  ? status === "published" && !hasCloudDraft && !loadedFromBackup && !isDirtyOrFilled
                  : !isDirtyOrFilled)
              }
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-sm rounded-r-none shadow-md bg-black hover:bg-black/90 text-white disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isEditMode && status === "published" ? (hasCloudDraft || loadedFromBackup ? "Publish" : "Update") : "Publish"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    className="h-8 w-7 p-0 rounded-sm rounded-l-none border-l border-white/20 bg-black hover:bg-black/90 text-white shadow-md cursor-pointer flex items-center justify-center"
                  />
                }
              >
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-44">
                <DropdownMenuItem onClick={() => handleSave("draft")} disabled={isSubmitting || !isDirtyOrFilled} className="cursor-pointer">
                  <Save className="w-4 h-4 mr-2 text-muted-foreground" />
                  Save Draft
                  <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
