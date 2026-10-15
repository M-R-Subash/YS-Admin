"use client";

import { useState, useMemo, useDeferredValue, useCallback } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "@/components/ui/toast";
import { MetricCardItem } from "@/components/table/ContentMetricCards";
import { ContentFilterTab } from "@/components/table/ContentFilterBar";
import {
  FileEdit,
  CheckCircle2,
  Trash2,
  Clock,
  Layers,
  LucideIcon,
  AlertCircle,
} from "lucide-react";

export type StandardContentStatus = "all" | "published" | "scheduled" | "draft" | "trash" | string;

export interface UseContentTableOptions<T> {
  data: T[] | undefined | null;
  entityName: string; // e.g. "blogs", "webpages", "redirects"
  bulkActionEndpoint?: string; // e.g. "/api/blogs/bulk-action"
  searchFields?: (keyof T | string)[];
  initialStatusFilter?: StandardContentStatus;
  customFilter?: (item: T) => boolean;
  totalIcon?: LucideIcon;
  includeScheduled?: boolean;
  statusLabels?: {
    published?: string; // e.g. "Active"
    draft?: string; // e.g. "Inactive"
    scheduled?: string;
    trash?: string; // e.g. "Trash" or "Trashed"
  };
  mutate?: () => Promise<any> | void;
}

export function useContentTable<T extends { id?: string; status?: string; isTrashed?: boolean; [key: string]: any }>({
  data,
  entityName,
  bulkActionEndpoint,
  searchFields = ["title", "slug"],
  initialStatusFilter = "all",
  customFilter,
  totalIcon = Layers,
  includeScheduled,
  statusLabels,
  mutate,
}: UseContentTableOptions<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<StandardContentStatus>(initialStatusFilter);

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Status IDs and Labels
  const publishedLabel = statusLabels?.published || "Published";
  const publishedId = publishedLabel === "Active" ? "active" : "published";

  const draftLabel = statusLabels?.draft || "Drafted";
  const draftId = draftLabel === "Inactive" ? "inactive" : "draft";

  const trashLabel = statusLabels?.trash || "Trashed";
  const trashId = statusLabels?.trash === "Trashed" ? "trashed" : "trash";

  // Determine if we should show scheduled count/card
  const hasScheduled = useMemo(() => {
    if (includeScheduled !== undefined) return includeScheduled;
    return items.some((item) => item.status === "scheduled");
  }, [items, includeScheduled]);

  // Compute counts in a single pass
  const counts = useMemo(() => {
    let total = 0;
    let published = 0;
    let scheduled = 0;
    let draft = 0;
    let trashed = 0;

    for (const item of items) {
      const isItemTrashed = item.isTrashed === true || item.status === "trashed";
      if (isItemTrashed) {
        trashed++;
      } else {
        total++;
        const s = item.status?.toLowerCase();
        if (s === "published" || s === "active") published++;
        else if (s === "scheduled") scheduled++;
        else if (s === "draft" || s === "inactive") draft++;
      }
    }

    return {
      total,
      published,
      scheduled,
      draft,
      trashed,
    };
  }, [items]);

  // Filter items based on search, status, and custom filter
  const filteredData = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();

    return items.filter((item) => {
      // 1. Search Query Matching
      if (query && searchFields.length > 0) {
        const matchesSearch = searchFields.some((field) => {
          const val = item[field as string];
          if (typeof val === "string") {
            return val.toLowerCase().includes(query);
          }
          return false;
        });
        if (!matchesSearch) return false;
      }

      // 2. Custom Filter Matching (e.g. Category, Date, etc.)
      if (customFilter && !customFilter(item)) {
        return false;
      }

      // 3. Trash and Status Matching
      const isItemTrashed = item.isTrashed === true || item.status === "trashed";
      if (statusFilter === "trash" || statusFilter === "trashed") {
        return isItemTrashed;
      }

      if (isItemTrashed) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      const s = item.status?.toLowerCase();
      if (statusFilter === "active" && s === "active") return true;
      if (statusFilter === "inactive" && s === "inactive") return true;

      return s === statusFilter.toLowerCase();
    });
  }, [items, deferredSearch, searchFields, customFilter, statusFilter]);

  // Automatically generated Metric Cards
  const metricCards = useMemo<MetricCardItem[]>(() => {
    const cards: MetricCardItem[] = [
      {
        id: "all",
        label: `Total ${entityName.charAt(0).toUpperCase() + entityName.slice(1)}`,
        count: counts.total,
        icon: totalIcon,
        color: "primary",
        isActive: statusFilter === "all",
        onClick: () => setStatusFilter("all"),
      },
      {
        id: publishedId,
        label: publishedLabel,
        count: counts.published,
        icon: CheckCircle2,
        color: "emerald",
        isActive: statusFilter === publishedId,
        onClick: () => setStatusFilter(publishedId),
      },
    ];

    if (hasScheduled) {
      cards.push({
        id: "scheduled",
        label: statusLabels?.scheduled || "Scheduled",
        count: counts.scheduled,
        icon: Clock,
        color: "purple",
        isActive: statusFilter === "scheduled",
        onClick: () => setStatusFilter("scheduled"),
      });
    }

    cards.push(
      {
        id: draftId,
        label: draftLabel,
        count: counts.draft,
        icon: draftLabel === "Inactive" ? AlertCircle : FileEdit,
        color: "amber",
        isActive: statusFilter === draftId,
        onClick: () => setStatusFilter(draftId),
      },
      {
        id: trashId,
        label: trashLabel,
        count: counts.trashed,
        icon: Trash2,
        color: "red",
        isActive: statusFilter === trashId || statusFilter === "trash",
        onClick: () => setStatusFilter(trashId),
      }
    );

    return cards;
  }, [
    entityName,
    counts,
    totalIcon,
    statusFilter,
    hasScheduled,
    publishedId,
    publishedLabel,
    draftId,
    draftLabel,
    trashId,
    trashLabel,
    statusLabels?.scheduled,
  ]);

  // Automatically generated Filter Tabs
  const filterTabs = useMemo<ContentFilterTab[]>(() => {
    const tabs: ContentFilterTab[] = [
      { id: "all", label: "All", count: counts.total, color: "primary" },
      { id: publishedId, label: publishedLabel, count: counts.published, color: "emerald" },
    ];

    if (hasScheduled) {
      tabs.push({
        id: "scheduled",
        label: statusLabels?.scheduled || "Scheduled",
        count: counts.scheduled,
        color: "purple",
      });
    }

    tabs.push(
      { id: draftId, label: draftLabel === "Drafted" ? "Drafts" : draftLabel, count: counts.draft, color: "amber" },
      { id: trashId, label: "Trash", count: counts.trashed, color: "red" }
    );

    return tabs;
  }, [counts, hasScheduled, publishedId, publishedLabel, draftId, draftLabel, trashId, statusLabels?.scheduled]);

  // Reusable bulk action handler
  const handleBulkAction = useCallback(
    async (action: string, ids: string[]) => {
      if (!bulkActionEndpoint) return;

      try {
        const res = await fetch(bulkActionEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ids,
            status:
              action === "publish" || action === "activate"
                ? (statusLabels?.published === "Active" ? "active" : "published")
                : action === "draft" || action === "deactivate"
                ? (statusLabels?.draft === "Inactive" ? "inactive" : "draft")
                : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || "Bulk action failed");
        }

        toast.add({
          title: "Bulk Action Applied",
          description: `Successfully applied "${action}" to ${ids.length} ${entityName}.`,
          type: "success",
        });

        if (mutate) {
          await mutate();
        }
        globalMutate("/api/dashboard/stats");
        globalMutate("/api/badges");
      } catch (err: any) {
        toast.add({
          title: "Action Failed",
          description: err.message,
          type: "error",
        });
      }
    },
    [bulkActionEndpoint, entityName, mutate, statusLabels]
  );

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isTrashedView: statusFilter === "trash" || statusFilter === "trashed",
    filteredData,
    counts,
    metricCards,
    filterTabs,
    handleBulkAction,
  };
}
