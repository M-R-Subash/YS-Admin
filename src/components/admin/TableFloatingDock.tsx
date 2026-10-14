"use client";

import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { ConfirmModal, CONFIRM_PRESETS } from "@/components/global-modal";
import {
  ExportColumnsModal,
  ExportColumnOption,
} from "./spreadsheet/ExportColumnsModal";

export interface TableFloatingDockProps<T = any> {
  selectedItems: T[];
  onClearSelection: () => void;
  entityName?: string; // e.g. "blogs", "webpages", "subscribers"
  entityType?: "blogs" | "pages" | "subscribers";
  bulkEditUrl?: string; // e.g. "/blogs/bulk-edit", "/webpages/bulk-edit"
  isTrashedView?: boolean;
  onBulkAction?: (action: string, ids: string[]) => Promise<boolean | void>;
  onExportSelected?: (items: T[]) => void;
  exportColumns?: ExportColumnOption[];
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
  exportColumns,
}: TableFloatingDockProps<T>) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // Confirmation Modals State using existing ConfirmModal & ExportColumnsModal
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isDraftConfirmOpen, setIsDraftConfirmOpen] = useState(false);
  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false);
  const [isDeletePermanentConfirmOpen, setIsDeletePermanentConfirmOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const count = selectedItems.length;
  const ids = selectedItems.map((item) => item.id);

  // Compute status metrics for intelligent button rendering
  const isSubscriber =
    entityName.includes("subscriber") || entityType === "subscribers";
  const statuses = selectedItems
    .map((item) => (item.status ? String(item.status).toLowerCase().trim() : ""))
    .filter((s): s is string => s.length > 0);
  const allPublished = statuses.length === count && count > 0 && statuses.every((s) => s === "published");
  const allDraft = statuses.length === count && count > 0 && statuses.every((s) => s === "draft");
  const allActiveSubscribers = statuses.length === count && count > 0 && statuses.every((s) => s === "active");
  const allUnsubscribed = statuses.length === count && count > 0 && statuses.every((s) => s === "unsubscribed");

  // Derive export columns dynamically based on entityType or items
  const computedExportColumns = useMemo<ExportColumnOption[]>(() => {
    if (exportColumns && exportColumns.length > 0) {
      return exportColumns;
    }

    const resolved =
      entityType ||
      (entityName.includes("blog")
        ? "blogs"
        : entityName.includes("page")
        ? "pages"
        : entityName.includes("subscriber")
        ? "subscribers"
        : null);

    if (resolved === "blogs") {
      return [
        { key: "title", label: "Title", category: "General" },
        { key: "slug", label: "Slug", category: "General" },
        { key: "status", label: "Status", category: "Publishing" },
        { key: "categories", label: "Categories", category: "Taxonomy" },
        { key: "tags", label: "Tags", category: "Taxonomy" },
        { key: "readingTime", label: "Read Time", category: "Publishing" },
        { key: "allowComments", label: "Comments", category: "Publishing" },
        { key: "featuredImage", label: "Featured Image", category: "General" },
        { key: "publishedAt", label: "Published Date", category: "Publishing" },
        { key: "updatedAt", label: "Last Updated", category: "Publishing" },
        { key: "metaTitle", label: "Meta Title", category: "SEO" },
        { key: "metaDesc", label: "Meta Description", category: "SEO" },
        { key: "focusKeyword", label: "Focus Keyword", category: "SEO" },
        { key: "canonicalUrl", label: "Canonical URL", category: "SEO" },
      ];
    }

    if (resolved === "pages") {
      return [
        { key: "title", label: "Title", category: "General" },
        { key: "slug", label: "Slug", category: "General" },
        { key: "status", label: "Status", category: "Publishing" },
        { key: "updatedAt", label: "Last Updated", category: "Publishing" },
        { key: "metaTitle", label: "Meta Title", category: "SEO" },
        { key: "metaDesc", label: "Meta Description", category: "SEO" },
        { key: "focusKeyword", label: "Focus Keyword", category: "SEO" },
        { key: "canonicalUrl", label: "Canonical URL", category: "SEO" },
      ];
    }

    if (resolved === "subscribers") {
      return [
        { key: "email", label: "Email Address", category: "General" },
        { key: "status", label: "Status", category: "Publishing" },
        { key: "source", label: "Source", category: "General" },
        { key: "createdAt", label: "Subscribed Date", category: "Publishing" },
      ];
    }

    if (selectedItems.length > 0) {
      const sample = selectedItems[0] as any;
      return Object.keys(sample)
        .filter((k) => k !== "id" && typeof sample[k] !== "function")
        .map((k) => ({
          key: k,
          label: k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1"),
          category: "General",
        }));
    }

    return [{ key: "title", label: "Title", category: "General" }];
  }, [exportColumns, entityType, entityName, selectedItems]);

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

  if (count === 0) return null;

  return (
    <TooltipProvider delay={100}>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 px-3 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-xl text-foreground max-w-[95vw] overflow-x-auto">
          {/* Selected Counter Pill */}
          <div className="flex items-center gap-1.5 pl-1.5 pr-2 border-r border-border/80 shrink-0">
            <Badge
              variant="default"
              className="h-5 px-1.5 text-[11px] font-bold rounded-md bg-primary text-primary-foreground font-mono"
            >
              {count}
            </Badge>
            <span className="text-xs font-semibold hidden sm:inline whitespace-nowrap">
              selected
            </span>
          </div>

          {/* Primary Action: Excel-Style Bulk Edit */}
          {bulkEditUrl && !isTrashedView && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="sm"
                    onClick={handleNavigateToBulkEdit}
                    disabled={isProcessing}
                    className="h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    <span>Bulk Edit</span>
                  </Button>
                }
              />
              <TooltipContent side="top" className="text-xs">
                Open full-screen spreadsheet bulk editor
              </TooltipContent>
            </Tooltip>
          )}

          {/* Intelligent Status Actions for Regular Views */}
          {!isTrashedView && onBulkAction && (
            <>
              {/* If all selected items are already published: show Draft */}
              {allPublished ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDraftConfirmOpen(true)}
                        disabled={isProcessing}
                        className="h-8 px-2.5 text-xs font-medium rounded-lg cursor-pointer shrink-0 border-border hover:bg-muted text-amber-600 dark:text-amber-400"
                      >
                        <FileEdit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        <span>Draft</span>
                      </Button>
                    }
                  />
                  <TooltipContent side="top" className="text-xs">
                    Unpublish and return selected to drafts
                  </TooltipContent>
                </Tooltip>
              ) : allDraft ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPublishConfirmOpen(true)}
                        disabled={isProcessing}
                        className="h-8 px-2.5 text-xs font-medium rounded-lg cursor-pointer shrink-0 border-border hover:bg-muted text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        <span>Publish</span>
                      </Button>
                    }
                  />
                  <TooltipContent side="top" className="text-xs">
                    Publish all selected drafts live
                  </TooltipContent>
                </Tooltip>
              ) : isSubscriber ? (
                allActiveSubscribers ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction("opt-out")}
                    disabled={isProcessing}
                    className="h-8 px-2.5 text-xs font-medium rounded-lg cursor-pointer shrink-0 border-border hover:bg-muted text-destructive"
                  >
                    <span>Opt-out</span>
                  </Button>
                ) : allUnsubscribed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction("activate")}
                    disabled={isProcessing}
                    className="h-8 px-2.5 text-xs font-medium rounded-lg cursor-pointer shrink-0 border-border hover:bg-muted text-emerald-600 dark:text-emerald-400"
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
                          className="h-8 px-2.5 text-xs font-medium rounded-lg cursor-pointer shrink-0 border-border hover:bg-muted"
                        >
                          <span>Change Status</span>
                          <ChevronUp className="w-3 h-3 ml-1 text-muted-foreground" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="center" side="top" className="w-40 mb-2 rounded-lg">
                      <DropdownMenuItem
                        onClick={() => handleAction("activate")}
                        className="text-xs cursor-pointer flex items-center gap-2 rounded-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span>Mark as Active</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction("opt-out")}
                        className="text-xs cursor-pointer flex items-center gap-2 text-destructive rounded-md"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Opt-out Readers</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              ) : (
                /* Messy / Mixed selection: show Set Status dropdown with both options */
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isProcessing}
                        className="h-8 px-2.5 text-xs font-medium rounded-lg cursor-pointer shrink-0 border-border hover:bg-muted"
                      >
                        <span>Set Status</span>
                        <ChevronUp className="w-3 h-3 ml-1 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="center" side="top" className="w-40 mb-2 rounded-lg shadow-lg border border-border">
                    <DropdownMenuItem
                      onClick={() => setIsPublishConfirmOpen(true)}
                      className="text-xs cursor-pointer flex items-center gap-2 rounded-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <span>Publish</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsDraftConfirmOpen(true)}
                      className="text-xs cursor-pointer flex items-center gap-2 rounded-md"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                      <span>Move to Draft</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Trash Action */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsTrashConfirmOpen(true)}
                      disabled={isProcessing}
                      className="h-8 px-2 text-xs font-medium rounded-lg cursor-pointer shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline ml-1">Trash</span>
                    </Button>
                  }
                />
                <TooltipContent side="top" className="text-xs">
                  Move selected items to trash
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Trashed Actions (Restore / Permanent Delete) */}
          {isTrashedView && onBulkAction && (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("restore")}
                      disabled={isProcessing}
                      className="h-8 px-3 text-xs font-semibold rounded-lg cursor-pointer shrink-0 border-border hover:bg-muted"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-green-600 shrink-0" />
                      <span>Restore</span>
                    </Button>
                  }
                />
                <TooltipContent side="top" className="text-xs">
                  Restore selected items
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeletePermanentConfirmOpen(true)}
                      disabled={isProcessing}
                      className="h-8 px-3 text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      <span>Delete Permanently</span>
                    </Button>
                  }
                />
                <TooltipContent side="top" className="text-xs">
                  Permanently delete selected items (irreversible)
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Universal Column Selection Export Modal Trigger with Tooltip */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onExportSelected) {
                      onExportSelected(selectedItems);
                    } else {
                      setIsExportModalOpen(true);
                    }
                  }}
                  disabled={isProcessing}
                  className="h-8 px-2.5 text-xs font-medium rounded-lg cursor-pointer shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden md:inline">Export</span>
                </Button>
              }
            />
            <TooltipContent side="top" className="text-xs">
              Select columns and download data
            </TooltipContent>
          </Tooltip>

          {/* Clear Selection (X) */}
          <div className="pl-1 border-l border-border/80 shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    disabled={isProcessing}
                    className="h-7 w-7 p-0 rounded-lg cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </Button>
                }
              />
              <TooltipContent side="top" className="text-xs">
                Clear selection (Esc)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 1. Universal Confirmation Modal for Bulk Publishing */}
        <ConfirmModal
          open={isPublishConfirmOpen}
          onOpenChange={setIsPublishConfirmOpen}
          {...CONFIRM_PRESETS.publish(entityName, count)}
          onConfirm={async () => {
            setIsPublishConfirmOpen(false);
            await handleAction("publish");
          }}
          loading={isProcessing}
        />

        {/* 2. Universal Confirmation Modal for Moving to Draft */}
        <ConfirmModal
          open={isDraftConfirmOpen}
          onOpenChange={setIsDraftConfirmOpen}
          {...CONFIRM_PRESETS.unpublish(entityName, count)}
          onConfirm={async () => {
            setIsDraftConfirmOpen(false);
            await handleAction("draft");
          }}
          loading={isProcessing}
        />

        {/* 3. Universal Confirmation Modal for Moving to Trash */}
        <ConfirmModal
          open={isTrashConfirmOpen}
          onOpenChange={setIsTrashConfirmOpen}
          {...CONFIRM_PRESETS.trash(entityName, `${count} selected`)}
          onConfirm={async () => {
            setIsTrashConfirmOpen(false);
            await handleAction("trash");
          }}
          loading={isProcessing}
        />

        {/* 4. Universal Confirmation Modal for Permanent Delete (in Trashed View) */}
        <ConfirmModal
          open={isDeletePermanentConfirmOpen}
          onOpenChange={setIsDeletePermanentConfirmOpen}
          {...CONFIRM_PRESETS.deletePermanent(entityName, `${count} selected`)}
          onConfirm={async () => {
            setIsDeletePermanentConfirmOpen(false);
            await handleAction("deletePermanent");
          }}
          loading={isProcessing}
        />

        {/* 5. Universal Column Selection Export Modal (Reusing existing ExportColumnsModal) */}
        <ExportColumnsModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          entityName={entityName}
          columns={computedExportColumns}
          data={selectedItems}
        />
      </div>
    </TooltipProvider>
  );
}
