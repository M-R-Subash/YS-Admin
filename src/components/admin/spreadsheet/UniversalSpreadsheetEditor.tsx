"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle,
  Loader2,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { ExportColumnsModal } from "./ExportColumnsModal";
import { cn } from "@/lib/utils";

export type SpreadsheetColumnType =
  | "text"
  | "number"
  | "switch"
  | "status"
  | "categories"
  | "tags";

export interface SpreadsheetColumnConfig {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  type: SpreadsheetColumnType;
  category?: "General" | "Publishing" | "Taxonomy" | "SEO";
  placeholder?: string;
  fieldPath?: string; // e.g., "seo.metaTitle" or default to col.key
}

export interface UniversalSpreadsheetEditorProps<T extends { id: string; title: string; slug?: string; status?: string }> {
  entityLabel: string; // e.g. "Blog", "Webpage"
  backHref: string; // e.g. "/blogs", "/webpages"
  initialItems: T[];
  columns: SpreadsheetColumnConfig[];
  availableCategories?: { id: string; name: string }[];
  availableTags?: { id: string; name: string }[];
  apiEndpoint: string; // e.g. "/api/blogs/bulk" or "/api/pages/bulk"
}

export function UniversalSpreadsheetEditor<T extends { id: string; title: string; slug?: string; status?: string }>({
  entityLabel,
  backHref,
  initialItems,
  columns,
  availableCategories = [],
  availableTags = [],
  apiEndpoint,
}: UniversalSpreadsheetEditorProps<T>) {
  const router = useRouter();

  // Working state of items
  const [items, setItems] = useState<T[]>(() =>
    JSON.parse(JSON.stringify(initialItems))
  );

  // Column visibility
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(() => {
    // Default visible keys: first 6 columns
    return new Set(columns.slice(0, 6).map((c) => c.key));
  });

  // Column Widths for Drag-to-Resize
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    columns.forEach((col) => {
      map[col.key] = col.defaultWidth || 200;
    });
    return map;
  });

  const [resizingColKey, setResizingColKey] = useState<string | null>(null);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthRef = useRef<number>(0);

  // Operation states
  const [isSaving, setIsSaving] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);

  // Local state for adding custom tags
  const [newTagInput, setNewTagInput] = useState<Record<string, string>>({});
  const [categorySearch, setCategorySearch] = useState<Record<string, string>>({});

  // Compute dirty map comparing current items to initialItems
  const { dirtyMap, totalDirtyCount, hasPublishAction } = useMemo(() => {
    const dMap: Record<string, Record<string, boolean>> = {};
    let count = 0;
    let publishingDetected = false;

    const initialMap = new Map(initialItems.map((item) => [item.id, item]));

    items.forEach((item) => {
      const orig = initialMap.get(item.id) as any;
      if (!orig) return;

      const fieldChanges: Record<string, boolean> = {};

      if (item.title !== orig.title) fieldChanges.title = true;

      columns.forEach((col) => {
        const fieldPath = col.fieldPath || col.key;
        let curVal: any;
        let origVal: any;

        if (fieldPath.startsWith("seo.")) {
          const subKey = fieldPath.replace("seo.", "");
          curVal = (item as any).seo?.[subKey] ?? "";
          origVal = orig.seo?.[subKey] ?? "";
        } else {
          curVal = (item as any)[col.key];
          origVal = orig[col.key];
        }

        // Handle array comparison
        if (Array.isArray(curVal) || Array.isArray(origVal)) {
          const arrA = (curVal || []).slice().sort().join(",");
          const arrB = (origVal || []).slice().sort().join(",");
          if (arrA !== arrB) fieldChanges[col.key] = true;
        } else if (col.type === "switch") {
          if (Boolean(curVal) !== Boolean(origVal)) fieldChanges[col.key] = true;
        } else {
          if ((curVal ?? "") !== (origVal ?? "")) {
            fieldChanges[col.key] = true;
            if (col.key === "status" && curVal === "published" && origVal !== "published") {
              publishingDetected = true;
            }
          }
        }
      });

      const changedFields = Object.keys(fieldChanges);
      if (changedFields.length > 0) {
        dMap[item.id] = fieldChanges;
        count += changedFields.length;
      }
    });

    return {
      dirtyMap: dMap,
      totalDirtyCount: count,
      hasPublishAction: publishingDetected,
    };
  }, [items, initialItems, columns]);

  // Prevent accidental navigation when changes are unsaved
  useEffect(() => {
    if (totalDirtyCount === 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [totalDirtyCount]);

  // Duplicate slug checking
  const duplicateSlugs = useMemo(() => {
    const slugCounts = new Map<string, number>();
    items.forEach((item) => {
      const s = ((item.slug as string) || "").trim().toLowerCase();
      if (s) slugCounts.set(s, (slugCounts.get(s) || 0) + 1);
    });
    const dupes = new Set<string>();
    slugCounts.forEach((cnt, s) => {
      if (cnt > 1) dupes.add(s);
    });
    return dupes;
  }, [items]);

  // Cell updater helper
  const updateItemField = useCallback((id: string, fieldPath: string, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (fieldPath.startsWith("seo.")) {
          const subKey = fieldPath.replace("seo.", "");
          return {
            ...item,
            seo: {
              ...((item as any).seo || {}),
              [subKey]: value,
            },
          };
        }

        return { ...item, [fieldPath]: value };
      })
    );
  }, []);

  // Category toggle
  const toggleCategory = (itemId: string, catName: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = ((item as any).categories as string[]) || [];
        const exists = current.includes(catName);
        return {
          ...item,
          categories: exists
            ? current.filter((c) => c !== catName)
            : [...current, catName],
        };
      })
    );
  };

  // Tag toggle
  const toggleTag = (itemId: string, tagName: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = ((item as any).tags as string[]) || [];
        const exists = current.includes(tagName);
        return {
          ...item,
          tags: exists
            ? current.filter((t) => t !== tagName)
            : [...current, tagName],
        };
      })
    );
  };

  // Add custom tag
  const addCustomTag = (itemId: string) => {
    const val = (newTagInput[itemId] || "").trim();
    if (!val) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = ((item as any).tags as string[]) || [];
        if (current.includes(val)) return item;
        return {
          ...item,
          tags: [...current, val],
        };
      })
    );
    setNewTagInput((prev) => ({ ...prev, [itemId]: "" }));
  };

  // Discard all changes
  const handleDiscard = () => {
    setItems(JSON.parse(JSON.stringify(initialItems)));
    toast.add({
      title: "Changes Reverted",
      description: "Restored all items to their original values.",
      type: "info",
    });
  };

  // Column Resizing handlers
  const handleResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColKey(colKey);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = columnWidths[colKey] || 200;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - resizeStartXRef.current;
      const minW = columns.find((c) => c.key === colKey)?.minWidth || 90;
      const newW = Math.max(minW, resizeStartWidthRef.current + delta);
      setColumnWidths((prev) => ({ ...prev, [colKey]: newW }));
    };

    const onMouseUp = () => {
      setResizingColKey(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Pre-save check
  const handleSaveClick = () => {
    if (duplicateSlugs.size > 0) {
      toast.add({
        title: "Validation Error",
        description: "Please fix duplicate slugs before saving.",
        type: "error",
      });
      return;
    }

    if (totalDirtyCount === 0) return;

    // If setting any item to published, show confirmation modal
    if (hasPublishAction) {
      setIsPublishConfirmOpen(true);
    } else {
      executeSave();
    }
  };

  // Execute Batch Save
  const executeSave = async () => {
    setIsPublishConfirmOpen(false);

    const updates = Object.keys(dirtyMap).map((itemId) => {
      const item = items.find((i) => i.id === itemId) as any;
      const changedKeys = dirtyMap[itemId];

      const changes: Record<string, any> = {};
      if (changedKeys.title) changes.title = item.title;

      columns.forEach((col) => {
        if (changedKeys[col.key]) {
          const fieldPath = col.fieldPath || col.key;
          if (fieldPath.startsWith("seo.")) {
            const subKey = fieldPath.replace("seo.", "");
            changes[subKey] = item.seo?.[subKey] ?? "";
          } else {
            changes[col.key] = item[col.key];
          }
        }
      });

      return { id: itemId, changes };
    });

    try {
      setIsSaving(true);
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to commit bulk updates");
      }

      toast.add({
        title: "Bulk Updates Saved!",
        description: `Successfully saved ${totalDirtyCount} modifications across ${updates.length} ${entityLabel.toLowerCase()}s.`,
        type: "success",
      });

      router.push(backHref);
    } catch (err: any) {
      toast.add({
        title: "Save Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isCellDirty = (itemId: string, key: string) => {
    return Boolean(dirtyMap[itemId]?.[key]);
  };

  return (
    <div className="w-full flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          {/* Back Icon-Only Button */}
          <Link href={backHref}>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer rounded-lg border-border hover:bg-muted"
              title={`Return to ${entityLabel}s`}
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">
                {entityLabel} Spreadsheet Bulk Editor
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Editing {items.length} selected {entityLabel.toLowerCase()}s in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="h-8 text-xs cursor-pointer border-border"
            title="Export spreadsheet data"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <span>Export</span>
          </Button>

          {/* Columns Selector Popover */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs cursor-pointer border-border"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                  <span>Columns ({visibleColumnKeys.size})</span>
                </Button>
              }
            />
            <PopoverContent align="end" className="w-72 p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Toggle Columns
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleColumnKeys(new Set(columns.map((c) => c.key)))
                    }
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleColumnKeys(new Set(columns.slice(0, 4).map((c) => c.key)))
                    }
                    className="text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {columns.map((col) => {
                  const isChecked = visibleColumnKeys.has(col.key);
                  return (
                    <div
                      key={col.key}
                      onClick={() => {
                        const next = new Set(visibleColumnKeys);
                        if (isChecked) next.delete(col.key);
                        else next.add(col.key);
                        setVisibleColumnKeys(next);
                      }}
                      className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const next = new Set(visibleColumnKeys);
                            if (checked) next.add(col.key);
                            else next.delete(col.key);
                            setVisibleColumnKeys(next);
                          }}
                        />
                        <span className="text-xs font-medium text-foreground truncate">
                          {col.label}
                        </span>
                      </div>
                      {col.category && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-border/80"
                        >
                          {col.category}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Discard Button */}
          {totalDirtyCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={isSaving}
              className="h-8 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>Discard</span>
            </Button>
          )}

          {/* Save Button */}
          <Button
            size="sm"
            onClick={handleSaveClick}
            disabled={totalDirtyCount === 0 || isSaving || duplicateSlugs.size > 0}
            className="h-8 px-4 text-xs font-semibold rounded-md shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span>
              {totalDirtyCount > 0
                ? `Save ${totalDirtyCount} Changes`
                : "Saved"}
            </span>
          </Button>
        </div>
      </div>

      {/* Duplicate Slugs Warning Banner */}
      {duplicateSlugs.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Duplicate slug detected:{" "}
            <strong>{Array.from(duplicateSlugs).join(", ")}</strong>. Slugs must
            be unique.
          </span>
        </div>
      )}

      {/* Auto-Height Spreadsheet Table Grid */}
      <div className="relative border border-border rounded-xl bg-card shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[calc(100vh-170px)]">
          <table className="w-full text-xs border-collapse">
            {/* Table Header with Drag Resizing */}
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold sticky top-0 z-30 shadow-xs">
                {/* Fixed Sticky Column 1: Clean Title Only */}
                <th
                  style={{ width: 280, minWidth: 280 }}
                  className="py-3 px-3.5 text-left font-semibold text-xs sticky left-0 z-40 bg-muted/95 backdrop-blur-xs border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <span>{entityLabel} Title</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      #{items.length}
                    </span>
                  </div>
                </th>

                {/* Dynamic Columns with Resizer Handles */}
                {columns
                  .filter((c) => visibleColumnKeys.has(c.key))
                  .map((col) => {
                    const width = columnWidths[col.key] || col.defaultWidth || 180;
                    return (
                      <th
                        key={col.key}
                        style={{ width, minWidth: col.minWidth || 90 }}
                        className="relative py-3 px-3 text-left font-semibold text-xs border-r border-border/80 last:border-r-0 select-none group"
                      >
                        <div className="flex items-center justify-between gap-1 pr-1.5">
                          <span className="truncate">{col.label}</span>
                        </div>

                        {/* Column Drag Resizer Handle */}
                        <div
                          onMouseDown={(e) => handleResizeStart(col.key, e)}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-20",
                            resizingColKey === col.key && "bg-primary"
                          )}
                          title="Drag to resize column"
                        />
                      </th>
                    );
                  })}
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-border/60">
              {items.map((item, index) => {
                const isSlugDupe = duplicateSlugs.has(
                  ((item.slug as string) || "").trim().toLowerCase()
                );

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Fixed Sticky Column 1: Clean Row # + Title Only (No slug, no image) */}
                    <td
                      style={{ width: 280, minWidth: 280 }}
                      className="p-2.5 sticky left-0 z-20 bg-card group-hover:bg-muted/30 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono w-4 text-right shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              updateItemField(item.id, "title", e.target.value)
                            }
                            placeholder="[ Empty Title ]"
                            className={cn(
                              "h-7 text-xs font-semibold px-2 rounded-sm border-transparent hover:border-border focus:border-primary bg-transparent",
                              isCellDirty(item.id, "title") && "bg-amber-500/10 border-amber-500/40",
                              !item.title && "placeholder:italic placeholder:text-muted-foreground/60"
                            )}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Dynamic Columns */}
                    {columns
                      .filter((c) => visibleColumnKeys.has(c.key))
                      .map((col) => {
                        const width = columnWidths[col.key] || col.defaultWidth || 180;
                        const fieldPath = col.fieldPath || col.key;
                        let cellVal: any;

                        if (fieldPath.startsWith("seo.")) {
                          const subKey = fieldPath.replace("seo.", "");
                          cellVal = (item as any).seo?.[subKey] ?? "";
                        } else {
                          cellVal = (item as any)[col.key];
                        }

                        const dirty = isCellDirty(item.id, col.key);

                        return (
                          <td
                            key={col.key}
                            style={{ width, minWidth: col.minWidth || 90 }}
                            className={cn(
                              "p-2 border-r border-border/60 align-middle",
                              dirty && "bg-amber-500/5"
                            )}
                          >
                            {/* Render by Column Type */}
                            {col.type === "status" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemField(
                                    item.id,
                                    "status",
                                    cellVal === "published" ? "draft" : "published"
                                  )
                                }
                                className={cn(
                                  "px-2.5 py-1 text-[11px] font-bold rounded-sm border transition-all cursor-pointer",
                                  cellVal === "published"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                                )}
                              >
                                {(cellVal || "draft").toUpperCase()}
                              </button>
                            )}

                            {col.type === "switch" && (
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={Boolean(cellVal)}
                                  onCheckedChange={(val) =>
                                    updateItemField(item.id, fieldPath, val)
                                  }
                                />
                              </div>
                            )}

                            {col.type === "number" && (
                              <Input
                                type="number"
                                min={1}
                                value={cellVal ?? 1}
                                onChange={(e) =>
                                  updateItemField(
                                    item.id,
                                    fieldPath,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className={cn(
                                  "h-8 text-xs font-mono px-2 rounded-sm",
                                  dirty && "border-amber-500/40"
                                )}
                              />
                            )}

                            {col.type === "categories" && (
                              <Popover>
                                <PopoverTrigger
                                  render={
                                    <button
                                      type="button"
                                      className="w-full min-h-8 p-1.5 flex flex-wrap items-center gap-1 text-left rounded-sm border border-border/80 bg-background hover:border-primary/50 cursor-pointer text-xs"
                                    >
                                      {Array.isArray(cellVal) && cellVal.length > 0 ? (
                                        cellVal.map((catName: string) => (
                                          <Badge
                                            key={catName}
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0 h-4.5 bg-muted font-medium text-foreground"
                                          >
                                            {catName}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground/60 italic px-1">
                                          [ Empty ]
                                        </span>
                                      )}
                                    </button>
                                  }
                                />
                                <PopoverContent align="start" className="w-56 p-2 space-y-2">
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border border-border/60">
                                    <Search className="w-3 h-3 text-muted-foreground" />
                                    <input
                                      type="text"
                                      value={categorySearch[item.id] || ""}
                                      onChange={(e) =>
                                        setCategorySearch((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Search categories..."
                                      className="text-xs bg-transparent border-none outline-hidden w-full text-foreground"
                                    />
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-1">
                                    {availableCategories
                                      .filter((c) =>
                                        c.name
                                          .toLowerCase()
                                          .includes(
                                            (categorySearch[item.id] || "").toLowerCase()
                                          )
                                      )
                                      .map((cat) => {
                                        const isSelected = (cellVal || []).includes(cat.name);
                                        return (
                                          <div
                                            key={cat.id}
                                            onClick={() => toggleCategory(item.id, cat.name)}
                                            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-xs"
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={() =>
                                                toggleCategory(item.id, cat.name)
                                              }
                                            />
                                            <span className="truncate">{cat.name}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}

                            {col.type === "tags" && (
                              <Popover>
                                <PopoverTrigger
                                  render={
                                    <button
                                      type="button"
                                      className="w-full min-h-8 p-1.5 flex flex-wrap items-center gap-1 text-left rounded-sm border border-border/80 bg-background hover:border-primary/50 cursor-pointer text-xs"
                                    >
                                      {Array.isArray(cellVal) && cellVal.length > 0 ? (
                                        cellVal.map((tName: string) => (
                                          <Badge
                                            key={tName}
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0 h-4.5 font-normal text-foreground bg-muted/40"
                                          >
                                            #{tName}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground/60 italic px-1">
                                          [ Empty ]
                                        </span>
                                      )}
                                    </button>
                                  }
                                />
                                <PopoverContent align="start" className="w-64 p-2.5 space-y-2">
                                  {/* Inline Add / Search Tag */}
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={newTagInput[item.id] || ""}
                                      onChange={(e) =>
                                        setNewTagInput((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          addCustomTag(item.id);
                                        }
                                      }}
                                      placeholder="Type tag & press enter..."
                                      className="h-7 text-xs px-2"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => addCustomTag(item.id)}
                                      className="h-7 px-2 text-xs cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  <div className="max-h-48 overflow-y-auto space-y-1">
                                    {availableTags
                                      .filter((t) =>
                                        t.name
                                          .toLowerCase()
                                          .includes((newTagInput[item.id] || "").toLowerCase())
                                      )
                                      .map((t) => {
                                      const isSelected = (cellVal || []).includes(t.name);
                                      return (
                                        <div
                                          key={t.id}
                                          onClick={() => toggleTag(item.id, t.name)}
                                          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-xs"
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                              toggleTag(item.id, t.name)
                                            }
                                          />
                                          <span className="truncate">#{t.name}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}

                            {col.type === "text" && (
                              <Input
                                value={cellVal || ""}
                                onChange={(e) =>
                                  updateItemField(item.id, fieldPath, e.target.value)
                                }
                                placeholder={col.placeholder || "[ Empty ]"}
                                className={cn(
                                  "h-8 text-xs px-2 rounded-sm",
                                  col.key === "slug" && isSlugDupe && "border-destructive text-destructive bg-destructive/10",
                                  col.key === "slug" && "font-mono",
                                  dirty && "border-amber-500/40",
                                  !cellVal && "placeholder:italic placeholder:text-muted-foreground/60"
                                )}
                              />
                            )}
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Columns Selection Modal */}
      <ExportColumnsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entityName={entityLabel.toLowerCase()}
        columns={columns.map((c) => ({
          key: c.key,
          label: c.label,
          category: c.category,
        }))}
        data={items}
      />

      {/* Confirmation Modal for Publishing */}
      <Dialog
        open={isPublishConfirmOpen}
        onOpenChange={(open) => !open && setIsPublishConfirmOpen(false)}
      >
        <DialogContent className="sm:max-w-md p-5 space-y-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Confirm Publishing Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You are about to publish modified {entityLabel.toLowerCase()}s live to the website.
              Visitors will immediately be able to view these live changes.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPublishConfirmOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={executeSave}
              className="text-xs font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Publish & Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
