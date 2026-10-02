"use client";

import { useState, useMemo } from "react";
import { 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Link2,
} from "lucide-react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  ContentMetricCards,
  MetricCardItem,
} from "@/components/admin/ContentMetricCards";
import {
  ContentFilterBar,
  ContentFilterTab,
} from "@/components/admin/ContentFilterBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminTopBar } from "@/components/AdminTopBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrashConfirmationModal } from "@/components/ui/trash-confirmation-modal";
import { useTrashManager } from "@/hooks/useTrashManager";
import {
  getRedirectionColumns,
  RedirectionItem,
} from "./redirection-columns";

export default function RedirectionsPage() {
  const { data: redirectionsData, isLoading: loading, mutate } = useSWR("/api/redirection?status=all");
  const redirections = useMemo<RedirectionItem[]>(() => redirectionsData || [], [redirectionsData]);
  
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive" | "trashed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [statusCode, setStatusCode] = useState<number>(301);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Trash Manager Hook for confirmations
  const { modal: trashModal, loading: trashLoading, openTrashModal, closeModal: closeTrashModal, handleConfirm: handleTrashConfirm } = useTrashManager<RedirectionItem>({
    itemType: "Redirection Rule",
    onSuccess: () => mutate(),
  });

  // Additional Confirmation State for Non-Trash Status Toggles
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    isOpen: boolean;
    item: RedirectionItem | null;
    nextStatus: "active" | "inactive" | null;
    loading: boolean;
  }>({
    isOpen: false,
    item: null,
    nextStatus: null,
    loading: false,
  });

  // Stats
  const stats = useMemo(() => {
    const total = redirections.length;
    const active = redirections.filter((r) => r.status === "active").length;
    const inactive = redirections.filter((r) => r.status === "inactive").length;
    const trashed = redirections.filter((r) => r.status === "trashed").length;
    return { total, active, inactive, trashed };
  }, [redirections]);

  // Metric Cards
  const metricCards = useMemo<MetricCardItem[]>(
    () => [
      {
        id: "all",
        label: "Total Redirects",
        count: stats.total - stats.trashed,
        icon: Link2,
        color: "primary",
        isActive: activeTab === "all",
        onClick: () => setActiveTab("all"),
      },
      {
        id: "active",
        label: "Active",
        count: stats.active,
        icon: CheckCircle2,
        color: "emerald",
        isActive: activeTab === "active",
        onClick: () => setActiveTab("active"),
      },
      {
        id: "inactive",
        label: "Inactive",
        count: stats.inactive,
        icon: AlertCircle,
        color: "amber",
        isActive: activeTab === "inactive",
        onClick: () => setActiveTab("inactive"),
      },
      {
        id: "trashed",
        label: "Trashed",
        count: stats.trashed,
        icon: Trash2,
        color: "red",
        isActive: activeTab === "trashed",
        onClick: () => setActiveTab("trashed"),
      },
    ],
    [stats, activeTab]
  );

  // Filter Tabs
  const filterTabs = useMemo<ContentFilterTab[]>(
    () => [
      { id: "all", label: "All", count: stats.total - stats.trashed, color: "primary" },
      { id: "active", label: "Active", count: stats.active, color: "emerald" },
      { id: "inactive", label: "Inactive", count: stats.inactive, color: "amber" },
      { id: "trashed", label: "Trash", count: stats.trashed, color: "red" },
    ],
    [stats]
  );

  // Filtered List
  const filteredList = useMemo(() => {
    return redirections.filter((item) => {
      const matchesTab =
        activeTab === "all" ? item.status !== "trashed" : item.status === activeTab;
      const matchesSearch =
        item.sourceUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [redirections, activeTab, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setSourceUrl("");
    setDestinationUrl("");
    setStatusCode(301);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: RedirectionItem) => {
    setEditingId(item.id);
    setSourceUrl(item.sourceUrl);
    setDestinationUrl(item.destinationUrl);
    setStatusCode(item.statusCode);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Handler for Create/Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!sourceUrl.trim() || !destinationUrl.trim()) {
      setFormError("Both Source URL and Destination URL are required.");
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        // Edit mode
        const res = await fetch(`/api/redirection/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationUrl: destinationUrl.trim(),
            statusCode,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update redirect");

        toast.add({ title: "Redirect updated successfully", type: "success" });
        mutate();
        setIsModalOpen(false);
      } else {
        // Create mode
        const res = await fetch("/api/redirection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUrl: sourceUrl.trim(),
            destinationUrl: destinationUrl.trim(),
            statusCode,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create redirect");

        toast.add({ title: "Redirection created successfully", type: "success" });
        mutate();
        setIsModalOpen(false);
      }
    } catch (error: unknown) {
      setFormError((error as Error).message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusConfirmModal = (item: RedirectionItem) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    setStatusConfirmModal({
      isOpen: true,
      item,
      nextStatus,
      loading: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    const { item, nextStatus } = statusConfirmModal;
    if (!item || !nextStatus) return;

    try {
      setStatusConfirmModal((prev) => ({ ...prev, loading: true }));
      const res = await fetch(`/api/redirection/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        toast.add({ title: `Status changed to ${statusConfirmModal.nextStatus}`, type: "success" });
        mutate();
      } else {
        throw new Error("Failed to update status");
      }
    } catch {
      toast.add({ title: "Failed to update status", type: "error" });
    } finally {
      setStatusConfirmModal({ isOpen: false, item: null, nextStatus: null, loading: false });
    }
  };

  // Execute Trash Confirmation Actions via useTrashManager
  const executeTrashAction = () => {
    handleTrashConfirm(async (type, item, id) => {
      if (type === "trash") {
        const res = await fetch(`/api/redirection/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "trashed" }),
        });
        if (!res.ok) throw new Error("Failed to move to trash");
      } else if (type === "restore") {
        const res = await fetch(`/api/redirection/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
        if (!res.ok) throw new Error("Failed to restore redirect");
      } else if (type === "delete") {
        const res = await fetch(`/api/redirection/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete redirect");
      }
    });
  };

  // TanStack Columns
  const columns = useMemo(
    () =>
      getRedirectionColumns({
        onEdit: handleOpenEdit,
        onToggleStatus: openStatusConfirmModal,
        onTrash: (item) => openTrashModal("trash", item, item.id, item.sourceUrl),
        onRestore: (item) => openTrashModal("restore", item, item.id, item.sourceUrl),
        onDelete: (item) => openTrashModal("delete", item, item.id, item.sourceUrl),
      }),
    [openTrashModal]
  );

  return (
    <div className="w-full flex-1 flex flex-col min-h-screen bg-background">
      {/* Top Header Bar */}
      <AdminTopBar breadcrumbs="Redirections" />

      {/* Main Content Area */}
      <div className="py-6 lg:py-8 px-3.75 md:px-5 lg:px-7.5 space-y-6 w-full flex-1">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-sm bg-black text-white dark:bg-white dark:text-black shadow-xs">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  URL Redirections
                </h1>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Manage 301 & 302 page routing rules with automatic loop prevention.
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="h-10 px-5 text-xs font-extrabold cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Redirect
          </Button>
        </div>

        {/* 4 Status Metric Filter Cards */}
        <ContentMetricCards cards={metricCards} loading={loading} />

        {/* Global Filter & Search Bar */}
        <ContentFilterBar
          tabs={filterTabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search source or destination..."
        />

        {/* Redirections Data Table / Responsive Cards */}
        {loading ? (
          <div className="rounded-md border bg-card p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-border/40 text-muted flex items-center justify-center mx-auto mb-3">
              <ArrowRightLeft className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
            </div>
            <div className="text-foreground font-semibold text-base mb-1">
              No matching redirections found
            </div>
            <p className="text-muted-foreground text-xs max-w-sm mx-auto">
              {searchQuery || activeTab !== "all"
                ? "Try adjusting your search terms or filters."
                : "No redirection rules exist in the database."}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredList}
          />
        )}
      </div>

      {/* Create / Edit Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl p-6 rounded-sm shadow-xl border border-border">
          <DialogHeader className="space-y-1.5 pb-2 border-b border-border">
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              {editingId ? "Edit Redirection Rule" : "Create New Redirection Rule"}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground leading-relaxed">
              Configure path redirection with automatic 1-to-1 loop guardrails and instant routing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-3">
            {formError && (
              <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs font-semibold leading-relaxed shadow-2xs">
                {formError}
              </div>
            )}

            {/* Source URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-foreground">
                Source URL Path
              </label>
              <input
                type="text"
                disabled={!!editingId}
                placeholder="e.g. /old-path"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-card border border-border rounded-sm focus:outline-none focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              />
              <p className="text-[11px] text-muted-foreground font-medium">
                The incoming URL path to intercept (e.g. <code>/old-marketing</code> or <code>/services/seo</code>).
              </p>
            </div>

            {/* Destination URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-foreground">
                Destination URL
              </label>
              <input
                type="text"
                placeholder="e.g. /new-path or https://external.com"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-card border border-border rounded-sm focus:outline-none focus:border-accent transition-all"
              />
              <p className="text-[11px] text-muted-foreground font-medium">
                Target internal path or external URL destination.
              </p>
            </div>

            {/* HTTP Status Code Select Component */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-foreground">
                Redirect HTTP Status
              </label>
              <Select
                value={String(statusCode)}
                onValueChange={(val) => setStatusCode(Number(val))}
              >
                <SelectTrigger className="w-full px-3.5 py-2 text-xs font-bold bg-card border border-border rounded-sm focus:outline-none focus:border-accent cursor-pointer">
                  <SelectValue placeholder="Select HTTP status" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} sideOffset={4} className="bg-popover border border-border rounded-sm shadow-md">
                  <SelectItem value="301" className="text-xs font-semibold cursor-pointer">
                    301 - Permanent Redirect (SEO Link Equity Transferred)
                  </SelectItem>
                  <SelectItem value="302" className="text-xs font-semibold cursor-pointer">
                    302 - Temporary Redirect (No Cache Permanent)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold border border-border hover:bg-muted rounded-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-extrabold bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 rounded-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Create Redirect"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Trash / Delete Confirmation Modal via TrashConfirmationModal Hook */}
      <TrashConfirmationModal
        open={trashModal.isOpen}
        onOpenChange={(open) => {
          if (!open) closeTrashModal();
        }}
        type={trashModal.type}
        itemName={trashModal.targetName}
        itemType="Redirection Rule"
        onConfirm={executeTrashAction}
        loading={trashLoading}
      />

      {/* Non-Trash Status Toggle Confirmation Modal */}
      <TrashConfirmationModal
        open={statusConfirmModal.isOpen}
        onOpenChange={(open) => {
          if (!open) setStatusConfirmModal({ isOpen: false, item: null, nextStatus: null, loading: false });
        }}
        type="approve"
        customTitle={`Mark Redirect as ${statusConfirmModal.nextStatus === "active" ? "Active" : "Inactive"}?`}
        customDescription={`Are you sure you want to change status of redirect "${statusConfirmModal.item?.sourceUrl}" to ${statusConfirmModal.nextStatus}?`}
        customConfirmText={`Mark as ${statusConfirmModal.nextStatus === "active" ? "Active" : "Inactive"}`}
        customActionClass={
          statusConfirmModal.nextStatus === "active"
            ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            : "bg-amber-600 hover:bg-amber-700 text-white font-bold"
        }
        onConfirm={handleConfirmStatusChange}
        loading={statusConfirmModal.loading}
      />
    </div>
  );
}
