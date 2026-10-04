"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
  const [showMetadataDetails, setShowMetadataDetails] = useState(false);

  const [activeChangeIdx, setActiveChangeIdx] = useState(0);
  const [diffCount, setDiffCount] = useState(0);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const unifiedPaneRef = useRef<HTMLDivElement>(null);
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

  // Active scrollable container depending on mode and tab
  const getActiveContainer = useCallback(() => {
    if (diffViewMode === "unified") {
      return unifiedPaneRef.current;
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return activeTab === "snapshot" ? leftPaneRef.current : rightPaneRef.current;
    }
    return leftPaneRef.current || rightPaneRef.current;
  }, [diffViewMode, activeTab]);

  // Recount diff nodes whenever view mode, tab, or data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = getActiveContainer();
      if (!container) return;
      const nodes = container.querySelectorAll(".diff-change-node");
      setDiffCount(nodes.length);
      setActiveChangeIdx(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [diffViewMode, activeTab, revData, currentBlog, getActiveContainer]);

  const handleNextChange = useCallback(() => {
    const container = getActiveContainer();
    if (!container) return;
    const nodes = Array.from(container.querySelectorAll(".diff-change-node"));
    if (nodes.length === 0) return;
    const nextIdx = (activeChangeIdx + 1) % nodes.length;
    setActiveChangeIdx(nextIdx);
    const target = nodes[nextIdx] as HTMLElement;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("ring-2", "ring-primary", "rounded-xs", "transition-all", "duration-300");
    setTimeout(() => {
      target.classList.remove("ring-2", "ring-primary", "rounded-xs");
    }, 1500);
  }, [activeChangeIdx, getActiveContainer]);

  const handlePrevChange = useCallback(() => {
    const container = getActiveContainer();
    if (!container) return;
    const nodes = Array.from(container.querySelectorAll(".diff-change-node"));
    if (nodes.length === 0) return;
    const prevIdx = (activeChangeIdx - 1 + nodes.length) % nodes.length;
    setActiveChangeIdx(prevIdx);
    const target = nodes[prevIdx] as HTMLElement;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("ring-2", "ring-primary", "rounded-xs", "transition-all", "duration-300");
    setTimeout(() => {
      target.classList.remove("ring-2", "ring-primary", "rounded-xs");
    }, 1500);
  }, [activeChangeIdx, getActiveContainer]);

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
      <header className="h-14 sm:h-16 px-3 sm:px-6 border-b border-border/80 bg-card/70 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-10">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/blogs/edit/${blogId}`)}
            className="h-8 sm:h-9 w-8 sm:w-auto p-0 sm:px-3 gap-1.5 cursor-pointer hover:bg-muted shrink-0"
            title="Back to Editor"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Back to Editor</span>
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap sm:flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-base font-bold text-foreground truncate">
                <span className="sm:hidden">v{revision.versionNumber} vs Live</span>
                <span className="hidden sm:inline">Comparing Version {revision.versionNumber} vs Current</span>
              </h1>
              <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 bg-muted shrink-0">
                v{revision.versionNumber} Snapshot
              </Badge>
              {revision.action?.startsWith("restored:") && (
                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0">
                  Restored from v{revision.action.split(":")[1]}
                </Badge>
              )}
              <Badge variant="outline" className="hidden xs:inline-flex text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0">
                Live Current
              </Badge>
            </div>
            <p className="hidden md:block text-[11px] text-muted-foreground truncate">
              Snapshot taken {formattedSnapshotDate} by {author?.name || author?.email || "Author"}
            </p>
          </div>
        </div>

        {/* Right: Controls & Restore Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Diff Stepper (md+) */}
          {diffCount > 0 && (
            <div className="hidden md:flex items-center gap-1 bg-muted/80 border border-border/70 rounded-md px-2 py-0.5 text-xs">
              <span className="text-[11px] font-semibold text-foreground">
                {activeChangeIdx + 1}
                <span className="text-muted-foreground font-normal">/{diffCount} diffs</span>
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={handlePrevChange}
                  className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Previous change"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextChange}
                  className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Next change"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Diff Mode Selector - Desktop/Tablet (sm+) */}
          <div className="hidden sm:flex items-center bg-muted/70 p-0.5 rounded-md border border-border/70">
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
            className="h-8 px-2 sm:px-2.5 text-xs gap-1 cursor-pointer hover:bg-muted"
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

          {/* Restore Button (Desktop / Tablet sm+) */}
          <Button
            size="sm"
            onClick={() => setIsConfirmOpen(true)}
            className="hidden sm:flex h-8 sm:h-9 px-3 sm:px-3.5 text-xs font-bold bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 gap-1.5 cursor-pointer shadow-sm text-white shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Version {revision.versionNumber}</span>
          </Button>
        </div>
      </header>

      {/* Mobile Mode Switcher (< sm) */}
      <div className="sm:hidden flex items-center justify-center px-3 py-1.5 bg-muted/30 border-b border-border/60 shrink-0">
        <div className="flex items-center w-full p-0.5 bg-muted/80 rounded-lg border border-border/80">
          <button
            type="button"
            onClick={() => setDiffViewMode("visual")}
            className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center ${
              diffViewMode === "visual"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Visual Diff
          </button>
          <button
            type="button"
            onClick={() => setDiffViewMode("unified")}
            className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center ${
              diffViewMode === "unified"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Unified Lines
          </button>
          <button
            type="button"
            onClick={() => setDiffViewMode("clean")}
            className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center ${
              diffViewMode === "clean"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Clean Read
          </button>
        </div>
      </div>

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

      {/* Mobile Tab Switcher (Visible on < lg screens when in visual or clean mode) */}
      {diffViewMode !== "unified" && (
        <div className="lg:hidden px-3 pt-2 pb-1 bg-background shrink-0">
          <div className="flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("snapshot")}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "snapshot"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
              <span>v{revision.versionNumber} Snapshot</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("current")}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "current"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Current Active</span>
            </button>
          </div>
        </div>
      )}

      {/* 1-Line Summary Strip (Anchored) with Absolute Floating Dropdown */}
      <div className="relative shrink-0 z-30">
        {/* Compact Strip */}
        <div className="border-b border-border/60 bg-muted/25 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 text-muted-foreground text-[11px] sm:text-xs truncate">
            <span className="font-medium text-foreground shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              <span>Snapshot:</span>
              <strong className="text-foreground">{snapshotWordCount.toLocaleString()} words</strong>
              <span className="text-muted-foreground">({snapshotReadingTime}m read)</span>
            </span>
            <span className="text-border select-none">→</span>
            <span className="font-medium text-foreground shrink-0 flex items-center gap-1">
              <span>Live:</span>
              <strong className="text-foreground">{currentWordCount.toLocaleString()} words</strong>
              {wordCountDiff !== 0 && (
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 px-1 font-bold ${
                    wordCountDiff > 0
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "text-red-600 dark:text-red-400 border-red-500/30"
                  }`}
                >
                  {wordCountDiff > 0 ? `+${wordCountDiff}` : wordCountDiff}
                </Badge>
              )}
            </span>
            {(isTitleDifferent || isExcerptDifferent || isImageDifferent) && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                • Header fields modified
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowMetadataDetails((prev) => !prev)}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 px-1.5 py-0.5 rounded-sm hover:bg-primary/5 transition-colors flex items-center gap-0.5 shrink-0 cursor-pointer"
          >
            <span>{showMetadataDetails ? "Collapse" : "Details"}</span>
            {showMetadataDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Absolute Floating Dropdown Panel with Bidirectional Smooth Transition */}
        {/* Transparent click-outside handler (no background blur) */}
        {showMetadataDetails && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowMetadataDetails(false)}
          />
        )}

        {/* Hanging Dropdown Card with Border Radius, Shadow & Bidirectional Transition */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full left-2 right-2 sm:left-4 sm:right-4 mt-1.5 z-40 bg-card border border-border/80 rounded-2xl shadow-2xl shadow-black/25 p-3.5 sm:p-5 max-h-[75vh] overflow-y-auto transition-all duration-200 ease-in-out ${
            showMetadataDetails
              ? "opacity-100 translate-y-0 pointer-events-auto visible"
              : "opacity-0 -translate-y-2.5 pointer-events-none invisible"
          }`}
        >
          <div className="pb-2 mb-2.5 border-b border-border/50">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              Metadata Breakdown & Differences
            </span>
          </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-full">
                {/* Snapshot Metadata Box */}
                <div className="p-3 rounded-lg border border-border/70 bg-card/90 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
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
                <div className="p-3 rounded-lg border border-border/70 bg-card/90 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
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
          </div>

      {/* Main Diff Content Area */}
      {diffViewMode === "unified" ? (
        <div
          ref={unifiedPaneRef}
          className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 bg-background"
        >
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
            className={`flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 border-r border-border bg-card/30 ${
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
            className={`flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 bg-background ${
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

      {/* Mobile Sticky Bottom Action Bar (< sm) */}
      <div className="sm:hidden flex items-center justify-between gap-3 px-3.5 py-2.5 border-t border-border/80 bg-card/95 backdrop-blur-md sticky bottom-0 z-20 shrink-0">
        {/* Left: Change Stepper Navigation */}
        <div className="flex items-center gap-1.5 min-w-0">
          {diffCount > 0 ? (
            <div className="flex items-center gap-1.5 bg-muted/80 border border-border/70 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-semibold text-foreground">
                {activeChangeIdx + 1}
                <span className="text-muted-foreground font-normal">/{diffCount}</span>
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={handlePrevChange}
                  className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors active:scale-90"
                  title="Previous change"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextChange}
                  className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors active:scale-90"
                  title="Next change"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground italic truncate">
              No differences
            </span>
          )}
        </div>

        {/* Right: Primary Restore Button */}
        <Button
          size="sm"
          onClick={() => setIsConfirmOpen(true)}
          className="h-9 px-3.5 text-xs font-bold bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 gap-1.5 cursor-pointer shadow-sm text-white shrink-0 active:scale-95 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore v{revision.versionNumber}</span>
        </Button>
      </div>

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
