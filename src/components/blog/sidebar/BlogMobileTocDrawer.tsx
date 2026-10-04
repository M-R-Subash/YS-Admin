"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ListTree } from "lucide-react";
import { BlogTableOfContents } from "./BlogTableOfContents";
import { BlogArticleInsights } from "./BlogArticleInsights";
import { useBlogForm } from "../context/BlogFormContext";

interface BlogMobileTocDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlogMobileTocDrawer({ open, onOpenChange }: BlogMobileTocDrawerProps) {
  const { readingTime, editorWordCount, seoAnalysis, tocItems } = useBlogForm();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border"
      >
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <ListTree className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-sm sm:text-base font-bold">
                Outline &amp; Insights
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {tocItems.length} section{tocItems.length !== 1 ? "s" : ""} · {readingTime} min read · {editorWordCount ?? seoAnalysis.wordCount} words
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 custom-scrollbar">
          {/* Article Overview Stats */}
          <BlogArticleInsights />

          {/* Interactive TOC list */}
          <div className="min-h-[300px] flex flex-col">
            <BlogTableOfContents onItemClick={() => onOpenChange(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
