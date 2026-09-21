"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogArticleInsights() {
  const {
    readingTime,
    editorWordCount,
    seoAnalysis,
    tocItems,
    extractedDoc,
    setEditorTab,
  } = useBlogForm();

  return (
    <div className="shrink-0 border border-border rounded-xl bg-card shadow-sm overflow-hidden p-4 space-y-3.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
        Article Overview
      </span>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Reading Time
          </span>
          <span className="text-sm font-extrabold text-foreground mt-0.5 block">
            {readingTime} min
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Word Count
          </span>
          <span className="text-sm font-extrabold text-foreground mt-0.5 block">
            {editorWordCount ?? seoAnalysis.wordCount}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/60">
        <div className="flex items-center justify-between py-0.5">
          <span>Subheadings:</span>
          <strong className="text-foreground">{tocItems.length}</strong>
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span>Document Images:</span>
          <strong className="text-foreground">{extractedDoc.imageNodes.length}</strong>
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span>Internal/External Links:</span>
          <strong className="text-foreground">{extractedDoc.linkNodes.length}</strong>
        </div>
      </div>

      {/* Mini SEO Shortcut */}
      <div className="pt-2 border-t border-border/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground">SEO Health</span>
          {seoAnalysis.hasKeyword ? (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                seoAnalysis.score >= 80
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : seoAnalysis.score >= 50
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {seoAnalysis.score} / 100
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">No Keyword</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditorTab("seo")}
          className="w-full text-center py-1.5 px-3 rounded-md text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer flex items-center justify-center gap-1"
        >
          <span>Open SEO &amp; Meta Tab</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
