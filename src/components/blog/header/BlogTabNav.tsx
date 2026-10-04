"use client";

import React from "react";
import { Settings2, FileText, HelpCircle, Globe } from "lucide-react";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogTabNav() {
  const { editorTab, setEditorTab, isFullscreen, errors } = useBlogForm();

  return (
    <div
      className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 ${
        isFullscreen
          ? "max-h-0 opacity-0 -mb-2.5 pointer-events-none"
          : "max-h-16 opacity-100 mb-0"
      }`}
    >
      <div className="flex items-center justify-between shrink-0 pb-0.5 sm:pb-1 max-w-full overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 bg-muted/60 border border-border/80 rounded-lg overflow-x-auto no-scrollbar max-w-full touch-pan-x">
          <button
            type="button"
            onClick={() => setEditorTab("general")}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              editorTab === "general"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 shrink-0" />
            <span>General Info</span>
            {(errors.title || errors.featuredImage || errors.categories || errors.excerpt) && (
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("content")}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              editorTab === "content"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Article Content</span>
            {errors.content && (
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("faqs")}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              editorTab === "faqs"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>FAQs</span>
            {errors.faqs && (
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("seo")}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              editorTab === "seo"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>SEO &amp; Social</span>
            {(errors.slug || errors.metaTitle || errors.metaDesc || errors.canonicalUrl) && (
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
