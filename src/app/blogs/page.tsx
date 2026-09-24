"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import { Search, PenTool, Plus, BookOpen, CheckCircle2, FileEdit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminTopBar } from "@/components/AdminTopBar";

import { DataTable } from "@/components/ui/data-table";
import { getBlogsColumns } from "./blogs-columns";

export default function BlogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft" | "trash"
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
  const draftCount = blogs.filter(
    (b) => !b.isTrashed && b.status === "draft",
  ).length;
  const trashedCount = blogs.filter((b) => b.isTrashed).length;

  return (
    <>
      <AdminTopBar breadcrumbs="Blogs" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 py-6 px-[15px] md:px-[20px] lg:px-[30px]">
        
        {/* 4 Status Metric Filter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
            </>
          ) : (
            <>
              {/* Total Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setStatusFilter("all")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  statusFilter === "all"
                    ? "bg-primary/5 border-primary ring-1 ring-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Blogs
                  </p>
                  <div className="p-1.5 rounded-sm bg-primary/10 text-primary">
                    <BookOpen className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {totalCount}
                  </div>
                  {statusFilter === "all" && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Published Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setStatusFilter("published")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  statusFilter === "published"
                    ? "bg-emerald-500/5 border-emerald-500 ring-1 ring-emerald-500 shadow-sm"
                    : "bg-card border-border hover:border-emerald-500/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Published
                  </p>
                  <div className="p-1.5 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {publishedCount}
                  </div>
                  {statusFilter === "published" && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-xs border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Drafted Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setStatusFilter("draft")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  statusFilter === "draft"
                    ? "bg-amber-500/5 border-amber-500 ring-1 ring-amber-500 shadow-sm"
                    : "bg-card border-border hover:border-amber-500/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Drafted
                  </p>
                  <div className="p-1.5 rounded-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <FileEdit className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {draftCount}
                  </div>
                  {statusFilter === "draft" && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-xs border border-amber-500/20">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Trashed Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setStatusFilter("trash")}
                className={`rounded-sm border p-4 shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none ${
                  statusFilter === "trash"
                    ? "bg-red-500/5 border-red-500 ring-1 ring-red-500 shadow-sm"
                    : "bg-card border-border hover:border-red-500/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Trashed
                  </p>
                  <div className="p-1.5 rounded-sm bg-red-500/10 text-red-600 dark:text-red-400">
                    <Trash2 className="size-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-2xl font-extrabold text-foreground">
                    {trashedCount}
                  </div>
                  {statusFilter === "trash" && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-xs border border-red-500/20">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Page Title & Filter Bar */}
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
            <div className="px-3 py-1.5 bg-card border border-border rounded-sm text-xs font-medium text-muted-foreground">
              Published:{" "}
              <span className="text-foreground font-bold">
                {publishedCount}
              </span>{" "}
              &bull; Drafts:{" "}
              <span className="text-muted-foreground font-bold">
                {draftCount}
              </span>{" "}
              &bull; Trashed:{" "}
              <span className="text-red-500 font-bold">
                {trashedCount}
              </span>
            </div>
            <Link href="/blogs/create">
              <Button className="h-8 rounded-sm px-3 flex items-center gap-2 text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Create Post
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 border border-border rounded-sm">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
              strokeWidth={2.5}
            />
            <input
              type="text"
              placeholder="Search by title or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-sm text-foreground text-xs font-medium focus:outline-none focus:border-accent transition-all"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-background border border-border"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                statusFilter === "published"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-background border border-border"
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                statusFilter === "draft"
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-background border border-border"
              }`}
            >
              Drafts ({draftCount})
            </button>
            <button
              onClick={() => setStatusFilter("trash")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                statusFilter === "trash"
                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800 shadow-sm"
                  : "text-muted-foreground hover:text-red-500 bg-background border border-border"
              }`}
            >
              Trash ({trashedCount})
            </button>
          </div>
        </div>

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
