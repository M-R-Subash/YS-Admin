"use client";

import { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  Filter,
} from "lucide-react";
import type { SeoAnalysisResult } from "@/types/seo";

interface SeoHealthAdvisorProps {
  analysis: SeoAnalysisResult;
  isCalculating?: boolean;
  className?: string;
}

export function SeoHealthAdvisor({
  analysis,
  isCalculating = false,
  className = "",
}: SeoHealthAdvisorProps) {
  const [filter, setFilter] = useState<"all" | "issues" | "passed">("all");

  const { score, items, hasKeyword, keywordCount, density, densityStatus, wordCount, readability } = analysis;

  const passedCount = items.filter((i) => i.passed).length;
  const issuesCount = items.filter((i) => !i.passed).length;

  const filteredItems = items.filter((item) => {
    if (filter === "passed") return item.passed;
    if (filter === "issues") return !item.passed;
    return true;
  });

  return (
    <div className={`border border-border rounded-xl bg-card shadow-2xs overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-3.5 text-sm font-bold text-foreground border-b border-border bg-muted/30">
        <span className="flex items-center gap-2">
          <Sparkles
            className={`size-4 text-primary ${
              isCalculating ? "text-amber-500 animate-pulse" : ""
            }`}
          />
          <span>SEO Health Advisor</span>
        </span>

        {isCalculating ? (
          <span className="text-[10px] font-semibold text-muted-foreground animate-pulse font-mono">
            Analyzing...
          </span>
        ) : hasKeyword ? (
          <span
            className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border font-mono ${
              score >= 80
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : score >= 50
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {score} / 100
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className={`p-4 space-y-4 flex-1 flex flex-col min-h-0 ${isCalculating ? "opacity-70" : "opacity-100"} transition-opacity`}>
        {!hasKeyword ? (
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex items-start gap-3">
            <Sparkles className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">Target Keyword Advisor</p>
              <p className="text-[11px] leading-relaxed">
                Add a <strong>Focus Target Keyword</strong> in Core Search Details to unlock real-time scoring, keyword density checks, heading placement, and readability analysis.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
            {/* Pinned Top Metrics & Filters */}
            <div className="shrink-0 space-y-3.5">
              {/* Progress Bar & Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Optimization Score
                  </span>
                  <span
                    className={`font-bold ${
                      score >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : score >= 50
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {score >= 80
                      ? "Well Optimized"
                      : score >= 50
                      ? "Needs Improvement"
                      : "Poorly Optimized"}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      score >= 80
                        ? "bg-emerald-500"
                        : score >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                  />
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-muted/40 rounded-lg border border-border/60 text-center">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                    Matches
                  </span>
                  <span className="text-xs font-extrabold text-foreground font-mono">
                    {keywordCount}x
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                    Density
                  </span>
                  <span
                    className={`text-xs font-extrabold font-mono ${
                      densityStatus === "optimal"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {density}%
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                    Words
                  </span>
                  <span className="text-xs font-extrabold text-foreground font-mono">
                    {wordCount}
                  </span>
                </div>
              </div>

              {/* Readability Score snippet if available */}
              {readability && (
                <div className="flex items-center justify-between p-2.5 bg-muted/20 border border-border/50 rounded-lg text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <BookOpen className="size-3.5" />
                    Readability Ease:
                  </span>
                  <span className="font-bold text-foreground">
                    {readability.grade} ({readability.fleschScore}/100)
                  </span>
                </div>
              )}

              {/* Filter Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Filter className="size-3" />
                  Audit Checklist ({items.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                      filter === "all"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("issues")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                      filter === "issues"
                        ? "bg-rose-500 text-white"
                        : "text-rose-600 dark:text-rose-400 hover:opacity-80"
                    }`}
                  >
                    Issues ({issuesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("passed")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                      filter === "passed"
                        ? "bg-emerald-500 text-white"
                        : "text-emerald-600 dark:text-emerald-400 hover:opacity-80"
                    }`}
                  >
                    Passed ({passedCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Check List Items */}
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                    item.passed
                      ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                      : item.severity === "critical"
                      ? "bg-rose-500/5 border-rose-500/20 text-foreground"
                      : "bg-amber-500/5 border-amber-500/20 text-foreground"
                  }`}
                >
                  {item.passed ? (
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : item.severity === "critical" ? (
                    <XCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs leading-none">{item.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                        {item.score}/{item.maxScore}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
