"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Trash2,
  RotateCcw,
  CheckCircle2,
  FileEdit,
  X,
  Download,
  Loader2,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

export interface TableFloatingDockProps<T = any> {
  selectedItems: T[];
  onClearSelection: () => void;
  entityName?: string; // e.g. "blogs", "webpages", "subscribers"
  entityType?: "blogs" | "pages" | "subscribers";
  bulkEditUrl?: string; // e.g. "/blogs/bulk-edit", "/webpages/bulk-edit"
  isTrashedView?: boolean;
  onBulkAction?: (action: string, ids: string[]) => Promise<boolean | void>;
  onExportSelected?: (items: T[]) => void;
}

export function TableFloatingDock<T extends { id: string; title?: string; status?: string }>({
  selectedItems,
  onClearSelection,
  entityName = "items",
  entityType,
  bulkEditUrl,
  isTrashedView = false,
  onBulkAction,
  onExportSelected,
}: TableFloatingDockProps<T>) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = React.useState(false);

  const count = selectedItems.length;
  const ids = selectedItems.map((item) => item.id);

  // Compute status metrics for intelligent button rendering
  const statuses = selectedItems
    .map((item) => item.status)
    .filter((s): s is string => typeof s === "string");
  const allPublished = statuses.length > 0 && statuses.every((s) => s === "published");
  const allDraft = statuses.length > 0 && statuses.every((s) => s === "draft");
  const allActiveSubscribers = statuses.length > 0 && statuses.every((s) => s === "active");
  const allUnsubscribed = statuses.length > 0 && statuses.every((s) => s === "unsubscribed");

  // Keyboard shortcut: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClearSelection]);

  const handleNavigateToBulkEdit = () => {
    if (!bulkEditUrl) return;

    // Stash in sessionStorage as backup for large selections
    try {
      sessionStorage.setItem("ys_bulk_edit_ids", JSON.stringify(ids));
    } catch {}

    // Navigate to bulk edit with query params if <= 50, or source=session if > 50
    if (ids.length <= 50) {
      router.push(`${bulkEditUrl}?ids=${ids.join(",")}`);
    } else {
      router.push(`${bulkEditUrl}?source=session`);
    }
  };

  const handleAction = async (action: string) => {
    if (!onBulkAction) return;
    try {
      setIsProcessing(true);
      await onBulkAction(action, ids);
      onClearSelection();
    } catch (err: any) {
      toast.add({
        title: "Action Failed",
        description: err.message || "Failed to process bulk action",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (onExportSelected) {
      onExportSelected(selectedItems);
      return;
    }

    // Determine target entity type for rich export
    const resolvedType =
      entityType ||
      (entityName.includes("blog")
        ? "blogs"
        : entityName.includes("page")
        ? "pages"
        : entityName.includes("subscriber")
        ? "subscribers"
        : null);

    if (resolvedType) {
      try {
        setIsExporting(true);
        const exportUrl = `/api/export?type=${resolvedType}&ids=${encodeURIComponent(ids.join(","))}`;
        const res = await fetch(exportUrl);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || "Failed to fetch rich export");
        }

        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = downloadUrl;
        downloadAnchor.download = `${resolvedType}-full-export-${Date.now()}.json`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        window.URL.revokeObjectURL(downloadUrl);

        toast.add({
          title: "Export Completed",
          description: `Downloaded complete content for ${count} ${entityName}.`,
          type: "success",
        });
      } catch (err: any) {
        toast.add({
          title: "Export Failed",
          description: err.message || "Could not generate full export file.",
          type: "error",
        });
      } finally {
        setIsExporting(false);
      }
      return;
    }

    // Fallback client-side JSON export
    try {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(selectedItems, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `selected-${entityName}-${Date.now()}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.add({
        title: "Export Completed",
        description: `Exported ${count} ${entityName} as JSON.`,
        type: "success",
      });
    } catch {
      toast.add({
        title: "Export Failed",
        description: "Could not generate export file.",
        type: "error",
      });
    }
  };

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 px-3 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-full text-foreground max-w-[95vw] overflow-x-auto">
        {/* Selected Counter Pill */}
        <div className="flex items-center gap-1.5 pl-1.5 pr-2 border-r border-border/80 shrink-0">
          <Badge
            variant="default"
            className="h-5 px-1.5 text-[11px] font-bold rounded-full bg-primary text-primary-foreground font-mono"
          >
            {count}
          </Badge>
          <span className="text-xs font-semibold hidden sm:inline whitespace-nowrap">
            selected
          </span>
        </div>

        {/* Primary Action: Excel-Style Bulk Edit */}
        {bulkEditUrl && !isTrashedView && (
          <Button
            size="sm"
            onClick={handleNavigateToBulkEdit}
            disabled={isProcessing}
            className="h-8 px-3 text-xs font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>Bulk Edit</span>
          </Button>
        )}

        {/* Intelligent Status Actions for Regular Views */}
        {!isTrashedView && onBulkAction && (
          <>
            {/* If all selected items are already published: show Move to Draft directly, or dropdown */}
            {allPublished ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("draft")}
                disabled={isProcessing}
                className="h-8 px-2.5 text-xs font-medium rounded-full cursor-pointer shrink-0 border-border hover:bg-muted text-amber-600 dark:text-amber-400"
                title="Unpublish and move all selected to drafts"
              >
                <FileEdit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span>Move to Draft</span>
              </Button>
            ) : allDraft ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPublishConfirmOpen(true)}
                disabled={isProcessing}
                className="h-8 px-2.5 text-xs font-medium rounded-full cursor-pointer shrink-0 border-border hover:bg-muted text-emerald-600 dark:text-emerald-400"
                title="Publish all selected drafts"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span>Publish</span>
              </Button>
            ) : entityName.includes("subscriber") ? (
              allActiveSubscribers ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("opt-out")}
                  disabled={isProcessing}
                  className="h-8 px-2.5 text-xs font-medium rounded-full cursor-pointer shrink-0 border-border hover:bg-muted text-destructive"
                >
                  <span>Opt-out</span>
                </Button>
              ) : allUnsubscribed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("activate")}
                  disabled={isProcessing}
                  className="h-8 px-2.5 text-xs font-medium rounded-full cursor-pointer shrink-0 border-border hover:bg-muted text-emerald-600 dark:text-emerald-400"
                >
                  <span>Mark Active</span>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isProcessing}
                        className="h-8 px-2.5 text-xs font-medium rounded-full cursor-pointer shrink-0 border-border hover:bg-muted"
                      >
                        <span>Change Status</span>
                        <ChevronUp className="w-3 h-3 ml-1 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="center" side="top" className="w-40 mb-2">
                    <DropdownMenuItem
                      onClick={() => handleAction("activate")}
                      className="text-xs cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <span>Mark as Active</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAction("opt-out")}
                      className="text-xs cursor-pointer flex items-center gap-2 text-destructive"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Opt-out Readers</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}
                      className="h-8 px-2.5 text-xs font-medium rounded-full cursor-pointer shrink-0 border-border hover:bg-muted"
                    >
                      <span>Set Status</span>
                      <ChevronUp className="w-3 h-3 ml-1 text-muted-foreground" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="center" side="top" className="w-40 mb-2">
                  <DropdownMenuItem
                    onClick={() => setIsPublishConfirmOpen(true)}
                    className="text-xs cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>Publish</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAction("draft")}
                    className="text-xs cursor-pointer flex items-center gap-2"
                  >
                    <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                    <span>Move to Draft</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Trash Action */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("trash")}
              disabled={isProcessing}
              className="h-8 px-2 text-xs font-medium rounded-full cursor-pointer shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Move selected to trash"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline ml-1">Trash</span>
            </Button>
          </>
        )}

        {/* Trashed Actions (Restore / Permanent Delete) */}
        {isTrashedView && onBulkAction && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("restore")}
              disabled={isProcessing}
              className="h-8 px-3 text-xs font-semibold rounded-full cursor-pointer shrink-0 border-border hover:bg-muted"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-green-600 shrink-0" />
              <span>Restore</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction("deletePermanent")}
              disabled={isProcessing}
              className="h-8 px-3 text-xs font-semibold rounded-full cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Delete Permanently</span>
            </Button>
          </>
        )}

        {/* Full Rich Content Export */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          disabled={isProcessing || isExporting}
          className="h-8 px-2.5 text-xs font-medium rounded-full cursor-pointer shrink-0 text-muted-foreground hover:text-foreground"
          title="Download complete data including full content"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-primary" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1" />
          )}
          <span className="hidden md:inline">
            {isExporting ? "Exporting..." : "Export"}
          </span>
        </Button>

        {/* Clear Selection (X) */}
        <div className="pl-1 border-l border-border/80 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
            className="h-7 w-7 p-0 rounded-full cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Deselect all (Esc)"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Publishing */}
      <Dialog
        open={isPublishConfirmOpen}
        onOpenChange={(open) => !open && setIsPublishConfirmOpen(false)}
      >
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 space-y-5 rounded-2xl">
          <DialogHeader className="space-y-2 pb-2 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Confirm Bulk Publishing
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
              You are about to publish {count} {entityName} live to the website.
              Visitors will immediately be able to view these live changes.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsPublishConfirmOpen(false)}
              className="h-10 px-5 text-sm font-semibold cursor-pointer rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsPublishConfirmOpen(false);
                handleAction("publish");
              }}
              className="h-10 px-5 text-sm font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
            >
              Publish {count} {entityName}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

