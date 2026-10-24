"use client";

import { useMemo, useState, useDeferredValue } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import { Menu, FileText, Globe, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Page } from "@/types";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { DataTable } from "@/components/table/DataTable";
import { ContentMetricCards } from "@/components/table/ContentMetricCards";
import { ContentFilterBar } from "@/components/table/ContentFilterBar";
import { TableFloatingDock } from "@/components/table/TableFloatingDock";
import { useContentTable, StandardContentStatus } from "@/components/table/useContentTable";
import { getWebpagesColumns } from "./webpages-columns";

export default function WebpagesPage() {
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<StandardContentStatus>("all");

  // Reset page to 1 whenever filters change without cascading renders in an effect
  const [prevFilters, setPrevFilters] = useState({ statusFilter, deferredSearch });
  if (
    prevFilters.statusFilter !== statusFilter ||
    prevFilters.deferredSearch !== deferredSearch
  ) {
    setPrevFilters({ statusFilter, deferredSearch });
    setPage(1);
  }

  const pagesQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "15");
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (deferredSearch) params.set("search", deferredSearch);
    return `/api/pages?${params.toString()}`;
  }, [page, statusFilter, deferredSearch]);

  const { data: responseData, isLoading, mutate } = useSWR<any>(pagesQueryUrl);

  const pages = useMemo<Page[]>(() => {
    if (Array.isArray(responseData)) return responseData;
    return responseData?.pages || [];
  }, [responseData]);

  const {
    isTrashedView,
    metricCards,
    filterTabs,
    handleBulkAction,
  } = useContentTable({
    data: pages,
    entityName: "webpages",
    bulkActionEndpoint: "/api/bulk-action",
    totalIcon: Globe,
    serverCounts: responseData?.counts,
    manualFiltering: true,
    mutate,
  });

  const handleDataChange = useMemo(() => {
    return () => {
      mutate();
      globalMutate("/api/dashboard/stats");
    };
  }, [mutate]);

  const columns = useMemo(() => getWebpagesColumns(handleDataChange), [handleDataChange]);
  const loading = isLoading && !responseData;

  return (
    <>
      <AdminTopBar breadcrumbs="Webpages" />

      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5">
        {/* Global Header & Footer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border p-5 rounded-sm flex items-center justify-between shadow-sm hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-muted border border-border flex items-center justify-center text-foreground">
                <Menu className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">Header</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Navigation links & CTA button</p>
              </div>
            </div>
            <Link
              href="/header"
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm shadow transition-all hover:scale-[1.02]"
            >
              Edit Header
            </Link>
          </div>

          <div className="bg-card border border-border p-5 rounded-sm flex items-center justify-between shadow-sm hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-muted border border-border flex items-center justify-center text-foreground">
                <Menu className="w-5 h-5 rotate-180" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">Footer</h3>
                <p className="text-xs text-muted-foreground mt-0.5">CTA banner, links & contact info</p>
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

        {/* Global Filter & Search Bar with Action Button */}
        <ContentFilterBar
          tabs={filterTabs}
          activeTab={statusFilter}
          onTabChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by title or slug..."
          extraRightContent={
            <Button className="h-9 rounded-sm px-3 flex items-center gap-2 text-xs cursor-pointer shrink-0">
              <Plus className="w-3.5 h-3.5" /> Create Page
            </Button>
          }
        />

        {/* Webpages Table / Cards */}
        {loading ? (
          <div className="rounded-md border bg-card p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : pages.length === 0 ? (
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
            columns={columns}
            data={pages}
            pagination={{
              page,
              pageSize: 15,
              totalPages: responseData?.pagination?.totalPages || 1,
              totalCount: responseData?.pagination?.total ?? responseData?.totalCount,
              onPageChange: (newPage) => setPage(newPage),
              isLoading,
            }}
            renderBulkActionDock={(selectedRows, clearSelection) => (
              <TableFloatingDock
                selectedItems={selectedRows}
                onClearSelection={clearSelection}
                entityName="webpages"
                entityType="pages"
                bulkEditUrl="/webpages/bulk-edit"
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
