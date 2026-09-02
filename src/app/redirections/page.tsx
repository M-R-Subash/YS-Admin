"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  ArrowRightLeft, 
  Plus, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MoreVertical,
  Link2,
  Search,
  Filter,
  Check,
  Copy
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrashConfirmationModal } from "@/components/ui/trash-confirmation-modal";
import { useTrashManager } from "@/hooks/useTrashManager";

interface RedirectionItem {
  id: string;
  sourceUrl: string;
  destinationUrl: string;
  statusCode: number;
  status: "active" | "inactive" | "trashed";
  createdAt: string;
  updatedAt: string;
}

export default function RedirectionsPage() {
  const [redirections, setRedirections] = useState<RedirectionItem[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Trash Manager Hook for confirmations
  const { modal: trashModal, loading: trashLoading, openTrashModal, closeModal: closeTrashModal, handleConfirm: handleTrashConfirm } = useTrashManager<RedirectionItem>({
    itemType: "Redirection Rule",
    onSuccess: () => fetchRedirections(),
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

  // Fetch redirections
  const fetchRedirections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/redirection?status=all");
      if (res.ok) {
        const data = await res.json();
        setRedirections(data);
      } else {
        toast.add({ title: "Failed to load redirections", type: "error" });
      }
    } catch (error) {
      console.error(error);
      toast.add({ title: "Error connecting to server", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedirections();
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = redirections.length;
    const active = redirections.filter((r) => r.status === "active").length;
    const inactive = redirections.filter((r) => r.status === "inactive").length;
    const trashed = redirections.filter((r) => r.status === "trashed").length;
    return { total, active, inactive, trashed };
  }, [redirections]);

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

        toast.add({ title: "Redirect created successfully", type: "success" });
      }

      setIsModalOpen(false);
      fetchRedirections();
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Status Toggle Confirmation Modal
  const openStatusConfirmModal = (item: RedirectionItem) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    setStatusConfirmModal({
      isOpen: true,
      item,
      nextStatus,
      loading: false,
    });
  };

  // Confirm Status Change Execution
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
        toast.add({
          title: `Redirect marked as ${nextStatus}`,
          type: "success",
        });
        fetchRedirections();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.add({ title: "URL copied to clipboard", type: "success" });
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-screen bg-background">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-background flex h-16 shrink-0 items-center justify-between px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Redirections</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <a
          href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}?nocache=${Date.now()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[11px] font-semibold text-black hover:text-black/80 bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-sm transition-all border border-black/10 shadow-2xs cursor-pointer"
        >
          <span>View Site</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      {/* Main Content Area - Full Width */}
      <div className="p-6 lg:p-8 space-y-6 w-full flex-1">
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
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-extrabold bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 rounded-sm shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Redirect
          </button>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Card */}
          <div className="p-4 rounded-sm bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Redirects
              </span>
              <Link2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-black tracking-tight text-foreground">
              {stats.total}
            </div>
          </div>

          {/* Active Card */}
          <div className="p-4 rounded-sm bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Active
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </div>
          </div>

          {/* Inactive Card */}
          <div className="p-4 rounded-sm bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Inactive
              </span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {stats.inactive}
            </div>
          </div>

          {/* Trashed Card */}
          <div className="p-4 rounded-sm bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Trashed
              </span>
              <Trash2 className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {stats.trashed}
            </div>
          </div>
        </div>

        {/* Filter Bar matching other CMS modules */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-1">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer border ${
                activeTab === "all"
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({stats.total - stats.trashed})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer border ${
                activeTab === "active"
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer border ${
                activeTab === "inactive"
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive ({stats.inactive})
            </button>
            <button
              onClick={() => setActiveTab("trashed")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer border ${
                activeTab === "trashed"
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Trash ({stats.trashed})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search source or destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs font-medium bg-card border border-border rounded-sm focus:outline-none focus:border-accent transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-sm border border-border bg-card overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-xs font-medium text-muted-foreground">
              Loading redirection rules...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ArrowRightLeft className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-xs font-semibold text-muted-foreground">
                No redirection rules found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 px-5">Source URL</th>
                    <th className="py-3.5 px-5">Destination URL</th>
                    <th className="py-3.5 px-4 text-center">HTTP Status</th>
                    <th className="py-3.5 px-4 text-center">State</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs font-medium">
                  {filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Source URL */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-sm">
                            {item.sourceUrl}
                          </span>
                          <button
                            onClick={() => copyToClipboard(item.sourceUrl, item.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Copy Source URL"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Destination URL */}
                      <td className="py-3.5 px-5">
                        <a
                          href={item.destinationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-muted-foreground hover:text-foreground hover:underline transition-colors max-w-xs truncate"
                        >
                          <span className="truncate">{item.destinationUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                        </a>
                      </td>

                      {/* HTTP Code Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-extrabold tracking-wide ${
                            item.statusCode === 301
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300"
                          }`}
                        >
                          {item.statusCode} {item.statusCode === 301 ? "Permanent" : "Temporary"}
                        </span>
                      </td>

                      {/* State Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-extrabold capitalize ${
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                              : item.status === "inactive"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "active"
                                ? "bg-emerald-500"
                                : item.status === "inactive"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      {/* Actions Dropdown Menu */}
                      <td className="py-3.5 px-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded-sm hover:bg-muted transition-colors text-muted-foreground cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-sm border border-border">
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-extrabold">
                              Actions
                            </DropdownMenuLabel>
                            {item.status !== "trashed" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(item)}
                                  className="text-xs font-semibold cursor-pointer rounded-xs"
                                >
                                  Edit Redirect
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openStatusConfirmModal(item)}
                                  className="text-xs font-semibold cursor-pointer rounded-xs"
                                >
                                  Mark as {item.status === "active" ? "Inactive" : "Active"}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            {item.status !== "trashed" ? (
                              <DropdownMenuItem
                                onClick={() => openTrashModal("trash", item, item.id, item.sourceUrl)}
                                className="text-xs font-semibold cursor-pointer rounded-xs text-rose-600 dark:text-rose-400"
                              >
                                Move to Trash
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => openTrashModal("restore", item, item.id, item.sourceUrl)}
                                  className="text-xs font-semibold cursor-pointer rounded-xs"
                                >
                                  Restore Redirect
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openTrashModal("delete", item, item.id, item.sourceUrl)}
                                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer rounded-xs"
                                >
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                placeholder="/old-service-page"
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
                placeholder="/digital-marketing or https://external.com"
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
                <SelectContent className="bg-popover border border-border rounded-sm shadow-md">
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


