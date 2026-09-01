"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search,
  Bell,
  Mail,
  Phone,
  CheckCircle,
  Circle,
  Trash2,
  Globe,
  Monitor,
  Calendar,
  MessageSquare,
  Inbox,
  Tag,
  RefreshCw,
  Copy,
  Check,
  Undo2,
  AlertTriangle,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrashConfirmationModal } from "@/components/ui/trash-confirmation-modal";
import { useTrashManager } from "@/hooks/useTrashManager";

interface FormSubmission {
  id: string;
  formName: string;
  sourceUrl: string | null;
  payload: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  isRead: boolean;
  isTrashed: boolean;
  createdAt: string;
}

type ModalType = "trash" | "restore" | "delete";

interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  targetSubmission: FormSubmission | null;
}

// Reusable Copy to Clipboard Icon Button
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.add({ title: `Copied ${label} to clipboard`, type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
          />
        }
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent side="top">Copy {label}</TooltipContent>
    </Tooltip>
  );
}

export default function NotificationsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [trashedCount, setTrashedCount] = useState(0);

  const [selectedSubmission, setSelectedSubmission] =
    useState<FormSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read" | "trashed">("all");

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubmissions(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  async function fetchSubmissions(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/forms/submissions?filter=${filter}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load submissions");
      const data = await res.json();

      setSubmissions(data.submissions || []);
      setTotalCount(data.totalCount || 0);
      setUnreadCount(data.unreadCount || 0);
      setTrashedCount(data.trashedCount || 0);

      if (selectedSubmission) {
        const found = (data.submissions || []).find(
          (s: FormSubmission) => s.id === selectedSubmission.id
        );
        setSelectedSubmission(found || null);
      }
    } catch (err) {
      console.error("Error fetching form submissions:", err);
      toast.add({ title: "Failed to load notifications", type: "error" });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Handle selecting a submission & Auto Mark-as-Read
  const handleSelectSubmission = async (submission: FormSubmission) => {
    setSelectedSubmission(submission);

    if (!submission.isRead && !submission.isTrashed) {
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === submission.id ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setSelectedSubmission({ ...submission, isRead: true });

      try {
        await fetch(`/api/forms/submissions/${submission.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
      } catch (err) {
        console.error("Failed to auto mark submission as read:", err);
      }
    }
  };

  // Toggle Read / Unread manually
  const toggleReadStatus = async (submission: FormSubmission) => {
    const newStatus = !submission.isRead;

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === submission.id ? { ...item, isRead: newStatus } : item
      )
    );
    setUnreadCount((prev) => (newStatus ? Math.max(0, prev - 1) : prev + 1));
    if (selectedSubmission?.id === submission.id) {
      setSelectedSubmission({ ...selectedSubmission, isRead: newStatus });
    }

    try {
      const res = await fetch(`/api/forms/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.add({
        title: newStatus ? "Marked as read" : "Marked as unread",
        type: "success",
      });
    } catch (err) {
      toast.add({ title: "Failed to update status", type: "error" });
      fetchSubmissions(true);
    }
  };

  // Centralized Trash Manager Hook
  const { modal, loading: trashLoading, openTrashModal, closeModal, handleConfirm } =
    useTrashManager<FormSubmission>({
      itemType: "submission",
      getApiEndpoint: (id) => `/api/forms/submissions/${id}`,
      onSuccess: async () => {
        if (selectedSubmission && modal.targetId === selectedSubmission.id) {
          setSelectedSubmission(null);
        }
        await fetchSubmissions(true);
      },
    });

  // Helper to extract sender name
  const getSenderName = (payload: any) => {
    if (!payload) return "Anonymous Lead";
    if (payload.name) return payload.name;
    if (payload.firstName || payload.lastName) {
      return `${payload.firstName || ""} ${payload.lastName || ""}`.trim();
    }
    if (payload.email) return payload.email;
    return "Anonymous Lead";
  };

  // Helper to format payload keys
  const formatKeyName = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  // Check if key is Name, Email, or Phone for selective copy button display
  const isCopyableField = (key: string) => {
    const k = key.toLowerCase();
    return (
      k === "name" ||
      k === "firstname" ||
      k === "lastname" ||
      k === "email" ||
      k === "phone" ||
      k === "phonenumber" ||
      k === "mobile"
    );
  };

  // Filter submissions by search query
  const filteredSubmissions = submissions.filter((s) => {
    const sender = getSenderName(s.payload).toLowerCase();
    const form = (s.formName || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const payloadStr = JSON.stringify(s.payload).toLowerCase();

    return (
      sender.includes(query) ||
      form.includes(query) ||
      payloadStr.includes(query)
    );
  });

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-30 bg-background flex h-16 shrink-0 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-bold flex items-center gap-2 text-foreground">
                    <Bell className="w-4 h-4 text-black dark:text-white" />
                    <span>Form Submissions & Notifications</span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Counter Pills & Refresh Tooltip */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleRefresh}
                    className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  />
                }
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing || loading ? "animate-spin" : ""}`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh Submissions</TooltipContent>
            </Tooltip>

            <Badge variant="outline" className="text-xs bg-card px-3 py-1">
              Total:{" "}
              <span className="font-bold ml-1 text-foreground">
                {totalCount}
              </span>
            </Badge>

            {unreadCount > 0 && (
              <Badge className="text-xs bg-black text-white dark:bg-white dark:text-black px-3 py-1 font-bold">
                {unreadCount} Unread
              </Badge>
            )}

            {trashedCount > 0 && (
              <Badge variant="outline" className="text-xs border-red-300 text-red-600 dark:text-red-400 px-3 py-1 font-bold">
                {trashedCount} Trashed
              </Badge>
            )}
          </div>
        </header>

        {/* Main Split-Pane Inbox */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            {/* ================= LEFT PANE: SUBMISSIONS LIST ================= */}
            <ResizablePanel
              defaultSize="24"
              minSize="24"
              maxSize="45"
              className="border-r border-border bg-card/50 flex flex-col"
            >
              {/* Search & Filter Header */}
              <div className="p-3 border-b border-border space-y-3 shrink-0 bg-card">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search sender, email, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xs text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "all"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilter("unread")}
                    className={`flex-1 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "unread"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                  <button
                    onClick={() => setFilter("read")}
                    className={`flex-1 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "read"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Read
                  </button>
                  <button
                    onClick={() => setFilter("trashed")}
                    className={`flex-1 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "trashed"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Trash ({trashedCount})
                  </button>
                </div>
              </div>

              {/* Scrollable Submissions List */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {loading && submissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Loading form submissions...
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Inbox className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-sm font-semibold text-foreground">
                      No submissions found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {searchQuery
                        ? "Try a different search term"
                        : filter === "trashed"
                        ? "Trash is currently empty."
                        : "No form submissions recorded yet."}
                    </p>
                  </div>
                ) : (
                  filteredSubmissions.map((item) => {
                    const isSelected = selectedSubmission?.id === item.id;
                    const senderName = getSenderName(item.payload);
                    const relativeTime = formatDistanceToNow(
                      new Date(item.createdAt),
                      { addSuffix: true }
                    );
                    const messageSnippet =
                      item.payload?.message ||
                      item.payload?.service ||
                      item.payload?.email ||
                      "No message content";

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectSubmission(item)}
                        className={`p-4 transition-all cursor-pointer select-none space-y-2 relative group ${
                          isSelected
                            ? "bg-black/5 dark:bg-white/5 border-l-4 border-l-black dark:border-l-white"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        {/* Top Row: Unread Dot + Form Badge + Time */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {!item.isRead && !item.isTrashed && (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 inline-block" />
                                  }
                                />
                                <TooltipContent side="right">
                                  Unread Submission
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 bg-background shrink-0"
                            >
                              {item.formName}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                            {relativeTime}
                          </span>
                        </div>

                        {/* Sender Name */}
                        <h4
                          className={`text-sm tracking-tight truncate ${
                            !item.isRead && !item.isTrashed
                              ? "font-bold text-foreground"
                              : "font-semibold text-foreground/80"
                          }`}
                        >
                          {senderName}
                        </h4>

                        {/* Snippet */}
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {messageSnippet}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ================= RIGHT PANE: DETAIL VIEW ================= */}
            <ResizablePanel
              defaultSize="65"
              className="bg-background flex flex-col"
            >
              {selectedSubmission ? (
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Detail View Header */}
                  <div className="p-6 border-b border-border bg-card space-y-4 shrink-0 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2.5 py-0.5"
                          >
                            {selectedSubmission.formName}
                          </Badge>
                          {selectedSubmission.sourceUrl && (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md cursor-help" />
                                }
                              >
                                <Globe className="w-3 h-3" />
                                <span>{selectedSubmission.sourceUrl}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                Submitted from URL: {selectedSubmission.sourceUrl}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Sender Name with Copy Button */}
                        <div className="flex items-center gap-2 pt-1">
                          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                            {getSenderName(selectedSubmission.payload)}
                          </h2>
                          <CopyButton
                            text={getSenderName(selectedSubmission.payload)}
                            label="Sender Name"
                          />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {format(
                              new Date(selectedSubmission.createdAt),
                              "PPP 'at' p"
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons with Tooltips */}
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedSubmission.payload?.email && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <a
                                  href={`mailto:${selectedSubmission.payload.email}`}
                                  className="px-3 py-2 rounded-lg bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                />
                              }
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Email Lead</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              Send email to {selectedSubmission.payload.email}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {selectedSubmission.payload?.phone && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <a
                                  href={`tel:${selectedSubmission.payload.phone}`}
                                  className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-border"
                                />
                              }
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              Call {selectedSubmission.payload.phone}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {!selectedSubmission.isTrashed && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={() =>
                                    toggleReadStatus(selectedSubmission)
                                  }
                                  className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
                                />
                              }
                            >
                              {selectedSubmission.isRead ? (
                                <Circle className="w-4 h-4 text-blue-600" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              {selectedSubmission.isRead
                                ? "Mark as unread"
                                : "Mark as read"}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Trash & Restore Controls */}
                        {selectedSubmission.isTrashed ? (
                          <>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() =>
                                      openTrashModal(
                                        "restore",
                                        selectedSubmission,
                                        selectedSubmission.id,
                                        getSenderName(selectedSubmission.payload)
                                      )
                                    }
                                    className="p-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                                  />
                                }
                              >
                                <Undo2 className="w-4 h-4" />
                                <span>Restore</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                Restore submission from trash
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() =>
                                      openTrashModal(
                                        "delete",
                                        selectedSubmission,
                                        selectedSubmission.id,
                                        getSenderName(selectedSubmission.payload)
                                      )
                                    }
                                    className="p-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                                  />
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Permanently</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                Permanently delete submission
                              </TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={() =>
                                    openTrashModal(
                                      "trash",
                                      selectedSubmission,
                                      selectedSubmission.id,
                                      getSenderName(selectedSubmission.payload)
                                    )
                                  }
                                  className="p-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                                />
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              Move submission to trash
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detail View Body: Dynamic Payload Key-Value Inspector */}
                  <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
                    {/* Dynamic Form Payload Fields */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Form Payload Data</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedSubmission.payload || {}).map(
                          ([key, value]) => {
                            if (key === "message") return null;

                            const stringValue =
                              typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value);

                            const formattedLabel = formatKeyName(key);
                            const copyable = isCopyableField(key);

                            return (
                              <div
                                key={key}
                                className="p-4 rounded-xl border border-border bg-card space-y-1 relative group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {formattedLabel}
                                  </span>
                                  {copyable && stringValue && (
                                    <CopyButton
                                      text={stringValue}
                                      label={formattedLabel}
                                    />
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-foreground break-words pt-0.5">
                                  {stringValue || "—"}
                                </p>
                              </div>
                            );
                          }
                        )}
                      </div>

                      {/* Message Block if present */}
                      {selectedSubmission.payload?.message && (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Message / Project Scope</span>
                            </span>
                            <CopyButton
                              text={selectedSubmission.payload.message}
                              label="Message"
                            />
                          </div>
                          <div className="p-5 rounded-2xl border border-border bg-card text-foreground text-sm font-medium leading-relaxed whitespace-pre-wrap shadow-xs">
                            {selectedSubmission.payload.message}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer: IP Address & User Agent */}
                    <div className="pt-6 border-t border-border space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Captured Security & Device Metadata</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            IP Address
                          </span>
                          <p className="text-xs font-mono font-semibold text-foreground">
                            {selectedSubmission.ipAddress ||
                              "Unknown / localhost"}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            User Agent / Browser
                          </span>
                          <p className="text-xs font-mono font-semibold text-foreground break-all leading-normal">
                            {selectedSubmission.userAgent || "Unknown Browser"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Muted Placeholder State when no submission selected */
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-muted/10">
                  <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    No Submission Selected
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Select a message from the list on the left to view
                    submission details, contact information, and captured
                    metadata.
                  </p>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* Centralized Trash Confirmation Modal */}
      <TrashConfirmationModal
        open={modal.isOpen}
        onOpenChange={(open) => !open && closeModal()}
        type={modal.type}
        itemName={modal.targetName}
        itemType="submission"
        loading={trashLoading}
        onConfirm={() => handleConfirm()}
      />
    </TooltipProvider>
  );
}
