"use client";

import React, { useMemo } from "react";
import { diffLines, Change } from "diff";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, CheckCircle2 } from "lucide-react";

interface UnifiedDiffViewerProps {
  oldContent: any;
  newContent: any;
  oldTitle?: string;
  newTitle?: string;
}

export function extractTipTapLines(node: any): string[] {
  if (!node) return [];
  if (typeof node === "string") {
    try {
      node = JSON.parse(node);
    } catch {
      return [node];
    }
  }

  const lines: string[] = [];

  function extractText(n: any): string {
    if (!n) return "";
    if (n.text) {
      const linkMark = n.marks?.find((m: any) => m.type === "link");
      if (linkMark && linkMark.attrs?.href) {
        return `[${n.text}](${linkMark.attrs.href})`;
      }
      return n.text;
    }
    if (Array.isArray(n.content)) return n.content.map(extractText).join("");
    return "";
  }

  function traverse(n: any) {
    if (!n) return;

    if (n.type === "heading") {
      const level = n.attrs?.level || 1;
      const text = extractText(n).trim();
      if (text) lines.push(`${"#".repeat(level)} ${text}`);
    } else if (n.type === "paragraph") {
      const text = extractText(n).trim();
      if (text) lines.push(text);
    } else if (n.type === "bulletList") {
      if (Array.isArray(n.content)) {
        n.content.forEach((item: any) => {
          const text = extractText(item).trim();
          if (text) lines.push(`• ${text}`);
        });
      }
    } else if (n.type === "orderedList") {
      if (Array.isArray(n.content)) {
        n.content.forEach((item: any, idx: number) => {
          const text = extractText(item).trim();
          if (text) lines.push(`${idx + 1}. ${text}`);
        });
      }
    } else if (n.type === "blockquote") {
      const text = extractText(n).trim();
      if (text) lines.push(`> ${text}`);
    } else if (n.type === "codeBlock") {
      const text = extractText(n).trim();
      if (text) lines.push(`\`\`\`\n${text}\n\`\`\``);
    } else if (n.type === "horizontalRule") {
      lines.push("---");
    } else if (n.type === "image") {
      lines.push(`[Image: ${n.attrs?.alt || n.attrs?.title || "embedded image"}]`);
    } else if (Array.isArray(n.content)) {
      n.content.forEach(traverse);
    }
  }

  traverse(node);
  return lines;
}

export function UnifiedDiffViewer({
  oldContent,
  newContent,
  oldTitle,
  newTitle,
}: UnifiedDiffViewerProps) {
  const { lineDiffs, addedCount, removedCount } = useMemo(() => {
    const oldLines = [
      oldTitle ? `# ${oldTitle}` : "",
      ...extractTipTapLines(oldContent),
    ]
      .filter(Boolean)
      .join("\n");

    const newLines = [
      newTitle ? `# ${newTitle}` : "",
      ...extractTipTapLines(newContent),
    ]
      .filter(Boolean)
      .join("\n");

    const changes = diffLines(oldLines, newLines);

    let added = 0;
    let removed = 0;

    changes.forEach((c: Change) => {
      if (c.added) added += c.count || 1;
      if (c.removed) removed += c.count || 1;
    });

    return { lineDiffs: changes, addedCount: added, removedCount: removed };
  }, [oldContent, newContent, oldTitle, newTitle]);

  if (addedCount === 0 && removedCount === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
        No textual differences between these two versions.
      </div>
    );
  }

  let oldLineNum = 1;
  let newLineNum = 1;

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="flex items-center gap-3 text-xs">
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1"
        >
          <Plus className="w-3 h-3" /> {addedCount} lines added
        </Badge>
        <Badge
          variant="outline"
          className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 font-semibold gap-1"
        >
          <Minus className="w-3 h-3" /> {removedCount} lines removed
        </Badge>
      </div>

      {/* GitHub-style diff viewer container */}
      <div className="rounded-lg border border-border/80 overflow-hidden font-mono text-xs bg-card">
        <div className="divide-y divide-border/40">
          {lineDiffs.map((change: Change, blockIdx: number) => {
            const rawLines = change.value.replace(/\n$/, "").split("\n");

            return rawLines.map((line: string, lineIdx: number) => {
              let lineClasses = "hover:bg-muted/30 text-foreground";
              let prefix = " ";
              let currentOldLine = "";
              let currentNewLine = "";

              if (change.added) {
                lineClasses =
                  "diff-change-node bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-l-4 border-emerald-500";
                prefix = "+";
                currentNewLine = String(newLineNum++);
              } else if (change.removed) {
                lineClasses =
                  "diff-change-node bg-red-500/10 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-l-4 border-red-500";
                prefix = "-";
                currentOldLine = String(oldLineNum++);
              } else {
                currentOldLine = String(oldLineNum++);
                currentNewLine = String(newLineNum++);
              }

              return (
                <div
                  key={`${blockIdx}-${lineIdx}`}
                  className={`flex items-start px-2 py-1 leading-relaxed ${lineClasses}`}
                >
                  {/* Line numbers */}
                  <span className="w-10 select-none text-[10px] text-muted-foreground/60 text-right pr-2 shrink-0">
                    {currentOldLine}
                  </span>
                  <span className="w-10 select-none text-[10px] text-muted-foreground/60 text-right pr-3 shrink-0 border-r border-border/40">
                    {currentNewLine}
                  </span>

                  {/* Prefix marker */}
                  <span className="w-5 select-none font-bold text-center shrink-0">
                    {prefix}
                  </span>

                  {/* Content line */}
                  <span className="flex-1 whitespace-pre-wrap break-words pl-1">
                    {line}
                  </span>
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
