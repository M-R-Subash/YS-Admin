"use client";

import React from "react";
import { ListTree, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogTableOfContents() {
  const { tocItems, tocIssues, handleTocClick } = useBlogForm();

  return (
    <div className="flex-1 min-h-0 border border-border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex w-full items-center justify-between p-3.5 text-xs font-bold uppercase tracking-wider text-foreground border-b border-border bg-accent/20 shrink-0">
        <span className="flex items-center gap-2">
          <ListTree className="w-4 h-4 text-primary" />
          Table of Contents
        </span>
        <div className="flex items-center gap-1.5">
          {tocIssues.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
            {tocItems.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
        {tocItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-6 px-3 text-center space-y-2 text-muted-foreground">
            <ListTree className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs font-semibold text-foreground">No Headings Yet</p>
            <p className="text-[11px] leading-relaxed">
              Add H2, H3, or H4 subheadings in the Article Content tab to automatically build your outline.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Heading Hierarchy Warning Banner */}
            {tocIssues.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 mb-2 rounded-lg bg-amber-50 border-border border-amber-200 text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="text-[11px] font-bold">
                    {tocIssues.length} heading hierarchy {tocIssues.length === 1 ? "issue" : "issues"}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                    Proper heading order (H2 → H3 → H4) improves SEO and accessibility.
                  </p>
                </div>
              </div>
            )}
            {tocItems.map((item, idx) => {
              const paddingLeft =
                item.level === 1
                  ? "pl-1"
                  : item.level === 2
                  ? "pl-3"
                  : item.level === 3
                  ? "pl-6"
                  : "pl-9";

              const issue = tocIssues.find((i) => i.index === idx);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTocClick(item)}
                  className={`w-full text-left py-1.5 px-2 rounded-md text-xs transition-all flex items-center gap-2 group hover:bg-muted/70 cursor-pointer ${paddingLeft} ${
                    issue ? "bg-amber-50/60 border border-amber-200/50" : ""
                  }`}
                  title={issue ? issue.message : item.text}
                >
                  <span
                    className={`text-[10px] font-bold px-1 py-0.2 rounded shrink-0 select-none ${
                      issue
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted/80 text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    H{item.level}
                  </span>
                  <span className="truncate flex-1 text-foreground/90 group-hover:text-foreground">
                    {item.text}
                  </span>
                  {issue && (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="shrink-0">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <p className="text-xs">{issue.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
