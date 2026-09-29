"use client";

import React, { useMemo } from "react";
import { diffLines, diffWordsWithSpace, Change } from "diff";
import { extractTipTapLines } from "./UnifiedDiffViewer";

interface TipTapDiffHighlighterProps {
  oldContent: any;
  newContent: any;
  side: "old" | "new";
  className?: string;
}

function renderFormattedLine(
  rawText: string,
  status: "unchanged" | "removed" | "added",
  key: string | number
) {
  let line = rawText;
  let isHeading = false;
  let headingLevel = 1;
  let isBullet = false;
  let isQuote = false;

  if (line.startsWith("### ")) {
    isHeading = true;
    headingLevel = 3;
    line = line.replace(/^###\s+/, "");
  } else if (line.startsWith("## ")) {
    isHeading = true;
    headingLevel = 2;
    line = line.replace(/^##\s+/, "");
  } else if (line.startsWith("# ")) {
    isHeading = true;
    headingLevel = 1;
    line = line.replace(/^#\s+/, "");
  } else if (line.startsWith("• ")) {
    isBullet = true;
    line = line.replace(/^•\s+/, "");
  } else if (line.startsWith("> ")) {
    isQuote = true;
    line = line.replace(/^>\s+/, "");
  }

  // Formatting based on status
  if (status === "removed") {
    return (
      <div
        key={key}
        className="p-2.5 my-2 rounded-r-md bg-red-500/10 border-l-4 border-red-500 text-red-950 dark:text-red-200 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1 select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">
            Removed
          </span>
        </div>
        <div className="line-through decoration-red-500/80 decoration-2 font-medium">
          {isBullet && <span className="mr-1.5 select-none">•</span>}
          {isQuote && <span className="mr-1.5 italic">“</span>}
          {line}
          {isQuote && <span className="ml-1.5 italic">”</span>}
        </div>
      </div>
    );
  }

  if (status === "added") {
    return (
      <div
        key={key}
        className="p-2.5 my-2 rounded-r-md bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-950 dark:text-emerald-200 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1 select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
            Added
          </span>
        </div>
        <div className="font-semibold">
          {isBullet && <span className="mr-1.5 select-none">•</span>}
          {isQuote && <span className="mr-1.5 italic">“</span>}
          {line}
          {isQuote && <span className="ml-1.5 italic">”</span>}
        </div>
      </div>
    );
  }

  // Unchanged rendering
  if (isHeading) {
    if (headingLevel === 1) {
      return (
        <h1 key={key} className="text-2xl font-extrabold text-foreground mt-5 mb-2">
          {line}
        </h1>
      );
    }
    if (headingLevel === 2) {
      return (
        <h2 key={key} className="text-xl font-bold text-foreground mt-4 mb-2">
          {line}
        </h2>
      );
    }
    return (
      <h3 key={key} className="text-lg font-semibold text-foreground mt-3 mb-1.5">
        {line}
      </h3>
    );
  }

  if (isBullet) {
    return (
      <div key={key} className="flex items-start gap-2 text-foreground/90 my-1 pl-2">
        <span className="text-primary font-bold select-none">•</span>
        <span className="leading-relaxed">{line}</span>
      </div>
    );
  }

  if (isQuote) {
    return (
      <blockquote
        key={key}
        className="border-l-3 border-muted-foreground/40 pl-3 italic text-muted-foreground my-2"
      >
        {line}
      </blockquote>
    );
  }

  return (
    <p key={key} className="text-foreground/90 leading-relaxed my-2.5">
      {line}
    </p>
  );
}

export function TipTapDiffHighlighter({
  oldContent,
  newContent,
  side,
  className = "",
}: TipTapDiffHighlighterProps) {
  const oldLines = useMemo(() => extractTipTapLines(oldContent), [oldContent]);
  const newLines = useMemo(() => extractTipTapLines(newContent), [newContent]);

  // Compute block-level line diffs
  const diffBlocks = useMemo(() => {
    return diffLines(oldLines.join("\n"), newLines.join("\n"));
  }, [oldLines, newLines]);

  return (
    <div className={`space-y-1 text-sm leading-relaxed ${className}`}>
      {diffBlocks.map((block: Change, blockIdx: number) => {
        const rawLines = block.value.replace(/\n$/, "").split("\n");

        // Old pane logic
        if (side === "old") {
          // If content was added in the new version, show alignment spacer on the old side
          if (block.added) {
            return (
              <div
                key={`spacer-${blockIdx}`}
                className="p-2 my-2 rounded-r-md border-l-4 border-dashed border-border/70 bg-muted/15 text-[11px] text-muted-foreground/60 italic select-none"
              >
                (Added in new version — {rawLines.length} line{rawLines.length > 1 ? "s" : ""})
              </div>
            );
          }

          // If content was removed in the new version, highlight in RED
          if (block.removed) {
            return rawLines.map((line, lineIdx) =>
              renderFormattedLine(line, "removed", `rem-${blockIdx}-${lineIdx}`)
            );
          }

          // Unchanged lines
          return rawLines.map((line, lineIdx) =>
            renderFormattedLine(line, "unchanged", `unc-${blockIdx}-${lineIdx}`)
          );
        }

        // New pane logic
        if (side === "new") {
          // If content was removed from the old version, show alignment spacer on the new side
          if (block.removed) {
            return (
              <div
                key={`spacer-${blockIdx}`}
                className="p-2 my-2 rounded-r-md border-l-4 border-dashed border-border/70 bg-muted/15 text-[11px] text-muted-foreground/60 italic select-none"
              >
                (Removed in this version — {rawLines.length} line{rawLines.length > 1 ? "s" : ""})
              </div>
            );
          }

          // If content was added in this version, highlight in GREEN
          if (block.added) {
            return rawLines.map((line, lineIdx) =>
              renderFormattedLine(line, "added", `add-${blockIdx}-${lineIdx}`)
            );
          }

          // Unchanged lines
          return rawLines.map((line, lineIdx) =>
            renderFormattedLine(line, "unchanged", `unc-${blockIdx}-${lineIdx}`)
          );
        }

        return null;
      })}
    </div>
  );
}
