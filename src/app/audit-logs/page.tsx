"use client";

import React, { useState, useMemo, useCallback, useDeferredValue } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Clock,
  Lock,
  Layers,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ExportColumnsModal } from "@/components/spreadsheet/ExportColumnsModal";

import type {
  AuditLogItem,
  AuditLogsResponse,
} from "./types";
import {
  AUDIT_EXPORT_COLUMNS,
} from "./types";
import {
  getTransitionInfo,
  getSimpleExplanation,
  getItemCleanName,
} from "./utils/audit-helpers";
import { AuditLogRow } from "./components/AuditLogRow";
import { AuditLogMobileCard } from "./components/AuditLogMobileCard";
import { AuditLogInspector } from "./components/AuditLogInspector";
import { AuditLogFilterBar } from "./components/AuditLogFilterBar";

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Search input state: instant local state for 60fps typing, deferred for non-blocking local filtering, debounced for server API
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [page, setPage] = useState(1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedActor, setSelectedActor] = useState<string>("ALL");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const selectedCategoryParam =
    selectedCategories.size === 1 ? Array.from(selectedCategories)[0] : null;

  // Live PostgreSQL Audit Log query via SWR with debounced search, category filter, and pagination
  const apiUrl = isAdmin
    ? `/api/audit-logs?limit=${pageSize}&offset=${offset}${
        debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""
      }${selectedCategoryParam ? `&category=${encodeURIComponent(selectedCategoryParam)}` : ""}`
    : null;

  // Dedicated uncached fetcher for real-time audit logs
  const auditFetcher = useCallback(async (url: string) => {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch audit logs");
    }
    return res.json();
  }, []);

  const { data, mutate, isLoading, isValidating } = useSWR<AuditLogsResponse>(
    apiUrl,
    auditFetcher,
    {
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      refreshInterval: 0,
    }
  );


  const rawLogs = useMemo(() => data?.logs || [], [data?.logs]);
  const totalItems = data?.pagination?.total ?? data?.total ?? rawLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const stats = data?.stats || {
    totalEvents: rawLogs.length,
    blogEvents: 0,
    pageEvents: 0,
    mediaEvents: 0,
    redirectEvents: 0,
    taxonomyEvents: 0,
    newsletterEvents: 0,
    otherEvents: 0,
    retentionDays: 90,
  };

  // Distinct actors for quick filter
  const uniqueActors = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of rawLogs) {
      if (l.actor?.email) {
        map.set(l.actor.email, l.actor.name || l.actor.email);
      }
    }
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [rawLogs]);

  // Client-side multi-filtering with deferredSearch for instant, non-blocking response
  const filteredLogs = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();

    return rawLogs.filter((item) => {
      // 1. Instant local search matching across all pertinent item properties
      if (query) {
        const itemInfo = getItemCleanName(item);
        const explanation = getSimpleExplanation(item);
        const matches =
          itemInfo.name.toLowerCase().includes(query) ||
          Boolean(itemInfo.slug && itemInfo.slug.toLowerCase().includes(query)) ||
          explanation.toLowerCase().includes(query) ||
          Boolean(item.actor?.name && item.actor.name.toLowerCase().includes(query)) ||
          Boolean(item.actor?.email && item.actor.email.toLowerCase().includes(query)) ||
          item.target.toLowerCase().includes(query) ||
          item.eventType.toLowerCase().includes(query);
        if (!matches) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategories.size > 0 && !selectedCategories.has(item.category)) {
        return false;
      }

      // 3. Actor filter
      if (selectedActor !== "ALL" && item.actor?.email !== selectedActor) {
        return false;
      }

      // 4. State transition filter
      if (selectedActionFilter !== "ALL") {
        const trans = getTransitionInfo(item);
        if (selectedActionFilter === "published") {
          return trans.to.toLowerCase() === "published" || trans.to.toLowerCase() === "active";
        }
        if (selectedActionFilter === "draft") {
          return trans.to.toLowerCase() === "draft" || trans.to.toLowerCase() === "inactive";
        }
        if (selectedActionFilter === "trashed") {
          return trans.to.toLowerCase() === "trash" || trans.to.toLowerCase() === "trashed";
        }
        if (selectedActionFilter === "deleted") {
          return trans.to.toLowerCase() === "deleted";
        }
        if (selectedActionFilter === "updated") {
          return trans.type === "update" || trans.type === "seo";
        }
      }
      return true;
    });
  }, [rawLogs, selectedCategories, selectedActor, selectedActionFilter, deferredSearch]);

  // Prepare data for ExportColumnsModal — lazy evaluated only when export modal is actually open
  const exportPreparedData = useMemo(() => {
    if (!isExportModalOpen) return [];
    return filteredLogs.map((item) => {
      const trans = getTransitionInfo(item);
      const explanation = getSimpleExplanation(item);
      const itemInfo = getItemCleanName(item);
      return {
        id: item.id,
        timestamp: format(new Date(item.timestamp), "yyyy-MM-dd HH:mm:ss"),
        category: item.category,
        eventType: item.eventType,
        itemName: itemInfo.name,
        itemType: itemInfo.type,
        itemSlug: itemInfo.slug ? `/${itemInfo.slug.replace(/^\//, "")}` : "",
        transition:
          trans.pillText ||
          (trans.from.toLowerCase() !== trans.to.toLowerCase()
            ? `${trans.from} ➔ ${trans.to}`
            : "Content Updated"),
        explanation,
        actorName: item.actor?.name || "System",
        actorEmail: item.actor?.email || "system@internal",
        actorRole: item.actor?.role || "SYSTEM",
        status: item.status,
      };
    });
  }, [filteredLogs, isExportModalOpen]);

  // Group logs chronologically by Day
  const groupedLogs = useMemo(() => {
    const groups: {
      [key: string]: {
        label: string;
        date: Date;
        items: AuditLogItem[];
      };
    } = {};

    for (const item of filteredLogs) {
      const d = new Date(item.timestamp);
      const key = format(d, "yyyy-MM-dd");
      if (!groups[key]) {
        let label = format(d, "EEEE, MMMM d, yyyy");
        if (isToday(d)) {
          label = `Today — ${format(d, "MMMM d, yyyy")}`;
        } else if (isYesterday(d)) {
          label = `Yesterday — ${format(d, "MMMM d, yyyy")}`;
        }
        groups[key] = { label, date: d, items: [] };
      }
      groups[key].items.push(item);
    }

    return Object.values(groups).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [filteredLogs]);

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const handleSelectLog = useCallback((item: AuditLogItem) => {
    setSelectedLog(item);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleCategoriesChange = useCallback((next: Set<string>) => {
    setSelectedCategories(next);
    setPage(1);
  }, []);

  const handleActionFilterChange = useCallback((val: string) => {
    setSelectedActionFilter(val);
    setPage(1);
  }, []);

  const handleActorChange = useCallback((val: string) => {
    setSelectedActor(val);
    setPage(1);
  }, []);

  return (
    <div className="w-full min-h-screen bg-background p-3 sm:p-5 flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 sm:p-3.5 bg-card border border-border rounded-xl shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* Back Button to Dashboard */}
            <Link href="/" className="shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer rounded-lg border-border hover:bg-muted shrink-0"
                title="Return to Dashboard"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </Button>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 hidden xs:flex">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground truncate">
                  Activity & Change Log
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Live PostgreSQL Stream</span>
                  <span className="sm:hidden">Live</span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block truncate">
                Authoritative audit record of all site modifications: status transitions, draft vs published, trash, and content edits
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Export Modal Trigger */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isValidating}
            className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 cursor-pointer border-border flex-1 sm:flex-initial justify-center"
          >
            <RefreshCw
              className={`size-3.5 text-purple-600 ${
                isValidating ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            disabled={filteredLogs.length === 0}
            className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 cursor-pointer border-border flex-1 sm:flex-initial justify-center"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Export Data</span>
          </Button>
        </div>
      </div>

      {/* Admin Access Restriction Check */}
      {!isAdmin ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex items-start gap-4">
          <Lock className="size-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              Administrator Permission Required
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Site-wide change logs and administrative audit traces are accessible only to accounts with the <strong className="text-foreground">ADMIN</strong> role.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Unified Filter Toolbar */}
          <AuditLogFilterBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            selectedCategories={selectedCategories}
            onCategoriesChange={handleCategoriesChange}
            selectedActionFilter={selectedActionFilter}
            onActionFilterChange={handleActionFilterChange}
            selectedActor={selectedActor}
            onActorChange={handleActorChange}
            uniqueActors={uniqueActors}
          />

          {/* Audit Logs Content: Mobile Card Feed (< md) & Desktop Table (md:block) */}
          <div className="flex-1 rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            {isLoading && rawLogs.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground space-y-2">
                <Loader2 className="size-6 mx-auto animate-spin text-primary" />
                <p className="text-xs font-medium">Fetching verified audit log stream from PostgreSQL...</p>
              </div>
            ) : groupedLogs.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground space-y-2">
                <Layers className="size-8 mx-auto opacity-40 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">No matching audit events recorded</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Publishing, modifying, or deleting pages, blogs, redirects, or settings will automatically stream here.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile View (< md): Clean Touch-friendly Activity Cards grouped by Date */}
                <div className="flex md:hidden flex-col gap-3 p-3 flex-1 overflow-y-auto">
                  {groupedLogs.map((group) => (
                    <div key={group.label} className="flex flex-col gap-2">
                      {/* Date Group Header */}
                      <div className="flex items-center justify-between px-1 py-1 text-muted-foreground">
                        <span className="font-bold text-foreground text-xs tracking-wide flex items-center gap-1.5">
                          <Clock className="size-3 text-primary" />
                          {group.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border-border text-muted-foreground"
                        >
                          {group.items.length} event{group.items.length > 1 ? "s" : ""}
                        </Badge>
                      </div>

                      {/* Event Cards */}
                      {group.items.map((item) => (
                        <AuditLogMobileCard
                          key={item.id}
                          item={item}
                          onSelect={handleSelectLog}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Desktop View (md:block): Standard 5-column Table */}
                <div className="hidden md:block overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[18%]" />
                      <col className="w-[26%]" />
                      <col className="w-[16%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider font-bold text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                        <th className="py-3 px-4">Affected Item</th>
                        <th className="py-3 px-4">What Changed</th>
                        <th className="py-3 px-4">Activity Summary</th>
                        <th className="py-3 px-4">Changed By</th>
                        <th className="py-3 px-4 text-right">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {groupedLogs.map((group) => (
                        <React.Fragment key={group.label}>
                          {/* Date Group Header Row */}
                          <tr className="bg-muted/30 border-y border-border/60">
                            <td colSpan={5} className="py-2 px-4">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground text-[11px] tracking-wide flex items-center gap-1.5">
                                  <Clock className="size-3 text-primary" />
                                  {group.label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border-border text-muted-foreground"
                                >
                                  {group.items.length} event{group.items.length > 1 ? "s" : ""}
                                </Badge>
                              </div>
                            </td>
                          </tr>

                          {/* Event Rows */}
                          {group.items.map((item) => (
                            <AuditLogRow
                              key={item.id}
                              item={item}
                              onSelect={handleSelectLog}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Table Footer with Pagination Controls */}
            <div className="py-2.5 px-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-foreground">{filteredLogs.length}</strong> of{" "}
                  <strong className="text-foreground">{totalItems}</strong> matching events
                  {stats.totalEvents > totalItems && (
                    <span className="text-muted-foreground/80"> ({stats.totalEvents} total in history)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium mr-1 text-muted-foreground">
                  Page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer border-border"
                >
                  <ChevronLeft className="size-3" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer border-border"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Slide-Out Inspector Drawer (Sheet) — Non-Coder Friendly Detail View */}
      <Sheet open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent
          side="right"
          className="w-full data-[side=right]:w-full sm:data-[side=right]:max-w-md md:data-[side=right]:max-w-lg p-0 flex flex-col bg-background border-l border-border"
        >
          <AuditLogInspector log={selectedLog} onClose={() => setSelectedLog(null)} />
        </SheetContent>
      </Sheet>

      {/* Export Columns Selection Modal (CSV / JSON with confirmation) */}
      <ExportColumnsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entityName="Audit Logs"
        columns={AUDIT_EXPORT_COLUMNS}
        data={exportPreparedData}
      />
    </div>
  );
}
