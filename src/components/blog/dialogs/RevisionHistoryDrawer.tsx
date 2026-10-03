"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import {
  History,
  GitCompare,
  RotateCcw,
  Clock,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { RestoreConfirmDialog } from "./RestoreConfirmDialog";
import {
  BlogSnapshotData,
  RevisionSummaryItem,
  RevisionsListResponse,
  RevisionDetailResponse,
} from "@/types/revision";

interface RevisionHistoryDrawerProps {
  blogId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (snapshotData: BlogSnapshotData, versionNumber: number) => void;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load revisions");
    return res.json();
  });

export function RevisionHistoryDrawer({
  blogId,
  open,
  onOpenChange,
  onRestore,
}: RevisionHistoryDrawerProps) {
  const router = useRouter();
  const [confirmTarget, setConfirmTarget] = useState<RevisionSummaryItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch revisions list when drawer is opened
  const { data, error, isLoading, mutate } = useSWR<RevisionsListResponse>(
    open && blogId ? `/api/blogs/${blogId}/revisions` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const revisions = data?.revisions || [];
  const totalCount = revisions.length;

  const handleExecuteRestore = async () => {
    if (!confirmTarget || !blogId) return;

    try {
      setIsRestoring(true);
      const res = await fetch(`/api/blogs/${blogId}/revisions/${confirmTarget.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch full revision snapshot");
      }
      const json: RevisionDetailResponse = await res.json();
      if (!json.revision?.snapshotData) {
        throw new Error("Snapshot data is missing from revision payload");
      }

      onRestore(json.revision.snapshotData, confirmTarget.versionNumber);
      setConfirmTarget(null);
      onOpenChange(false);
      toast.add({
        title: "Revision Restored",
        description: `Restored to Version ${confirmTarget.versionNumber}. Review changes and publish when ready.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("[RevisionHistoryDrawer] Restore error:", err);
      toast.add({
        title: "Restore Failed",
        description: err?.message || "Failed to restore revision",
        type: "error",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const formatAction = (action: string, isLatest: boolean) => {
    if (action?.startsWith("restored:")) {
      const ver = action.split(":")[1];
      return `Restored from v${ver}`;
    }
    if (isLatest) return "Current Live Version";
    switch (action) {
      case "published":
        return "Published";
      case "updated":
        return "Updated Live";
      case "scheduled-publish":
        return "Scheduled Release";
      case "restored":
        return "Restored Version";
      default:
        return action;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-background border-l border-border"
        >
          {/* Header */}
          <SheetHeader className="p-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold">
                    Revision History
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    {totalCount > 0
                      ? `${totalCount} published version${totalCount > 1 ? "s" : ""} saved`
                      : "Audit trail of published snapshots"}
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading revision history...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 text-center">
                Failed to load revisions. Please try again.
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mutate()}
                    className="h-7 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-muted-foreground gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    No Published Revisions Yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                    Revisions are automatically captured each time you publish or update this post.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev, index) => {
                  const isLatest = index === 0;
                  const date = new Date(rev.createdAt);
                  const formattedDate = format(date, "MMM d, yyyy 'at' h:mm a");
                  const relativeDate = formatDistanceToNow(date, { addSuffix: true });
                  const author = rev.savedBy;
                  const authorInitials = author?.name
                    ? author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "U";

                  return (
                    <div
                      key={rev.id}
                      className={`relative p-3.5 rounded-lg border transition-all ${
                        isLatest
                          ? "bg-primary/5 border-primary/30 shadow-xs"
                          : "bg-card hover:bg-muted/40 border-border/70"
                      }`}
                    >
                      {/* Top Row: Version badge, Action, Date */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={isLatest ? "default" : "outline"}
                            className={`text-[11px] font-bold px-2 py-0.5 ${
                              isLatest
                                ? "bg-black text-white hover:bg-black"
                                : "text-foreground"
                            }`}
                          >
                            v{rev.versionNumber}
                          </Badge>
                          <span
                            className={`text-xs font-semibold ${
                              isLatest ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {formatAction(rev.action, isLatest)}
                          </span>
                          {isLatest && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Live
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[11px] text-muted-foreground whitespace-nowrap"
                          title={formattedDate}
                        >
                          {relativeDate}
                        </span>
                      </div>

                      {/* Middle Row: Author and Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Avatar className="w-4 h-4 border border-border">
                            {author?.profilePicture ? (
                              <AvatarImage src={author.profilePicture} alt={author.name || ""} />
                            ) : null}
                            <AvatarFallback className="text-[9px] bg-muted font-bold">
                              {authorInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[140px] text-foreground font-medium text-[11px]">
                            {author?.name || author?.email || "Unknown Author"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {rev.wordCount.toLocaleString()} words
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rev.readingTime}m read
                          </span>
                        </div>
                      </div>

                      {/* Actions: Compare & Restore — Only for historical versions */}
                      {!isLatest && (
                        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onOpenChange(false);
                              router.push(`/blogs/edit/${blogId}/revisions/${rev.id}`);
                            }}
                            className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer hover:bg-muted"
                          >
                            <GitCompare className="w-3 h-3 text-muted-foreground" />
                            Compare
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmTarget(rev)}
                            className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-border/50 bg-muted/10 text-center text-[11px] text-muted-foreground">
            Revisions keep the last 5 published snapshots automatically.
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      {confirmTarget && (
        <RestoreConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => {
            if (!open) setConfirmTarget(null);
          }}
          onConfirm={handleExecuteRestore}
          versionNumber={confirmTarget.versionNumber}
          dateStr={format(new Date(confirmTarget.createdAt), "MMM d, yyyy 'at' h:mm a")}
          authorName={confirmTarget.savedBy?.name || confirmTarget.savedBy?.email}
          isRestoring={isRestoring}
        />
      )}
    </>
  );
}
