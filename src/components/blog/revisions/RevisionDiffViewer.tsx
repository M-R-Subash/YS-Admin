"use client";

import React, { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  ArrowRightLeft,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  Loader2,
  Info,
  Folder,
} from "lucide-react";
import { TipTapDiffReader } from "./TipTapDiffReader";
import { WordDiffViewer } from "./WordDiffViewer";
import { UnifiedDiffViewer } from "./UnifiedDiffViewer";
import { TipTapDiffHighlighter } from "./TipTapDiffHighlighter";
import { RestoreConfirmDialog } from "../dialogs/RestoreConfirmDialog";
import { RevisionDetailResponse } from "@/types/revision";

interface RevisionDiffViewerProps {
  blogId: string;
  revisionId: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load");
    return res.json();
  });

function getTipTapWordCount(node: any): number {
  if (!node) return 0;
  let parsed = node;
  if (typeof node === "string") {
    try {
      parsed = JSON.parse(node);
    } catch {
      return 0;
    }
  }
  let text = "";
  function traverse(n: any) {
    if (!n) return;
    if (n.text) text += " " + n.text;
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  }
  traverse(parsed);
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function RevisionDiffViewer({ blogId, revisionId }: RevisionDiffViewerProps) {
  const router = useRouter();

  const [syncScroll, setSyncScroll] = useState(true);
  const [diffViewMode, setDiffViewMode] = useState<"visual" | "unified" | "clean">("visual");
  const [activeTab, setActiveTab] = useState<"snapshot" | "current">("snapshot");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [showMetadataDetails, setShowMetadataDetails] = useState(true);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  // 1. Fetch historical revision snapshot
  const {
    data: revData,
    error: revError,
    isLoading: revLoading,
  } = useSWR<RevisionDetailResponse>(
    blogId && revisionId ? `/api/blogs/${blogId}/revisions/${revisionId}` : null,
    fetcher
  );

  // 2. Fetch current active blog
  const {
    data: currentBlog,
    error: blogError,
    isLoading: blogLoading,
  } = useSWR(blogId ? `/api/blogs/${blogId}` : null, fetcher);

  const revision = revData?.revision;
  const snapshot = revision?.snapshotData;

  // Synchronized scrolling implementation
  const handleLeftScroll = useCallback(() => {
    if (!syncScroll || isSyncingLeft.current) return;
    if (leftPaneRef.current && rightPaneRef.current) {
      isSyncingRight.current = true;
      const { scrollTop, scrollHeight, clientHeight } = leftPaneRef.current;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1);
      rightPaneRef.current.scrollTop =
        scrollRatio * (rightPaneRef.current.scrollHeight - rightPaneRef.current.clientHeight);
      requestAnimationFrame(() => {
        isSyncingRight.current = false;
      });
    }
  }, [syncScroll]);

  const handleRightScroll = useCallback(() => {
    if (!syncScroll || isSyncingRight.current) return;
    if (leftPaneRef.current && rightPaneRef.current) {
      isSyncingLeft.current = true;
      const { scrollTop, scrollHeight, clientHeight } = rightPaneRef.current;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1);
      leftPaneRef.current.scrollTop =
        scrollRatio * (leftPaneRef.current.scrollHeight - leftPaneRef.current.clientHeight);
      requestAnimationFrame(() => {
        isSyncingLeft.current = false;
      });
    }
  }, [syncScroll]);

  const handleConfirmRestore = () => {
    // Navigate back to edit page with restore query param to trigger form hydration
    setIsConfirmOpen(false);
    toast.add({
      title: "Restoring Revision",
      description: `Loading Version ${revision?.versionNumber} into editor...`,
      type: "info",
    });
    router.push(`/blogs/edit/${blogId}?restoreRevision=${revisionId}`);
  };

  const isLoading = revLoading || blogLoading;
  const hasError = revError || blogError || !revision || !currentBlog;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading revision comparison...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-4 p-6">
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20 max-w-md text-center">
          <p className="font-semibold">Unable to load comparison</p>
          <p className="text-xs mt-1 text-muted-foreground">
            The revision snapshot or blog could not be found.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/blogs/edit/${blogId}`)}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Editor
        </Button>
      </div>
    );
  }

  const snapshotDate = new Date(revision.createdAt);
  const formattedSnapshotDate = format(snapshotDate, "MMM d, yyyy 'at' h:mm a");
  const author = revision.savedBy;

  // Comparison metrics & differences
  const isTitleDifferent = (snapshot?.title || "").trim() !== (currentBlog.title || "").trim();
  const isExcerptDifferent = (snapshot?.excerpt || "").trim() !== (currentBlog.excerpt || "").trim();
  const isImageDifferent = (snapshot?.featuredImage || null) !== (currentBlog.featuredImage || null);
  const isContentIdentical =
    !isTitleDifferent &&
    !isExcerptDifferent &&
    !isImageDifferent &&
    JSON.stringify(snapshot?.content || {}) === JSON.stringify(currentBlog.content || {});

  // Consistent Symmetrical word count calculation
  const snapshotWordCount =
    snapshot?.wordCount ?? getTipTapWordCount(snapshot?.content);

  const currentWordCount = getTipTapWordCount(currentBlog?.content);
  const wordCountDiff = currentWordCount - snapshotWordCount;

  const snapshotReadingTime =
    snapshot?.readingTime ?? Math.max(1, Math.ceil(snapshotWordCount / 200));

  const currentReadingTime =
    currentBlog?.readingTime ?? Math.max(1, Math.ceil(currentWordCount / 200));

  const readingTimeDiff = currentReadingTime - snapshotReadingTime;

  const snapshotTags: string[] = snapshot?.tags || [];
  const currentTags: string[] = currentBlog?.tags || [];

  const snapshotCategories: string[] = snapshot?.categories || [];
  const currentCategories: string[] = currentBlog?.categories || [];

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Top Bar Header */}
      <header className="h-16 px-4 md:px-6 border-b border-border/80 bg-card/60 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-10">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/blogs/edit/${blogId}`)}
            className="h-9 px-3 gap-1.5 cursor-pointer hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Back to Editor</span>
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm md:text-base font-bold text-foreground truncate">
                Comparing Version {revision.versionNumber} vs Current
              </h1>
              <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0.5 bg-muted">
                v{revision.versionNumber} Snapshot
              </Badge>
              {revision.action?.startsWith("restored:") && (
                <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  Restored from v{revision.action.split(":")[1]}
                </Badge>
              )}
              <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Live Current
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Snapshot taken {formattedSnapshotDate} by {author?.name || author?.email || "Author"}
            </p>
          </div>
        </div>

        {/* Right: Controls & Restore Button */}
        <div className="flex items-center gap-2">
          {/* Diff Mode Selector */}
          <div className="flex items-center bg-muted/70 p-0.5 rounded-md border border-border/70">
            <button
              type="button"
              onClick={() => setDiffViewMode("visual")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                diffViewMode === "visual"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Side-by-side with red and green word highlights"
            >
              Visual Diff
            </button>
            <button
              type="button"
              onClick={() => setDiffViewMode("unified")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                diffViewMode === "unified"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Line-by-line red (-) and green (+) diff lines"
            >
              Unified Lines
            </button>
            <button
              type="button"
              onClick={() => setDiffViewMode("clean")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                diffViewMode === "clean"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Clean unhighlighted read-only preview"
            >
              Clean Read
            </button>
          </div>

          {/* Synchronized Scrolling Toggle (Desktop) */}
          {diffViewMode !== "unified" && (
            <Button
              variant={syncScroll ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSyncScroll((prev) => !prev)}
              className={`hidden lg:flex h-8 px-2.5 text-xs gap-1.5 cursor-pointer ${
                syncScroll ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
              }`}
              title="Keep both panes scrolling in sync"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Sync Scroll</span>
            </Button>
          )}

          {/* Toggle Metadata Summary */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetadataDetails((prev) => !prev)}
            className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer hover:bg-muted"
            title="Toggle metadata overview"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Metadata</span>
            {showMetadataDetails ? (
              <ChevronUp className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>

          {/* Restore Button */}
          <Button
            size="sm"
            onClick={() => setIsConfirmOpen(true)}
            className="h-9 px-3.5 text-xs font-bold bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 gap-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Version {revision.versionNumber}</span>
          </Button>
        </div>
      </header>

      {/* Identical Versions Notice Banner */}
      {isContentIdentical && (
        <div className="mx-4 md:mx-6 mt-3 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              <strong>Identical Versions:</strong> Both sides show the same data because Version {revision.versionNumber} is currently the active published version. To see side-by-side differences, edit the blog post and click <strong>Update</strong> to publish a new version.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/blogs/edit/${blogId}`)}
            className="h-7 text-xs px-2.5 bg-background hover:bg-muted text-foreground shrink-0 cursor-pointer"
          >
            Edit Post
          </Button>
        </div>
      )}

      {/* Mobile Tab Switcher (Visible on < lg screens) */}
      <div className="lg:hidden flex border-b border-border bg-muted/40 p-1">
        <button
          onClick={() => setActiveTab("snapshot")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === "snapshot"
              ? "bg-background shadow-xs text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Version {revision.versionNumber} Snapshot
        </button>
        <button
          onClick={() => setActiveTab("current")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === "current"
              ? "bg-background shadow-xs text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Current Version
        </button>
      </div>

      {/* Compact Symmetrical Metadata Comparison Header Strip */}
      {showMetadataDetails && (
        <div className="border-b border-border bg-muted/20 px-4 py-2 shrink-0 overflow-x-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-full">
            {/* Snapshot Metadata Box */}
            <div className="p-2.5 px-3 rounded-lg border border-border/70 bg-card text-xs space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="font-bold flex items-center gap-1.5 text-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted font-bold">
                    v{revision.versionNumber}
                  </Badge>
                  Historical Snapshot Metadata
                  {revision.action?.startsWith("restored:") && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                      (Restored from v{revision.action.split(":")[1]})
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground">{formattedSnapshotDate}</span>
              </div>

              {/* Single Inline Compact Row */}
              <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Words:</span>
                  <span className="font-semibold text-foreground">
                    {snapshotWordCount.toLocaleString()}
                  </span>
                </div>

                <span className="text-border select-none">|</span>

                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Read:</span>
                  <span className="font-semibold text-foreground">
                    {snapshotReadingTime} min
                  </span>
                </div>

                {/* Categories */}
                {(snapshotCategories.length > 0 || currentCategories.length > 0) && (
                  <>
                    <span className="text-border select-none">|</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Folder className="w-3 h-3 text-muted-foreground shrink-0" />
                      {snapshotCategories.length > 0 ? (
                        snapshotCategories.map((cat) => {
                          const wasRemoved = !currentCategories.includes(cat);
                          return (
                            <Badge
                              key={cat}
                              variant={wasRemoved ? "outline" : "secondary"}
                              className={`text-[10px] py-0 px-1.5 ${
                                wasRemoved
                                  ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400 font-semibold"
                                  : ""
                              }`}
                            >
                              {wasRemoved && <span className="mr-0.5">-</span>}
                              {cat}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </>
                )}

                {/* Tags */}
                {(snapshotTags.length > 0 || currentTags.length > 0) && (
                  <>
                    <span className="text-border select-none">|</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                      {snapshotTags.length > 0 ? (
                        snapshotTags.map((tag) => {
                          const wasRemoved = !currentTags.includes(tag);
                          return (
                            <Badge
                              key={tag}
                              variant={wasRemoved ? "outline" : "secondary"}
                              className={`text-[10px] py-0 px-1.5 ${
                                wasRemoved
                                  ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400 font-semibold"
                                  : ""
                              }`}
                            >
                              {wasRemoved && <span className="mr-0.5">-</span>}
                              {tag}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Current Metadata Box */}
            <div className="p-2.5 px-3 rounded-lg border border-border/70 bg-card text-xs space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="font-bold flex items-center gap-1.5 text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Current Live Post Metadata
                </span>
                <span className="text-[11px] text-muted-foreground">Active in database</span>
              </div>

              {/* Single Inline Compact Row */}
              <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Words:</span>
                  <span className="font-semibold text-foreground">
                    {currentWordCount.toLocaleString()}
                  </span>
                  {wordCountDiff > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
                      +{wordCountDiff}
                    </Badge>
                  )}
                  {wordCountDiff < 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1 text-red-600 dark:text-red-400 border-red-500/30 font-bold">
                      {wordCountDiff}
                    </Badge>
                  )}
                  {wordCountDiff === 0 && (
                    <span className="text-[10px] text-muted-foreground">(Same)</span>
                  )}
                </div>

                <span className="text-border select-none">|</span>

                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Read:</span>
                  <span className="font-semibold text-foreground">
                    {currentReadingTime} min
                  </span>
                  {readingTimeDiff > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
                      +{readingTimeDiff}m
                    </Badge>
                  )}
                  {readingTimeDiff < 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1 text-red-600 dark:text-red-400 border-red-500/30 font-bold">
                      {readingTimeDiff}m
                    </Badge>
                  )}
                  {readingTimeDiff === 0 && (
                    <span className="text-[10px] text-muted-foreground">(Same)</span>
                  )}
                </div>

                {/* Categories */}
                {(snapshotCategories.length > 0 || currentCategories.length > 0) && (
                  <>
                    <span className="text-border select-none">|</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Folder className="w-3 h-3 text-muted-foreground shrink-0" />
                      {currentCategories.length > 0 ? (
                        currentCategories.map((cat: string) => {
                          const wasAdded = !snapshotCategories.includes(cat);
                          return (
                            <Badge
                              key={cat}
                              variant={wasAdded ? "outline" : "secondary"}
                              className={`text-[10px] py-0 px-1.5 ${
                                wasAdded
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                                  : ""
                              }`}
                            >
                              {wasAdded && <span className="mr-0.5">+</span>}
                              {cat}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </>
                )}

                {/* Tags */}
                {(snapshotTags.length > 0 || currentTags.length > 0) && (
                  <>
                    <span className="text-border select-none">|</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                      {currentTags.length > 0 ? (
                        currentTags.map((tag: string) => {
                          const wasAdded = !snapshotTags.includes(tag);
                          return (
                            <Badge
                              key={tag}
                              variant={wasAdded ? "outline" : "secondary"}
                              className={`text-[10px] py-0 px-1.5 ${
                                wasAdded
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                                  : ""
                              }`}
                            >
                              {wasAdded && <span className="mr-0.5">+</span>}
                              {tag}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Diff Content Area */}
      {diffViewMode === "unified" ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="text-xs font-semibold text-muted-foreground">
                Line-by-line additions (+) and deletions (-)
              </span>
              <span className="text-xs text-muted-foreground">
                Version {revision.versionNumber} vs Current
              </span>
            </div>
            <UnifiedDiffViewer
              oldContent={snapshot?.content}
              newContent={currentBlog.content}
              oldTitle={snapshot?.title}
              newTitle={currentBlog.title}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Pane: Historical Snapshot */}
          <div
            ref={leftPaneRef}
            onScroll={handleLeftScroll}
            className={`flex-1 min-h-0 overflow-y-auto p-6 border-r border-border bg-card/30 ${
              activeTab === "snapshot" ? "block" : "hidden lg:block"
            }`}
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Snapshot Subheader */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold text-xs bg-muted">
                    Version {revision.versionNumber}
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Captured at publish
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formattedSnapshotDate}</span>
              </div>

              {/* Title with change badge */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Title
                  </span>
                  {isTitleDifferent && (
                    <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400 border-red-500/30">
                      Modified
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
                  {diffViewMode === "visual" ? (
                    <WordDiffViewer oldText={snapshot?.title} newText={currentBlog.title} mode="old" />
                  ) : (
                    snapshot?.title || "Untitled Post"
                  )}
                </h2>
              </div>

              {/* Featured Image */}
              {snapshot?.featuredImage && (
                <div className="rounded-lg overflow-hidden border border-border/80 bg-muted/20">
                  { }
                  <img
                    src={snapshot.featuredImage}
                    alt={snapshot.title || ""}
                    className="w-full max-h-80 object-cover"
                  />
                </div>
              )}

              {/* Excerpt */}
              {snapshot?.excerpt && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/60 italic text-sm text-muted-foreground leading-relaxed">
                  {diffViewMode === "visual" ? (
                    <WordDiffViewer oldText={snapshot.excerpt} newText={currentBlog.excerpt} mode="old" />
                  ) : (
                    snapshot.excerpt
                  )}
                </div>
              )}

              {/* TipTap Rendered Document Content */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                  Article Body
                </span>
                {diffViewMode === "visual" ? (
                  <TipTapDiffHighlighter
                    oldContent={snapshot?.content}
                    newContent={currentBlog.content}
                    side="old"
                  />
                ) : (
                  <TipTapDiffReader content={snapshot?.content} />
                )}
              </div>
            </div>
          </div>

          {/* Right Pane: Current Live Version */}
          <div
            ref={rightPaneRef}
            onScroll={handleRightScroll}
            className={`flex-1 min-h-0 overflow-y-auto p-6 bg-background ${
              activeTab === "current" ? "block" : "hidden lg:block"
            }`}
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Current Subheader */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Current Active Version
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Live in database</span>
              </div>

              {/* Current Title */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Title
                  </span>
                  {isTitleDifferent && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Updated
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
                  {diffViewMode === "visual" ? (
                    <WordDiffViewer oldText={snapshot?.title} newText={currentBlog.title} mode="new" />
                  ) : (
                    currentBlog.title || "Untitled Post"
                  )}
                </h2>
              </div>

              {/* Current Featured Image */}
              {currentBlog.featuredImage && (
                <div className="rounded-lg overflow-hidden border border-border/80 bg-muted/20">
                  { }
                  <img
                    src={currentBlog.featuredImage}
                    alt={currentBlog.title || ""}
                    className="w-full max-h-80 object-cover"
                  />
                </div>
              )}

              {/* Current Excerpt */}
              {currentBlog.excerpt && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/60 italic text-sm text-muted-foreground leading-relaxed">
                  {diffViewMode === "visual" ? (
                    <WordDiffViewer oldText={snapshot?.excerpt} newText={currentBlog.excerpt} mode="new" />
                  ) : (
                    currentBlog.excerpt
                  )}
                </div>
              )}

              {/* Current TipTap Rendered Document Content */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                  Article Body
                </span>
                {diffViewMode === "visual" ? (
                  <TipTapDiffHighlighter
                    oldContent={snapshot?.content}
                    newContent={currentBlog.content}
                    side="new"
                  />
                ) : (
                  <TipTapDiffReader content={currentBlog.content} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <RestoreConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmRestore}
        versionNumber={revision.versionNumber}
        dateStr={formattedSnapshotDate}
        authorName={author?.name || author?.email}
      />
    </div>
  );
}
