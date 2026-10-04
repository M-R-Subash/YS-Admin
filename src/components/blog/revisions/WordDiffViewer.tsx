"use client";

import React, { useMemo } from "react";
import { diffWordsWithSpace, Change } from "diff";

interface WordDiffViewerProps {
  oldText?: string | null;
  newText?: string | null;
  mode: "old" | "new" | "unified";
  className?: string;
}

export function WordDiffViewer({
  oldText = "",
  newText = "",
  mode,
  className = "",
}: WordDiffViewerProps) {
  const diffs = useMemo(() => {
    return diffWordsWithSpace(oldText || "", newText || "");
  }, [oldText, newText]);

  return (
    <span className={className}>
      {diffs.map((part: Change, index: number) => {
        if (part.added) {
          if (mode === "old") return null; // Old version doesn't have newly added words
          return (
            <ins
              key={index}
              className="diff-change-node bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/70 font-semibold px-0.5 rounded-xs no-underline border-b border-emerald-500/40"
            >
              {part.value}
            </ins>
          );
        }

        if (part.removed) {
          if (mode === "new") return null; // New version doesn't have removed words
          return (
            <span
              key={index}
              className="diff-change-node bg-red-500/20 text-red-900 dark:text-red-300 dark:bg-red-950/70 font-semibold px-0.5 rounded-xs no-underline border-b border-red-500/40"
            >
              {part.value}
            </span>
          );
        }

        return <span key={index}>{part.value}</span>;
      })}
    </span>
  );
}
