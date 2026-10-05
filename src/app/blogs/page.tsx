"use client";

import { useState, useMemo, Suspense } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PenTool, Plus, BookOpen, CheckCircle2, FileEdit, Trash2, Clock, X, FolderTree } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { ContentMetricCards, MetricCardItem } from "@/components/admin/ContentMetricCards";
import { ContentFilterBar, ContentFilterTab } from "@/components/admin/ContentFilterBar";

import { DataTable } from "@/components/ui/data-table";
import { getBlogsColumns } from "./blogs-columns";

function BlogsContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "scheduled" | "draft" | "trash"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>(urlCategory || "all");

  const { data, isLoading, mutate } = useSWR<any[]>("/api/blogs");
  const { data: categoriesData } = useSWR<any[]>("/api/categories");
  const categoriesList = Array.isArray(categoriesData) ? categoriesData : [];

  const blogs = Array.isArray(data) ? data : [];
  const loading = isLoading && !data;

  // Filter blogs based on search, status, category, and isTrashed
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      (Array.isArray(blog.categories) && blog.categories.includes(categoryFilter));

    if (statusFilter === "trash") {
      return matchesSearch && matchesCategory && blog.isTrashed === true;
    } else {
      const matchesStatus = statusFilter === "all" || blog.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus && blog.isTrashed !== true;
    }
  });

  const totalCount = blogs.filter((b) => !b.isTrashed).length;
  const publishedCount = blogs.filter(
    (b) => !b.isTrashed && b.status === "published",
  ).length;
  const scheduledCount = blogs.filter(
    (b) => !b.isTrashed && b.status === "scheduled",
  ).length;
  const draftCount = blogs.filter(
    (b) => !b.isTrashed && b.status === "draft",
  ).length;
  const trashedCount = blogs.filter((b) => b.isTrashed).length;

  const metricCards = useMemo<MetricCardItem[]>(() => [
    {
      id: "all",
      label: "Total Blogs",
      count: totalCount,
      icon: BookOpen,
      color: "primary",
      isActive: statusFilter === "all",
      onClick: () => setStatusFilter("all"),
    },
    {
      id: "published",
      label: "Published",
      count: publishedCount,
      icon: CheckCircle2,
      color: "emerald",
      isActive: statusFilter === "published",
      onClick: () => setStatusFilter("published"),
    },
    {
      id: "scheduled",
      label: "Scheduled",
      count: scheduledCount,
      icon: Clock,
      color: "purple",
      isActive: statusFilter === "scheduled",
      onClick: () => setStatusFilter("scheduled"),
    },
    {
      id: "draft",
      label: "Drafted",
      count: draftCount,
      icon: FileEdit,
      color: "amber",
      isActive: statusFilter === "draft",
      onClick: () => setStatusFilter("draft"),
    },
    {
      id: "trash",
      label: "Trashed",
      count: trashedCount,
      icon: Trash2,
      color: "red",
      isActive: statusFilter === "trash",
      onClick: () => setStatusFilter("trash"),
    },
  ], [totalCount, publishedCount, scheduledCount, draftCount, trashedCount, statusFilter]);

  const filterTabs = useMemo<ContentFilterTab[]>(() => [
    { id: "all", label: "All", count: totalCount, color: "primary" },
    { id: "published", label: "Published", count: publishedCount, color: "emerald" },
    { id: "scheduled", label: "Scheduled", count: scheduledCount, color: "purple" },
    { id: "draft", label: "Drafts", count: draftCount, color: "amber" },
    { id: "trash", label: "Trash", count: trashedCount, color: "red" },
  ], [totalCount, publishedCount, scheduledCount, draftCount, trashedCount]);

  const handleDataChange = useMemo(() => {
    return () => {
      mutate();
      globalMutate("/api/dashboard/stats");
      globalMutate("/api/categories");
      globalMutate("/api/tags");
    };
  }, [mutate]);

  const columns = useMemo(() => getBlogsColumns(handleDataChange), [handleDataChange]);

  return (
    <>
      <AdminTopBar breadcrumbs="Blogs" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 py-6 px-[15px] md:px-[20px] lg:px-[30px]">
        {/* 5 Status Metric Filter Cards */}
        <ContentMetricCards cards={metricCards} loading={loading} />

        {/* Global Filter & Search Bar with Category Filter & Action Button */}
        <ContentFilterBar
          tabs={filterTabs}
          activeTab={statusFilter}
          onTabChange={(id) => setStatusFilter(id as any)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by title or slug..."
          extraRightContent={
            <div className="flex items-center gap-2 shrink-0">
              {/* Category Filter Dropdown */}
              <div className="w-44">
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => setCategoryFilter(val ?? "all")}
                >
                  <SelectTrigger className="h-9 px-3 text-xs w-full bg-card border-border cursor-pointer">
                    <div className="flex items-center gap-1.5 truncate">
                      <FolderTree className="size-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all" className="text-xs cursor-pointer font-semibold">
                      All Categories
                    </SelectItem>
                    {categoriesList.map((cat: any) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.name}
                        className="text-xs cursor-pointer"
                      >
                        {cat.name} ({cat.postCount || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Create Post Button */}
              <Link href="/blogs/create" className="shrink-0">
                <Button className="h-9 rounded-sm px-3 flex items-center gap-2 text-xs cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Create Post
                </Button>
              </Link>
            </div>
          }
        />

        {/* Category Active Filter Banner */}
        {categoryFilter !== "all" && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium -mt-2">
            <div className="flex items-center gap-2">
              <FolderTree className="size-4" />
              <span>
                Filtering by Category: <strong className="font-bold underline">{categoryFilter}</strong>
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
                {filteredBlogs.length} {filteredBlogs.length === 1 ? "article" : "articles"}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className="flex items-center gap-1 hover:underline text-[11px] font-bold cursor-pointer"
            >
              <X className="size-3.5" /> Clear category filter
            </button>
          </div>
        )}

        {/* Blogs Table / Cards */}
        {loading ? (
          <div className="rounded-md border bg-card p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-border/40 text-muted flex items-center justify-center mx-auto mb-3">
              <PenTool className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
            </div>
            <div className="text-foreground font-semibold text-base mb-1">
              No matching blogs found
            </div>
            <p className="text-muted-foreground text-xs max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your search terms, status, or category filter."
                : "No blogs exist in the database."}
            </p>
            {categoryFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryFilter("all")}
                className="mt-3 text-xs cursor-pointer"
              >
                Clear Category Filter
              </Button>
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredBlogs}
          />
        )}
      </div>
    </>
  );
}

export default function BlogsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <BlogsContent />
    </Suspense>
  );
}
