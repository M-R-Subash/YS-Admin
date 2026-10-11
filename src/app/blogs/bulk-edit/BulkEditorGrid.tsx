"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  SlidersHorizontal,
  FolderTree,
  Search,
  Globe,
  Check,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  X,
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

export interface BulkBlogItem {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft" | "scheduled";
  categories: string[];
  tags: string[];
  allowComments: boolean;
  readingTime?: number;
  featuredImage?: string | null;
  excerpt?: string | null;
  seo?: {
    metaTitle?: string | null;
    metaDesc?: string | null;
    focusKeyword?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean | null;
  } | null;
}

export type BulkColumnKey =
  | "slug"
  | "status"
  | "categories"
  | "tags"
  | "allowComments"
  | "readingTime"
  | "featuredImage"
  | "excerpt"
  | "metaTitle"
  | "metaDesc"
  | "focusKeyword"
  | "canonicalUrl"
  | "noIndex";

interface ColumnConfig {
  key: BulkColumnKey;
  label: string;
  width: string;
  category: "Taxonomy" | "SEO" | "Publishing" | "General";
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: "slug", label: "Slug", width: "w-56 min-w-[220px]", category: "General" },
  { key: "status", label: "Status", width: "w-36 min-w-[140px]", category: "Publishing" },
  { key: "categories", label: "Categories", width: "w-64 min-w-[240px]", category: "Taxonomy" },
  { key: "tags", label: "Tags", width: "w-64 min-w-[240px]", category: "Taxonomy" },
  { key: "allowComments", label: "Comments", width: "w-28 min-w-[100px]", category: "Publishing" },
  { key: "readingTime", label: "Read Time", width: "w-28 min-w-[100px]", category: "Publishing" },
  { key: "featuredImage", label: "Featured Image", width: "w-64 min-w-[240px]", category: "General" },
  { key: "excerpt", label: "Excerpt", width: "w-72 min-w-[280px]", category: "General" },
  { key: "metaTitle", label: "Meta Title", width: "w-64 min-w-[240px]", category: "SEO" },
  { key: "metaDesc", label: "Meta Description", width: "w-72 min-w-[280px]", category: "SEO" },
  { key: "focusKeyword", label: "Focus Keyword", width: "w-44 min-w-[160px]", category: "SEO" },
  { key: "canonicalUrl", label: "Canonical URL", width: "w-64 min-w-[240px]", category: "SEO" },
  { key: "noIndex", label: "No Index", width: "w-28 min-w-[100px]", category: "SEO" },
];

export interface BulkEditorGridProps {
  initialBlogs: BulkBlogItem[];
  allCategories?: { id: string; name: string }[];
  allTags?: { id: string; name: string }[];
}

export function BulkEditorGrid({
  initialBlogs,
  allCategories = [],
  allTags = [],
}: BulkEditorGridProps) {
  const router = useRouter();

  // Local working state of blogs
  const [blogs, setBlogs] = useState<BulkBlogItem[]>(() =>
    JSON.parse(JSON.stringify(initialBlogs))
  );

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<BulkColumnKey>>(
    new Set(["slug", "status", "categories", "tags", "allowComments"])
  );

  const [isSaving, setIsSaving] = useState(false);
  const [tagInputMap, setTagInputMap] = useState<Record<string, string>>({});

  // Compute dirty map comparing current blogs to initialBlogs
  const { dirtyMap, totalDirtyCount } = useMemo(() => {
    const dMap: Record<string, Record<string, boolean>> = {};
    let count = 0;

    const initialMap = new Map(initialBlogs.map((b) => [b.id, b]));

    blogs.forEach((blog) => {
      const orig = initialMap.get(blog.id);
      if (!orig) return;

      const fieldChanges: Record<string, boolean> = {};

      if (blog.title !== orig.title) fieldChanges.title = true;
      if (blog.slug !== orig.slug) fieldChanges.slug = true;
      if (blog.status !== orig.status) fieldChanges.status = true;
      if (blog.allowComments !== orig.allowComments) fieldChanges.allowComments = true;
      if (Number(blog.readingTime || 1) !== Number(orig.readingTime || 1))
        fieldChanges.readingTime = true;

      // Array comparisons
      const catA = (blog.categories || []).slice().sort().join(",");
      const catB = (orig.categories || []).slice().sort().join(",");
      if (catA !== catB) fieldChanges.categories = true;

      const tagA = (blog.tags || []).slice().sort().join(",");
      const tagB = (orig.tags || []).slice().sort().join(",");
      if (tagA !== tagB) fieldChanges.tags = true;

      // SEO comparisons
      const metaTitleA = blog.seo?.metaTitle || "";
      const metaTitleB = orig.seo?.metaTitle || "";
      if (metaTitleA !== metaTitleB) fieldChanges.metaTitle = true;

      const metaDescA = blog.seo?.metaDesc || "";
      const metaDescB = orig.seo?.metaDesc || "";
      if (metaDescA !== metaDescB) fieldChanges.metaDesc = true;

      if (blog.featuredImage !== orig.featuredImage) fieldChanges.featuredImage = true;
      if (blog.excerpt !== orig.excerpt) fieldChanges.excerpt = true;

      const canonA = blog.seo?.canonicalUrl || "";
      const canonB = orig.seo?.canonicalUrl || "";
      if (canonA !== canonB) fieldChanges.canonicalUrl = true;

      const noIndexA = Boolean(blog.seo?.noIndex);
      const noIndexB = Boolean(orig.seo?.noIndex);
      if (noIndexA !== noIndexB) fieldChanges.noIndex = true;

      const changedFields = Object.keys(fieldChanges);
      if (changedFields.length > 0) {
        dMap[blog.id] = fieldChanges;
        count += changedFields.length;
      }
    });

    return { dirtyMap: dMap, totalDirtyCount: count };
  }, [blogs, initialBlogs]);

  // Check duplicate slugs in current working state
  const duplicateSlugs = useMemo(() => {
    const slugCounts = new Map<string, number>();
    blogs.forEach((b) => {
      const s = (b.slug || "").trim().toLowerCase();
      if (s) slugCounts.set(s, (slugCounts.get(s) || 0) + 1);
    });
    const dupes = new Set<string>();
    slugCounts.forEach((count, slug) => {
      if (count > 1) dupes.add(slug);
    });
    return dupes;
  }, [blogs]);

  // Presets
  const applyPreset = (preset: "taxonomy" | "seo" | "publishing" | "all") => {
    switch (preset) {
      case "taxonomy":
        setVisibleColumns(new Set(["categories", "tags", "status"]));
        break;
      case "seo":
        setVisibleColumns(new Set(["slug", "metaTitle", "metaDesc", "focusKeyword"]));
        break;
      case "publishing":
        setVisibleColumns(new Set(["status", "allowComments", "readingTime", "slug"]));
        break;
      case "all":
        setVisibleColumns(new Set(AVAILABLE_COLUMNS.map((c) => c.key)));
        break;
    }
  };

  // Cell updater helper
  const updateBlogField = useCallback(
    (id: string, field: string, value: any) => {
      setBlogs((prev) =>
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
  const applyFirstRowToAll = (field: BulkColumnKey) => {
    if (blogs.length <= 1) return;
    const firstVal = blogs[0];

    setBlogs((prev) =>
      prev.map((b, idx) => {
        if (idx === 0) return b;

        switch (field) {
          case "status":
            return { ...b, status: firstVal.status };
          case "allowComments":
            return { ...b, allowComments: firstVal.allowComments };
          case "readingTime":
            return { ...b, readingTime: firstVal.readingTime };
          case "categories":
            return { ...b, categories: [...(firstVal.categories || [])] };
          case "tags":
            return { ...b, tags: [...(firstVal.tags || [])] };
          case "metaTitle":
            return {
              ...b,
              seo: { ...(b.seo || {}), metaTitle: firstVal.seo?.metaTitle || "" },
            };
          case "metaDesc":
            return {
              ...b,
              seo: { ...(b.seo || {}), metaDesc: firstVal.seo?.metaDesc || "" },
            };
          case "focusKeyword":
            return {
              ...b,
              seo: { ...(b.seo || {}), focusKeyword: firstVal.seo?.focusKeyword || "" },
            };
          case "featuredImage":
            return { ...b, featuredImage: firstVal.featuredImage };
          case "excerpt":
            return { ...b, excerpt: firstVal.excerpt };
          case "canonicalUrl":
            return {
              ...b,
              seo: { ...(b.seo || {}), canonicalUrl: firstVal.seo?.canonicalUrl || "" },
            };
          case "noIndex":
            return {
              ...b,
              seo: { ...(b.seo || {}), noIndex: Boolean(firstVal.seo?.noIndex) },
            };
          default:
            return b;
        }
      })
    );

    toast.add({
      title: "Column Updated",
      description: `Copied first row's ${field} across all ${blogs.length} items.`,
      type: "success",
    });
  };

  // Tag helper
  const handleAddTag = (blogId: string) => {
    const text = (tagInputMap[blogId] || "").trim();
    if (!text) return;

    setBlogs((prev) =>
      prev.map((b) => {
        if (b.id !== blogId) return b;
        const current = b.tags || [];
        if (current.includes(text)) return b;
        return { ...b, tags: [...current, text] };
      })
    );

    setTagInputMap((prev) => ({ ...prev, [blogId]: "" }));
  };

  const handleRemoveTag = (blogId: string, tagToRemove: string) => {
    setBlogs((prev) =>
      prev.map((b) => {
        if (b.id !== blogId) return b;
        return { ...b, tags: (b.tags || []).filter((t) => t !== tagToRemove) };
      })
    );
  };

  // Category toggle helper
  const handleToggleCategory = (blogId: string, catName: string) => {
    setBlogs((prev) =>
      prev.map((b) => {
        if (b.id !== blogId) return b;
        const current = b.categories || [];
        const exists = current.includes(catName);
        return {
          ...b,
          categories: exists
            ? current.filter((c) => c !== catName)
            : [...current, catName],
        };
      })
    );
  };

  // Discard all changes
  const handleDiscard = () => {
    setBlogs(JSON.parse(JSON.stringify(initialBlogs)));
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

    const updates = Object.keys(dirtyMap).map((blogId) => {
      const blog = blogs.find((b) => b.id === blogId)!;
      const changedKeys = dirtyMap[blogId];

      const changes: any = {};
      if (changedKeys.title) changes.title = blog.title;
      if (changedKeys.slug) changes.slug = blog.slug;
      if (changedKeys.status) changes.status = blog.status;
      if (changedKeys.categories) changes.categories = blog.categories;
      if (changedKeys.tags) changes.tags = blog.tags;
      if (changedKeys.allowComments) changes.allowComments = blog.allowComments;
      if (changedKeys.readingTime) changes.readingTime = blog.readingTime;
      if (changedKeys.metaTitle) changes.metaTitle = blog.seo?.metaTitle || "";
      if (changedKeys.metaDesc) changes.metaDesc = blog.seo?.metaDesc || "";
      if (changedKeys.focusKeyword) changes.focusKeyword = blog.seo?.focusKeyword || "";
      if (changedKeys.featuredImage) changes.featuredImage = blog.featuredImage;
      if (changedKeys.excerpt) changes.excerpt = blog.excerpt;
      if (changedKeys.canonicalUrl) changes.canonicalUrl = blog.seo?.canonicalUrl || "";
      if (changedKeys.noIndex) changes.noIndex = Boolean(blog.seo?.noIndex);

      return { id: blogId, changes };
    });

    try {
      setIsSaving(true);
      const res = await fetch("/api/blogs/bulk", {
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
        description: `Successfully saved ${totalDirtyCount} modifications across ${updates.length} blogs.`,
        type: "success",
      });

      router.push("/blogs");
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

  const isCellDirty = (blogId: string, field: string) => {
    return Boolean(dirtyMap[blogId]?.[field]);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Top Sticky Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 sm:p-4 bg-card border border-border rounded-xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/blogs">
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
                Spreadsheet Bulk Editor
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Editing {blogs.length} selected blog posts in real-time
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
              onClick={() => applyPreset("taxonomy")}
              className="h-7 px-2 text-[11px] font-medium cursor-pointer"
            >
              <FolderTree className="w-3 h-3 mr-1" />
              Taxonomies
            </Button>
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
                      setVisibleColumns(new Set(AVAILABLE_COLUMNS.map((c) => c.key)))
                    }
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleColumns(new Set(["slug", "status", "categories"]))
                    }
                    className="text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {AVAILABLE_COLUMNS.map((col) => {
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
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
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
                {/* Fixed Sticky Column: Post Title */}
                <th className="py-3 px-4 text-left font-semibold text-xs sticky left-0 z-40 bg-muted/95 backdrop-blur-xs min-w-[280px] w-[280px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <span>Post & Title</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      #{blogs.length}
                    </span>
                  </div>
                </th>

                {/* Dynamic Columns */}
                {AVAILABLE_COLUMNS.filter((c) => visibleColumns.has(c.key)).map(
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
                              Copy first row down
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </th>
                  )
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {blogs.map((blog, rowIndex) => {
                const siteUrl = clientConfig.app.frontendUrl;
                const isSlugDupe = duplicateSlugs.has((blog.slug || "").toLowerCase());

                return (
                  <tr
                    key={blog.id}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    {/* Fixed Sticky Column: Post Title & Image */}
                    <td className="py-2.5 px-3 sticky left-0 z-20 bg-card group-hover:bg-card border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-4 text-center">
                          {rowIndex + 1}
                        </span>
                        {blog.featuredImage ? (
                          <img
                            src={blog.featuredImage}
                            alt=""
                            className="w-8 h-8 rounded-sm object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center shrink-0 border border-border text-[9px] text-muted-foreground font-bold">
                            Img
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            value={blog.title}
                            onChange={(e) =>
                              updateBlogField(blog.id, "title", e.target.value)
                            }
                            className={cn(
                              "w-full text-xs font-semibold bg-transparent border-0 p-0 focus:outline-none focus:ring-1 focus:ring-primary rounded-xs truncate text-foreground",
                              isCellDirty(blog.id, "title") &&
                                "text-primary font-bold underline decoration-primary/40"
                            )}
                          />
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                            <span className="truncate font-mono">
                              /{blog.slug}
                            </span>
                            {siteUrl && (
                              <a
                                href={`${siteUrl}/blogs/${blog.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-primary shrink-0"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    {visibleColumns.has("slug") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80 relative",
                          isCellDirty(blog.id, "slug") && "bg-primary/5",
                          isSlugDupe && "bg-destructive/10"
                        )}
                      >
                        <Input
                          value={blog.slug}
                          onChange={(e) =>
                            updateBlogField(
                              blog.id,
                              "slug",
                              e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "")
                            )
                          }
                          className={cn(
                            "h-8 text-xs font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background",
                            isSlugDupe && "border-destructive text-destructive font-bold"
                          )}
                        />
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.has("status") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "status") && "bg-primary/5"
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="w-full flex items-center justify-between h-8 px-2.5 rounded-md border border-border/80 hover:bg-muted text-xs cursor-pointer font-medium"
                              >
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] uppercase font-bold px-1.5 py-0",
                                    blog.status === "published"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : blog.status === "scheduled"
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  )}
                                >
                                  {blog.status}
                                </Badge>
                              </button>
                            }
                          />
                          <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem
                              onClick={() => updateBlogField(blog.id, "status", "published")}
                              className="text-xs cursor-pointer"
                            >
                              Published
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateBlogField(blog.id, "status", "draft")}
                              className="text-xs cursor-pointer"
                            >
                              Draft
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}

                    {/* Categories Multi-Select */}
                    {visibleColumns.has("categories") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "categories") && "bg-primary/5"
                        )}
                      >
                        <Popover>
                          <PopoverTrigger
                            render={
                              <div className="min-h-8 flex flex-wrap items-center gap-1 p-1 rounded-md border border-transparent hover:border-border cursor-pointer">
                                {(blog.categories || []).length > 0 ? (
                                  blog.categories.map((cat) => (
                                    <span
                                      key={cat}
                                      className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-semibold rounded-xs"
                                    >
                                      {cat}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    + Add category
                                  </span>
                                )}
                              </div>
                            }
                          />
                          <PopoverContent align="start" className="w-56 p-2">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 px-1">
                              Select Categories
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {allCategories.map((cat) => {
                                const selected = (blog.categories || []).includes(cat.name);
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleToggleCategory(blog.id, cat.name)}
                                    className="w-full flex items-center justify-between p-1.5 text-xs rounded-md hover:bg-muted cursor-pointer text-left"
                                  >
                                    <span>{cat.name}</span>
                                    {selected && <Check className="w-3.5 h-3.5 text-primary" />}
                                  </button>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                    )}

                    {/* Tags Multi-Select */}
                    {visibleColumns.has("tags") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "tags") && "bg-primary/5"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1 min-h-8">
                          {(blog.tags || []).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded-xs"
                            >
                              <span>#{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(blog.id, t)}
                                className="hover:text-destructive cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                          <div className="flex items-center gap-1 w-24">
                            <input
                              type="text"
                              placeholder="+ tag"
                              list={`tags-list-${blog.id}`}
                              value={tagInputMap[blog.id] || ""}
                              onChange={(e) =>
                                setTagInputMap((prev) => ({
                                  ...prev,
                                  [blog.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddTag(blog.id);
                                }
                              }}
                              className="text-[11px] bg-transparent border-0 p-0 focus:outline-none w-full text-foreground placeholder:text-muted-foreground"
                            />
                            {allTags.length > 0 && (
                              <datalist id={`tags-list-${blog.id}`}>
                                {allTags.map((tag) => (
                                  <option key={tag.id} value={tag.name} />
                                ))}
                              </datalist>
                            )}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Allow Comments */}
                    {visibleColumns.has("allowComments") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80 text-center",
                          isCellDirty(blog.id, "allowComments") && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={blog.allowComments}
                            onCheckedChange={(checked) =>
                              updateBlogField(blog.id, "allowComments", checked)
                            }
                          />
                        </div>
                      </td>
                    )}

                    {/* Reading Time */}
                    {visibleColumns.has("readingTime") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "readingTime") && "bg-primary/5"
                        )}
                      >
                        <Input
                          type="number"
                          min={1}
                          value={blog.readingTime || 1}
                          onChange={(e) =>
                            updateBlogField(blog.id, "readingTime", Number(e.target.value))
                          }
                          className="h-8 text-xs font-mono text-center bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                      </td>
                    )}

                    {/* Meta Title */}
                    {visibleColumns.has("metaTitle") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "metaTitle") && "bg-primary/5"
                        )}
                      >
                        <Input
                          value={blog.seo?.metaTitle || ""}
                          placeholder="Meta title"
                          onChange={(e) =>
                            updateBlogField(blog.id, "seo.metaTitle", e.target.value)
                          }
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                      </td>
                    )}

                    {/* Meta Description */}
                    {visibleColumns.has("metaDesc") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "metaDesc") && "bg-primary/5"
                        )}
                      >
                        <Input
                          value={blog.seo?.metaDesc || ""}
                          placeholder="Meta description"
                          onChange={(e) =>
                            updateBlogField(blog.id, "seo.metaDesc", e.target.value)
                          }
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                      </td>
                    )}

                    {/* Focus Keyword */}
                    {visibleColumns.has("focusKeyword") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "focusKeyword") && "bg-primary/5"
                        )}
                      >
                        <Input
                          value={blog.seo?.focusKeyword || ""}
                          placeholder="Focus keyword"
                          onChange={(e) =>
                            updateBlogField(blog.id, "seo.focusKeyword", e.target.value)
                          }
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                      </td>
                    )}

                    {/* Featured Image */}
                    {visibleColumns.has("featuredImage") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "featuredImage") && "bg-primary/5"
                        )}
                      >
                        <Input
                          value={blog.featuredImage || ""}
                          placeholder="Image URL"
                          onChange={(e) =>
                            updateBlogField(blog.id, "featuredImage", e.target.value)
                          }
                          className="h-8 text-xs font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                      </td>
                    )}

                    {/* Excerpt */}
                    {visibleColumns.has("excerpt") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "excerpt") && "bg-primary/5"
                        )}
                      >
                        <Input
                          value={blog.excerpt || ""}
                          placeholder="Short summary..."
                          onChange={(e) =>
                            updateBlogField(blog.id, "excerpt", e.target.value)
                          }
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                      </td>
                    )}

                    {/* Canonical URL */}
                    {visibleColumns.has("canonicalUrl") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 border-r border-border/80",
                          isCellDirty(blog.id, "canonicalUrl") && "bg-primary/5"
                        )}
                      >
                        <Input
                          value={blog.seo?.canonicalUrl || ""}
                          placeholder="https://..."
                          onChange={(e) =>
                            updateBlogField(blog.id, "seo.canonicalUrl", e.target.value)
                          }
                          className="h-8 text-xs font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background"
                        />
                      </td>
                    )}

                    {/* No Index */}
                    {visibleColumns.has("noIndex") && (
                      <td
                        className={cn(
                          "py-2 px-2.5 text-center",
                          isCellDirty(blog.id, "noIndex") && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={Boolean(blog.seo?.noIndex)}
                            onCheckedChange={(checked) =>
                              updateBlogField(blog.id, "seo.noIndex", checked)
                            }
                          />
                        </div>
                      </td>
                    )}
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
