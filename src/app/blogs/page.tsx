"use client";

import { useState, useMemo, useEffect, Suspense, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Plus,
  FolderTree,
  X,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { DataTable } from "@/components/table/DataTable";
import { ContentMetricCards } from "@/components/table/ContentMetricCards";
import { ContentFilterBar } from "@/components/table/ContentFilterBar";
import { TableFloatingDock } from "@/components/table/TableFloatingDock";
import { useContentTable } from "@/components/table/useContentTable";
import { getBlogsColumns } from "./blogs-columns";

function BlogsContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");
  const [categoryFilter, setCategoryFilter] = useState<string>(urlCategory || "all");

  const { data, isLoading, mutate } = useSWR<any[]>("/api/blogs");
  const { data: categoriesData } = useSWR<any[]>("/api/categories");
  const categoriesList = Array.isArray(categoriesData) ? categoriesData : [];

  useEffect(() => {
    mutate();
  }, [mutate]);

  const customFilter = useCallback(
    (blog: any) => {
      if (categoryFilter === "all") return true;
      return Array.isArray(blog.categories) && blog.categories.includes(categoryFilter);
    },
    [categoryFilter]
  );

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isTrashedView,
    filteredData: filteredBlogs,
    metricCards,
    filterTabs,
    handleBulkAction,
  } = useContentTable({
    data,
    entityName: "blogs",
    bulkActionEndpoint: "/api/bulk-action",
    totalIcon: BookOpen,
    includeScheduled: true,
    customFilter,
    mutate,
  });

  const handleDataChange = useCallback(() => {
    mutate();
  }, [mutate]);

  const columns = useMemo(() => getBlogsColumns(handleDataChange), [handleDataChange]);
  const loading = isLoading && !data;

  return (
    <>
      <AdminTopBar breadcrumbs="Blogs" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5">
        {/* 5 Status Metric Filter Cards */}
        <ContentMetricCards cards={metricCards} loading={loading} />

        {/* Global Filter & Search Bar with Category Filter & Action Button */}
        <ContentFilterBar
          tabs={filterTabs}
          activeTab={statusFilter}
          onTabChange={setStatusFilter}
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
            renderBulkActionDock={(selectedRows, clearSelection) => (
              <TableFloatingDock
                selectedItems={selectedRows}
                onClearSelection={clearSelection}
                entityName="blogs"
                entityType="blogs"
                bulkEditUrl="/blogs/bulk-edit"
                isTrashedView={isTrashedView}
                onBulkAction={handleBulkAction}
              />
            )}
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
