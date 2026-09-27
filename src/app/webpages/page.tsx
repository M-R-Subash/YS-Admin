"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import { Menu, FileText, Globe, CheckCircle2, FileEdit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Page } from "@/types";
import { AdminTopBar } from "@/components/AdminTopBar";
import { ContentMetricCards, MetricCardItem } from "@/components/admin/ContentMetricCards";
import { ContentFilterBar, ContentFilterTab } from "@/components/admin/ContentFilterBar";

import { DataTable } from "@/components/ui/data-table";
import { getWebpagesColumns } from "./webpages-columns";
  
export default function WebpagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft" | "trash"
  >("all");

  const { data, isLoading, mutate } = useSWR<Page[]>("/api/pages");
  const pages = Array.isArray(data) ? data : [];
  const loading = isLoading && !data;

  // Filter pages based on search, status, and isTrashed
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (statusFilter === "trash") {
      return matchesSearch && page.isTrashed === true;
    } else {
      const matchesStatus =
        statusFilter === "all" || page.status === statusFilter;
      return matchesSearch && matchesStatus && page.isTrashed !== true;
    }
  });

  const totalCount = pages.filter((p) => !p.isTrashed).length;
  const publishedCount = pages.filter(
    (p) => !p.isTrashed && p.status === "published",
  ).length;
  const draftCount = pages.filter(
    (p) => !p.isTrashed && p.status === "draft",
  ).length;
  const trashedCount = pages.filter((p) => p.isTrashed).length;

  const metricCards = useMemo<MetricCardItem[]>(() => [
    {
      id: "all",
      label: "Total Webpages",
      count: totalCount,
      icon: Globe,
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
  ], [totalCount, publishedCount, draftCount, trashedCount, statusFilter]);

  const filterTabs = useMemo<ContentFilterTab[]>(() => [
    { id: "all", label: "All", count: totalCount, color: "primary" },
    { id: "published", label: "Published", count: publishedCount, color: "emerald" },
    { id: "draft", label: "Drafts", count: draftCount, color: "amber" },
    { id: "trash", label: "Trash", count: trashedCount, color: "red" },
  ], [totalCount, publishedCount, draftCount, trashedCount]);

  return (
    <>
      <AdminTopBar breadcrumbs="Webpages" />

      <div className="flex flex-1 flex-col gap-6 py-6 px-[15px] md:px-[20px] lg:px-[30px]">
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

        {/* 4 Status Metric Filter Cards */}
        <ContentMetricCards cards={metricCards} loading={loading} />

        {/* Page Title & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Main Site Webpages
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              All website pages stored in your database ({totalCount} total)
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

        {/* Webpages Table / Cards */}
        {loading ? (
          <div className="rounded-md border bg-card p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
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
          <DataTable
            columns={getWebpagesColumns(() => {
              mutate();
              globalMutate("/api/dashboard/stats");
            })}
            data={filteredPages}
          />
        )}
      </div>
    </>
  );
}
