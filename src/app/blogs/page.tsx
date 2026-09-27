"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import { PenTool, Plus, BookOpen, CheckCircle2, FileEdit, Trash2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminTopBar } from "@/components/AdminTopBar";
import { ContentMetricCards, MetricCardItem } from "@/components/admin/ContentMetricCards";
import { ContentFilterBar, ContentFilterTab } from "@/components/admin/ContentFilterBar";

import { DataTable } from "@/components/ui/data-table";
import { getBlogsColumns } from "./blogs-columns";

export default function BlogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "scheduled" | "draft" | "trash"
  >("all");

  const { data, isLoading, mutate } = useSWR<any[]>("/api/blogs");
  const blogs = Array.isArray(data) ? data : [];
  const loading = isLoading && !data;

  // Filter blogs based on search, status, and isTrashed
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.slug.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (statusFilter === "trash") {
      return matchesSearch && blog.isTrashed === true;
    } else {
      const matchesStatus = statusFilter === "all" || blog.status === statusFilter;
      return matchesSearch && matchesStatus && blog.isTrashed !== true;
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

  return (
    <>
      <AdminTopBar breadcrumbs="Blogs" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 py-6 px-[15px] md:px-[20px] lg:px-[30px]">
        {/* 5 Status Metric Filter Cards */}
        <ContentMetricCards cards={metricCards} loading={loading} />

        {/* Page Title & Create Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Blog Posts
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and organize your blog content ({totalCount} total)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/blogs/create">
              <Button className="h-8 rounded-sm px-3 flex items-center gap-2 text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Create Post
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Filter & Search Bar */}
        <ContentFilterBar
          tabs={filterTabs}
          activeTab={statusFilter}
          onTabChange={(id) => setStatusFilter(id as any)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by title or slug..."
        />

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
            <div className="text-black font-semibold text-base mb-1">
              No matching blogs found
            </div>
            <p className="text-black text-xs max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search terms or filters."
                : "No blogs exist in the database."}
            </p>
          </div>
        ) : (
          <DataTable
            columns={getBlogsColumns(() => {
              mutate();
              globalMutate("/api/dashboard/stats");
            })}
            data={filteredBlogs}
          />
        )}
      </div>
    </>
  );
}
