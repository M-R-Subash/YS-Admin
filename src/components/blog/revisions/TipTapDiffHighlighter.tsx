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

interface ParsedPrefix {
  type: "h1" | "h2" | "h3" | "bullet" | "quote" | "p";
  text: string;
}

function parsePrefix(raw: string): ParsedPrefix {
  let line = raw;
  if (line.startsWith("### ")) {
    return { type: "h3", text: line.replace(/^###\s+/, "") };
  }
  if (line.startsWith("## ")) {
    return { type: "h2", text: line.replace(/^##\s+/, "") };
  }
  if (line.startsWith("# ")) {
    return { type: "h1", text: line.replace(/^#\s+/, "") };
  }
  if (line.startsWith("• ")) {
    return { type: "bullet", text: line.replace(/^•\s+/, "") };
  }
  if (line.startsWith("> ")) {
    return { type: "quote", text: line.replace(/^>\s+/, "") };
  }
  return { type: "p", text: line };
}

function renderElementWrapper(
  type: ParsedPrefix["type"],
  content: React.ReactNode,
  key: string | number,
  extraClasses = ""
) {
  if (type === "h1") {
    return (
      <h1 key={key} className={`text-2xl font-extrabold text-foreground mt-5 mb-2 ${extraClasses}`}>
        {content}
      </h1>
    );
  }
  if (type === "h2") {
    return (
      <h2 key={key} className={`text-xl font-bold text-foreground mt-4 mb-2 ${extraClasses}`}>
        {content}
      </h2>
    );
  }
  if (type === "h3") {
    return (
      <h3 key={key} className={`text-lg font-semibold text-foreground mt-3 mb-1.5 ${extraClasses}`}>
        {content}
      </h3>
    );
  }
  if (type === "bullet") {
    return (
      <div key={key} className={`flex items-start gap-2 text-foreground/90 my-1 pl-2 ${extraClasses}`}>
        <span className="text-primary font-bold select-none">•</span>
        <div className="leading-relaxed flex-1">{content}</div>
      </div>
    );
  }
  if (type === "quote") {
    return (
      <blockquote
        key={key}
        className={`border-l-3 border-muted-foreground/40 pl-3 italic text-muted-foreground my-2 ${extraClasses}`}
      >
        {content}
      </blockquote>
    );
  }
  return (
    <p key={key} className={`text-foreground/90 leading-relaxed my-2.5 ${extraClasses}`}>
      {content}
    </p>
  );
}

interface DiffRow {
  type: "unchanged" | "modified" | "removed" | "added";
  oldLine?: string;
  newLine?: string;
}

export function TipTapDiffHighlighter({
  oldContent,
  newContent,
  side,
  className = "",
}: TipTapDiffHighlighterProps) {
  const oldLines = useMemo(() => extractTipTapLines(oldContent), [oldContent]);
  const newLines = useMemo(() => extractTipTapLines(newContent), [newContent]);

  // Compute block-level line diffs and group into paired rows
  const rows: DiffRow[] = useMemo(() => {
    const rawBlocks = diffLines(oldLines.join("\n"), newLines.join("\n"));
    const result: DiffRow[] = [];

    for (let i = 0; i < rawBlocks.length; i++) {
      const block = rawBlocks[i];
      const nextBlock = rawBlocks[i + 1];

      // Pair adjacent removed + added blocks as modified rows
      if (block.removed && nextBlock && nextBlock.added) {
        const removedLines = block.value.replace(/\n$/, "").split("\n");
        const addedLines = nextBlock.value.replace(/\n$/, "").split("\n");
        const minLen = Math.min(removedLines.length, addedLines.length);

        for (let k = 0; k < minLen; k++) {
          result.push({ type: "modified", oldLine: removedLines[k], newLine: addedLines[k] });
        }
        for (let k = minLen; k < removedLines.length; k++) {
          result.push({ type: "removed", oldLine: removedLines[k] });
        }
        for (let k = minLen; k < addedLines.length; k++) {
          result.push({ type: "added", newLine: addedLines[k] });
        }
        i++; // skip nextBlock
      } else if (block.removed) {
        const removedLines = block.value.replace(/\n$/, "").split("\n");
        for (const line of removedLines) {
          result.push({ type: "removed", oldLine: line });
        }
      } else if (block.added) {
        const addedLines = block.value.replace(/\n$/, "").split("\n");
        for (const line of addedLines) {
          result.push({ type: "added", newLine: line });
        }
      } else {
        const unchangedLines = block.value.replace(/\n$/, "").split("\n");
        for (const line of unchangedLines) {
          result.push({ type: "unchanged", oldLine: line, newLine: line });
        }
      }
    }

    return result;
  }, [oldLines, newLines]);

  return (
    <div className={`space-y-1 text-sm leading-relaxed ${className}`}>
      {rows.map((row, rowIdx) => {
        // 1. UNCHANGED ROW: render normally on both sides
        if (row.type === "unchanged" && row.oldLine !== undefined) {
          const parsed = parsePrefix(row.oldLine);
          return renderElementWrapper(parsed.type, parsed.text, `row-${rowIdx}`);
        }

        // 2. MODIFIED ROW: word-level diffing between oldLine and newLine
        if (row.type === "modified" && row.oldLine !== undefined && row.newLine !== undefined) {
          const parsedOld = parsePrefix(row.oldLine);
          const parsedNew = parsePrefix(row.newLine);
          const elemType = side === "old" ? parsedOld.type : parsedNew.type;

          const wordDiffs = diffWordsWithSpace(parsedOld.text, parsedNew.text);

          const renderedWords = wordDiffs.map((part: Change, partIdx: number) => {
            if (side === "old") {
              if (part.added) return null; // Old side doesn't have newly added words
              if (part.removed) {
                return (
                  <span
                    key={`w-${rowIdx}-${partIdx}`}
                    className="bg-red-500/20 text-red-950 dark:text-red-200 font-semibold px-1 py-0.5 rounded-xs border-b border-red-500/50"
                  >
                    {part.value}
                  </span>
                );
              }
              return <span key={`w-${rowIdx}-${partIdx}`}>{part.value}</span>;
            }

            // side === "new"
            if (part.removed) return null; // New side doesn't have removed words
            if (part.added) {
              return (
                <span
                  key={`w-${rowIdx}-${partIdx}`}
                  className="bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 font-semibold px-1 py-0.5 rounded-xs border-b border-emerald-500/50"
                >
                  {part.value}
                </span>
              );
            }
            return <span key={`w-${rowIdx}-${partIdx}`}>{part.value}</span>;
          });

          return renderElementWrapper(elemType, renderedWords, `row-${rowIdx}`);
        }

        // 3. FULLY REMOVED ROW (Content deleted from newer version)
        if (row.type === "removed" && row.oldLine !== undefined) {
          if (side === "old") {
            const parsed = parsePrefix(row.oldLine);
            return (
              <div
                key={`row-${rowIdx}`}
                className="p-2.5 my-2 rounded-r-md bg-red-500/10 border-l-4 border-red-500 text-red-950 dark:text-red-200 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1 select-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">
                    Removed
                  </span>
                </div>
                <div className="font-medium">
                  {parsed.type === "bullet" && <span className="mr-1.5 select-none">•</span>}
                  {parsed.type === "quote" && <span className="mr-1.5 italic">“</span>}
                  {parsed.text}
                  {parsed.type === "quote" && <span className="ml-1.5 italic">”</span>}
                </div>
              </div>
            );
          }

          // side === "new" shows alignment spacer
          return (
            <div
              key={`row-${rowIdx}`}
              className="p-2 my-2 rounded-r-md border-l-4 border-dashed border-border/70 bg-muted/15 text-[11px] text-muted-foreground/60 italic select-none"
            >
              (Removed in this version)
            </div>
          );
        }

        // 4. FULLY ADDED ROW (Content added to newer version)
        if (row.type === "added" && row.newLine !== undefined) {
          if (side === "new") {
            const parsed = parsePrefix(row.newLine);
            return (
              <div
                key={`row-${rowIdx}`}
                className="p-2.5 my-2 rounded-r-md bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-950 dark:text-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1 select-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                    Added
                  </span>
                </div>
                <div className="font-semibold">
                  {parsed.type === "bullet" && <span className="mr-1.5 select-none">•</span>}
                  {parsed.type === "quote" && <span className="mr-1.5 italic">“</span>}
                  {parsed.text}
                  {parsed.type === "quote" && <span className="ml-1.5 italic">”</span>}
                </div>
              </div>
            );
          }

          // side === "old" shows alignment spacer
          return (
            <div
              key={`row-${rowIdx}`}
              className="p-2 my-2 rounded-r-md border-l-4 border-dashed border-border/70 bg-muted/15 text-[11px] text-muted-foreground/60 italic select-none"
            >
              (Added in new version)
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
