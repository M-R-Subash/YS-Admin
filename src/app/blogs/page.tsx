"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, PenTool, Plus } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

import { DataTable } from "@/components/ui/data-table";
import { getBlogsColumns } from "./blogs-columns";

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft" | "trash"
  >("all");

  useEffect(() => {
    fetchBlogs();
  }, [statusFilter]);

  async function fetchBlogs(silent = false) {
    try {
      if (!silent) setLoading(true);
      const url =
        statusFilter === "trash" ? "/api/blogs?status=trash" : "/api/blogs";
      // Ensure we get fresh data by busting cache
      const fetchUrl = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const res = await fetch(fetchUrl, { cache: "no-store" });
      const data = await res.json();
      
      // If server returns blogs, we filter them locally for trash, or server could do it.
      // Since our API currently doesn't filter isTrashed (we just added it), we will filter locally.
      const allBlogs = Array.isArray(data) ? data : [];
      setBlogs(allBlogs);
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

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

  const publishedCount = blogs.filter(
    (b) => !b.isTrashed && b.status === "published",
  ).length;
  const draftCount = blogs.filter(
    (b) => !b.isTrashed && b.status === "draft",
  ).length;

  return (
    <>
      <header className="sticky top-0 z-30 bg-background flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Blogs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        
        {/* Page Title & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Blog Posts
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and organize your blog content ({blogs.length} total)
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
              </span>
            </div>
            <Link href="/blogs/create">
              <Button className="h-8 rounded-sm px-3 flex items-center gap-2 text-xs">
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-background border border-border"
              }`}
            >
              All ({blogs.filter(b => !b.isTrashed).length})
            </button>
            <button
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                statusFilter === "published"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-background border border-border"
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                statusFilter === "draft"
                  ? "bg-muted text-muted-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground bg-background border border-border"
              }`}
            >
              Drafts ({draftCount})
            </button>
            <button
              onClick={() => setStatusFilter("trash")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                statusFilter === "trash"
                  ? "bg-red-100 text-red-700 border-red-200 shadow-sm"
                  : "text-muted-foreground hover:text-red-500 bg-background border border-border"
              }`}
            >
              Trash ({blogs.filter(b => b.isTrashed).length})
            </button>
          </div>
        </div>

        {/* Blogs Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-black text-sm bg-card border border-border rounded-2xl">
            Fetching blogs from database...
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
          <DataTable columns={getBlogsColumns(() => fetchBlogs(true))} data={filteredBlogs} />
        )}
      </div>
    </>
  );
}
