"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  SlidersHorizontal,
  Search,
  Globe,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { clientConfig } from "@/lib/config/client";
import { cn } from "@/lib/utils";

export interface BulkPageItem {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  seo?: {
    metaTitle?: string | null;
    metaDesc?: string | null;
    focusKeyword?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean | null;
  } | null;
}

export type PageBulkColumnKey =
  | "slug"
  | "status"
  | "metaTitle"
  | "metaDesc"
  | "focusKeyword"
  | "canonicalUrl"
  | "noIndex";

interface ColumnConfig {
  key: PageBulkColumnKey;
  label: string;
  width: string;
  category: "General" | "Publishing" | "SEO";
}

const AVAILABLE_PAGE_COLUMNS: ColumnConfig[] = [
  { key: "slug", label: "Slug", width: "w-60 min-w-[240px]", category: "General" },
  { key: "status", label: "Status", width: "w-36 min-w-[140px]", category: "Publishing" },
  { key: "metaTitle", label: "Meta Title", width: "w-64 min-w-[240px]", category: "SEO" },
  { key: "metaDesc", label: "Meta Description", width: "w-72 min-w-[280px]", category: "SEO" },
  { key: "focusKeyword", label: "Focus Keyword", width: "w-48 min-w-[180px]", category: "SEO" },
  { key: "canonicalUrl", label: "Canonical URL", width: "w-64 min-w-[240px]", category: "SEO" },
  { key: "noIndex", label: "No Index", width: "w-28 min-w-[100px]", category: "SEO" },
];

export interface PageBulkEditorGridProps {
  initialPages: BulkPageItem[];
}

export function PageBulkEditorGrid({ initialPages }: PageBulkEditorGridProps) {
  const router = useRouter();

  // Local working state of pages
  const [pages, setPages] = useState<BulkPageItem[]>(() =>
    JSON.parse(JSON.stringify(initialPages))
  );

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<PageBulkColumnKey>>(
    new Set(["slug", "status", "metaTitle", "metaDesc", "focusKeyword"])
  );

  const [isSaving, setIsSaving] = useState(false);

  // Compute dirty map comparing current pages to initialPages
  const { dirtyMap, totalDirtyCount } = useMemo(() => {
    const dMap: Record<string, Record<string, boolean>> = {};
    let count = 0;

    const initialMap = new Map(initialPages.map((p) => [p.id, p]));

    pages.forEach((page) => {
      const orig = initialMap.get(page.id);
      if (!orig) return;

      const fieldChanges: Record<string, boolean> = {};

      if (page.title !== orig.title) fieldChanges.title = true;
      if (page.slug !== orig.slug) fieldChanges.slug = true;
      if (page.status !== orig.status) fieldChanges.status = true;

      // SEO comparisons
      const metaTitleA = page.seo?.metaTitle || "";
      const metaTitleB = orig.seo?.metaTitle || "";
      if (metaTitleA !== metaTitleB) fieldChanges.metaTitle = true;

      const metaDescA = page.seo?.metaDesc || "";
      const metaDescB = orig.seo?.metaDesc || "";
      if (metaDescA !== metaDescB) fieldChanges.metaDesc = true;

      const focusA = page.seo?.focusKeyword || "";
      const focusB = orig.seo?.focusKeyword || "";
      if (focusA !== focusB) fieldChanges.focusKeyword = true;

      const canonA = page.seo?.canonicalUrl || "";
      const canonB = orig.seo?.canonicalUrl || "";
      if (canonA !== canonB) fieldChanges.canonicalUrl = true;

      const noIndexA = Boolean(page.seo?.noIndex);
      const noIndexB = Boolean(orig.seo?.noIndex);
      if (noIndexA !== noIndexB) fieldChanges.noIndex = true;

      const changedFields = Object.keys(fieldChanges);
      if (changedFields.length > 0) {
        dMap[page.id] = fieldChanges;
        count += changedFields.length;
      }
    });

    return { dirtyMap: dMap, totalDirtyCount: count };
  }, [pages, initialPages]);

  // Check duplicate slugs in current working state
  const duplicateSlugs = useMemo(() => {
    const slugCounts = new Map<string, number>();
    pages.forEach((p) => {
      const s = (p.slug || "").trim().toLowerCase();
      if (s) slugCounts.set(s, (slugCounts.get(s) || 0) + 1);
    });
    const dupes = new Set<string>();
    slugCounts.forEach((count, slug) => {
      if (count > 1) dupes.add(slug);
    });
    return dupes;
  }, [pages]);

  // Presets
  const applyPreset = (preset: "seo" | "publishing" | "all") => {
    switch (preset) {
      case "seo":
        setVisibleColumns(new Set(["slug", "metaTitle", "metaDesc", "focusKeyword", "canonicalUrl", "noIndex"]));
        break;
      case "publishing":
        setVisibleColumns(new Set(["slug", "status"]));
        break;
      case "all":
        setVisibleColumns(new Set(AVAILABLE_PAGE_COLUMNS.map((c) => c.key)));
        break;
    }
  };

  // Cell updater helper
  const updatePageField = useCallback(
    (id: string, field: string, value: any) => {
      setPages((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          if (field.startsWith("seo.")) {
            const seoKey = field.replace("seo.", "");
            return {
              ...item,
              seo: {
                ...(item.seo || {}),
                [seoKey]: value,
              },
            };
          }

          return { ...item, [field]: value };
        })
      );
    },
    []
  );

  // Apply First Row Value to All Rows (Excel Fill Down)
  const applyFirstRowToAll = (field: PageBulkColumnKey) => {
    if (pages.length <= 1) return;
    const firstVal = pages[0];

    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx === 0) return p;

        switch (field) {
          case "status":
            return { ...p, status: firstVal.status };
          case "metaTitle":
            return { ...p, seo: { ...(p.seo || {}), metaTitle: firstVal.seo?.metaTitle } };
          case "metaDesc":
            return { ...p, seo: { ...(p.seo || {}), metaDesc: firstVal.seo?.metaDesc } };
          case "focusKeyword":
            return { ...p, seo: { ...(p.seo || {}), focusKeyword: firstVal.seo?.focusKeyword } };
          case "canonicalUrl":
            return { ...p, seo: { ...(p.seo || {}), canonicalUrl: firstVal.seo?.canonicalUrl } };
          case "noIndex":
            return { ...p, seo: { ...(p.seo || {}), noIndex: firstVal.seo?.noIndex } };
          default:
            return p;
        }
      })
    );

    toast.add({
      title: "Column Values Applied",
      description: `Copied top value down for column "${field}".`,
      type: "info",
    });
  };

  // Discard all changes
  const handleDiscard = () => {
    setPages(JSON.parse(JSON.stringify(initialPages)));
    toast.add({
      title: "Changes Reverted",
      description: "Restored all items to their original values.",
      type: "info",
    });
  };

  // Commit Batch Save
  const handleSave = async () => {
    if (duplicateSlugs.size > 0) {
      toast.add({
        title: "Validation Error",
        description: "Please fix duplicate slugs before saving.",
        type: "error",
      });
      return;
    }

    if (totalDirtyCount === 0) return;

    const updates = Object.keys(dirtyMap).map((pageId) => {
      const page = pages.find((p) => p.id === pageId)!;
      const changedKeys = dirtyMap[pageId];

      const changes: any = {};
      if (changedKeys.title) changes.title = page.title;
      if (changedKeys.slug) changes.slug = page.slug;
      if (changedKeys.status) changes.status = page.status;
      if (changedKeys.metaTitle) changes.metaTitle = page.seo?.metaTitle || "";
      if (changedKeys.metaDesc) changes.metaDesc = page.seo?.metaDesc || "";
      if (changedKeys.focusKeyword) changes.focusKeyword = page.seo?.focusKeyword || "";
      if (changedKeys.canonicalUrl) changes.canonicalUrl = page.seo?.canonicalUrl || "";
      if (changedKeys.noIndex) changes.noIndex = Boolean(page.seo?.noIndex);

      return { id: pageId, changes };
    });

    try {
      setIsSaving(true);
      const res = await fetch("/api/pages/bulk", {
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
        description: `Successfully saved ${totalDirtyCount} modifications across ${updates.length} webpages.`,
        type: "success",
      });

      router.push("/webpages");
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

  const isCellDirty = (pageId: string, field: string) => {
    return Boolean(dirtyMap[pageId]?.[field]);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Top Sticky Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 sm:p-4 bg-card border border-border rounded-xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/webpages">
            <Button variant="ghost" size="sm" className="h-8 px-2.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">
                Webpages Spreadsheet Bulk Editor
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Editing {pages.length} selected pages in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Quick Preset Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/80">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyPreset("seo")}
              className="h-7 px-2 text-[11px] font-medium cursor-pointer"
            >
              <Search className="w-3 h-3 mr-1" />
              SEO
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyPreset("publishing")}
              className="h-7 px-2 text-[11px] font-medium cursor-pointer"
            >
              <Globe className="w-3 h-3 mr-1" />
              Publishing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyPreset("all")}
              className="h-7 px-2 text-[11px] font-medium cursor-pointer"
            >
              All Columns
            </Button>
          </div>

          {/* Columns Selector Popover with Real Checkboxes */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs cursor-pointer border-border"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                  <span>Columns ({visibleColumns.size})</span>
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
                      setVisibleColumns(new Set(AVAILABLE_PAGE_COLUMNS.map((c) => c.key)))
                    }
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleColumns(new Set(["slug", "status", "metaTitle"]))
                    }
                    className="text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {AVAILABLE_PAGE_COLUMNS.map((col) => {
                  const isChecked = visibleColumns.has(col.key);
                  return (
                    <div
                      key={col.key}
                      onClick={() => {
                        const next = new Set(visibleColumns);
                        if (isChecked) next.delete(col.key);
                        else next.add(col.key);
                        setVisibleColumns(next);
                      }}
                      className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const next = new Set(visibleColumns);
                            if (checked) next.add(col.key);
                            else next.delete(col.key);
                            setVisibleColumns(next);
                          }}
                        />
                        <span className="text-xs font-medium text-foreground truncate">
                          {col.label}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-border/80"
                      >
                        {col.category}
                      </Badge>
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
            onClick={handleSave}
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

      {/* Excel-Style Spreadsheet Table Grid */}
      <div className="flex-1 min-h-0 relative border border-border rounded-xl bg-card shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 w-full">
          <table className="w-full text-xs border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold sticky top-0 z-30 shadow-xs">
                {/* Fixed Sticky Column: Page Title */}
                <th className="py-3 px-4 text-left font-semibold text-xs sticky left-0 z-40 bg-muted/95 backdrop-blur-xs min-w-[280px] w-[280px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <span>Page & Title</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      #{pages.length}
                    </span>
                  </div>
                </th>

                {/* Dynamic Columns */}
                {AVAILABLE_PAGE_COLUMNS.filter((c) => visibleColumns.has(c.key)).map(
                  (col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "py-3 px-3 text-left font-semibold text-xs border-r border-border/80 last:border-r-0",
                        col.width
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{col.label}</span>
                        {/* Column Fill-Down Action */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                title="Column bulk actions"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => applyFirstRowToAll(col.key)}
                              className="text-xs cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 mr-2" />
                              <span>Copy 1st row to all</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </th>
                  )
                )}
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-border/60">
              {pages.map((page, index) => {
                const isSlugDupe = duplicateSlugs.has((page.slug || "").trim().toLowerCase());
                const baseUrl = clientConfig.app.frontendUrl;
                const pageSlug = page.slug === "/" ? "" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
                const liveUrl = baseUrl ? `${baseUrl}${pageSlug}` : null;

                return (
                  <tr
                    key={page.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Fixed Sticky Column 1: Page Title */}
                    <td className="p-3 sticky left-0 z-20 bg-card group-hover:bg-muted/30 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[280px] w-[280px]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-muted-foreground font-mono w-4 text-right shrink-0">
                          {index + 1}
                        </span>
                        <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Input
                            value={page.title}
                            onChange={(e) =>
                              updatePageField(page.id, "title", e.target.value)
                            }
                            className={cn(
                              "h-7 text-xs font-semibold px-2 rounded-sm border-transparent hover:border-border focus:border-primary bg-transparent",
                              isCellDirty(page.id, "title") && "bg-amber-500/10 border-amber-500/40"
                            )}
                          />
                          {liveUrl && (
                            <a
                              href={liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 px-2 truncate"
                            >
                              <span className="truncate">{pageSlug || "/"}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Dynamic Columns */}
                    {AVAILABLE_PAGE_COLUMNS.filter((c) => visibleColumns.has(c.key)).map((col) => {
                      switch (col.key) {
                        case "slug":
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "p-2 border-r border-border/60",
                                isCellDirty(page.id, "slug") && "bg-amber-500/5"
                              )}
                            >
                              <Input
                                value={page.slug}
                                onChange={(e) =>
                                  updatePageField(page.id, "slug", e.target.value)
                                }
                                className={cn(
                                  "h-8 text-xs font-mono px-2 rounded-sm",
                                  isSlugDupe && "border-destructive text-destructive bg-destructive/10",
                                  isCellDirty(page.id, "slug") && "border-amber-500/40"
                                )}
                                placeholder="page-slug"
                              />
                            </td>
                          );

                        case "status":
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "p-2 border-r border-border/60",
                                isCellDirty(page.id, "status") && "bg-amber-500/5"
                              )}
                            >
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePageField(
                                      page.id,
                                      "status",
                                      page.status === "published" ? "draft" : "published"
                                    )
                                  }
                                  className={cn(
                                    "px-2.5 py-1 text-[11px] font-bold rounded-sm border transition-all cursor-pointer",
                                    page.status === "published"
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  )}
                                >
                                  {page.status.toUpperCase()}
                                </button>
                              </div>
                            </td>
                          );

                        case "metaTitle":
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "p-2 border-r border-border/60",
                                isCellDirty(page.id, "metaTitle") && "bg-amber-500/5"
                              )}
                            >
                              <Input
                                value={page.seo?.metaTitle || ""}
                                onChange={(e) =>
                                  updatePageField(page.id, "seo.metaTitle", e.target.value)
                                }
                                placeholder="SEO title..."
                                className={cn(
                                  "h-8 text-xs px-2 rounded-sm",
                                  isCellDirty(page.id, "metaTitle") && "border-amber-500/40"
                                )}
                              />
                            </td>
                          );

                        case "metaDesc":
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "p-2 border-r border-border/60",
                                isCellDirty(page.id, "metaDesc") && "bg-amber-500/5"
                              )}
                            >
                              <Input
                                value={page.seo?.metaDesc || ""}
                                onChange={(e) =>
                                  updatePageField(page.id, "seo.metaDesc", e.target.value)
                                }
                                placeholder="Meta description..."
                                className={cn(
                                  "h-8 text-xs px-2 rounded-sm",
                                  isCellDirty(page.id, "metaDesc") && "border-amber-500/40"
                                )}
                              />
                            </td>
                          );

                        case "focusKeyword":
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "p-2 border-r border-border/60",
                                isCellDirty(page.id, "focusKeyword") && "bg-amber-500/5"
                              )}
                            >
                              <Input
                                value={page.seo?.focusKeyword || ""}
                                onChange={(e) =>
                                  updatePageField(page.id, "seo.focusKeyword", e.target.value)
                                }
                                placeholder="Focus keyword..."
                                className={cn(
                                  "h-8 text-xs px-2 rounded-sm",
                                  isCellDirty(page.id, "focusKeyword") && "border-amber-500/40"
                                )}
                              />
                            </td>
                          );

                        case "canonicalUrl":
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "p-2 border-r border-border/60",
                                isCellDirty(page.id, "canonicalUrl") && "bg-amber-500/5"
                              )}
                            >
                              <Input
                                value={page.seo?.canonicalUrl || ""}
                                onChange={(e) =>
                                  updatePageField(page.id, "seo.canonicalUrl", e.target.value)
                                }
                                placeholder="https://..."
                                className={cn(
                                  "h-8 text-xs font-mono px-2 rounded-sm",
                                  isCellDirty(page.id, "canonicalUrl") && "border-amber-500/40"
                                )}
                              />
                            </td>
                          );

                        case "noIndex":
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "p-2 border-r border-border/60 text-center",
                                isCellDirty(page.id, "noIndex") && "bg-amber-500/5"
                              )}
                            >
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={Boolean(page.seo?.noIndex)}
                                  onCheckedChange={(val) =>
                                    updatePageField(page.id, "seo.noIndex", val)
                                  }
                                />
                              </div>
                            </td>
                          );

                        default:
                          return null;
                      }
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
