"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Menu, FileText } from "lucide-react";
import { Page } from "@/types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { DataTable } from "@/components/ui/data-table";
import { getWebpagesColumns } from "./webpages-columns";

export default function WebpagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft" | "trash"
  >("all");
  const router = useRouter();

  useEffect(() => {
    fetchPages();
  }, [statusFilter]);

  async function fetchPages(silent = false) {
    try {
      if (!silent) setLoading(true);
      const url =
        statusFilter === "trash" ? "/api/pages?status=trash" : "/api/pages";
      // Ensure we get fresh data by busting cache
      const fetchUrl = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const res = await fetch(fetchUrl, { cache: "no-store" });
      const data = await res.json();
      setPages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch pages:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Filter pages based on search and status
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      statusFilter === "trash" ||
      page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const publishedCount = pages.filter(
    (p) => !p.isTrashed && p.status === "published",
  ).length;
  const draftCount = pages.filter(
    (p) => !p.isTrashed && p.status === "draft",
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
                <BreadcrumbPage>Webpages</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Global Header & Footer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Header Card */}
          <div className="bg-card border border-border p-5 rounded-sm flex items-center justify-between shadow-sm hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-muted border border-border flex items-center justify-center text-foreground">
                <Menu className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Header
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Navigation links & CTA button
                </p>
              </div>
            </div>
            <Link
              href="/header"
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm shadow transition-all hover:scale-[1.02]"
            >
              Edit Header
            </Link>
          </div>

          {/* Footer Card */}
          <div className="bg-card border border-border p-5 rounded-sm flex items-center justify-between shadow-sm hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-muted border border-border flex items-center justify-center text-foreground">
                <Menu className="w-5 h-5 rotate-180" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Footer
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CTA banner, links & contact info
                </p>
              </div>
            </div>
            <Link
              href="/footer"
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm shadow transition-all hover:scale-[1.02]"
            >
              Edit Footer
            </Link>
          </div>
        </div>
        {/* Page Title & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Main Site Webpages
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              All website pages stored in your database ({pages.length} total)
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
              All ({pages.length})
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
              Trash
            </button>
          </div>
        </div>

        {/* Webpages Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-black text-sm bg-card border border-border rounded-2xl">
            Fetching webpages from database...
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-border/40 text-muted flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
            </div>
            <div className="text-black font-semibold text-base mb-1">
              No matching webpages found
            </div>
            <p className="text-black text-xs max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search terms or filters."
                : "No webpages exist in the database."}
            </p>
          </div>
        ) : (
          <DataTable columns={getWebpagesColumns(() => fetchPages(true))} data={filteredPages} />
        )}
      </div>
    </>
  );
}
