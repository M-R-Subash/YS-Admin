"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Search,
  CheckCircle,
  Circle,
  Trash2,
  Reply,
  ExternalLink,
  RefreshCw,
  Inbox,
  Send,
  CornerDownRight,
  ShieldCheck,
  RotateCcw,
  FileText,
  Layers,
  ChevronRight,
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
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrashConfirmationModal } from "@/components/ui/trash-confirmation-modal";
import { useTrashManager } from "@/hooks/useTrashManager";

interface BlogSummary {
  id: string;
  title: string;
  slug: string;
  totalComments: number;
  pendingComments: number;
  trashedComments: number;
}

interface CommentItem {
  id: string;
  content: string;
  isApproved: boolean;
  isTrashed: boolean;
  name: string;
  email: string;
  blogId: string;
  blog: {
    id: string;
    title: string;
    slug: string;
  };
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

type ModalActionType = "approve" | "unapprove" | "trash" | "restore" | "delete" | "reply";

interface ModalState {
  isOpen: boolean;
  type: ModalActionType | null;
  targetComment: CommentItem | null;
}

export default function CommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [blogsSummary, setBlogsSummary] = useState<BlogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [unapprovedCount, setUnapprovedCount] = useState(0);
  const [trashedCount, setTrashedCount] = useState(0);

  // Selected blog & filters
  const [selectedBlogId, setSelectedBlogId] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "trashed">("all");
  
  // Search queries
  const [searchQuery, setSearchQuery] = useState("");
  const [blogSearchQuery, setBlogSearchQuery] = useState("");

  // Inline Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Modal state
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    targetComment: null,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchComments(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    fetchComments();
  }, [filter, selectedBlogId]);

  async function fetchComments(silent = false) {
    try {
      if (!silent) setLoading(true);
      const url = `/api/comments?filter=${filter}&blogId=${selectedBlogId}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();

      setComments(data.comments || []);
      setTotalCount(data.totalCount || 0);
      setUnapprovedCount(data.unapprovedCount || 0);
      setTrashedCount(data.trashedCount || 0);
      if (data.blogsSummary) {
        setBlogsSummary(data.blogsSummary);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      toast.add({ title: "Failed to load comments", type: "error" });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Open confirmation modal helper
  const openConfirmModal = (type: ModalActionType, comment: CommentItem) => {
    setModal({
      isOpen: true,
      type,
      targetComment: comment,
    });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, targetComment: null });
  };

  // Confirm Modal Execution Logic
  const handleModalConfirm = async () => {
    const { type, targetComment } = modal;
    if (!type || !targetComment) return;

    setActionLoading(true);

    try {
      if (type === "approve" || type === "unapprove") {
        const newStatus = type === "approve";
        // Optimistic Update
        setComments((prev) =>
          prev.map((c) => (c.id === targetComment.id ? { ...c, isApproved: newStatus } : c))
        );
        setUnapprovedCount((prev) => (newStatus ? Math.max(0, prev - 1) : prev + 1));

        const res = await fetch(`/api/comments/${targetComment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved: newStatus }),
        });
        if (!res.ok) throw new Error();
        toast.add({
          title: newStatus ? "Comment approved" : "Comment marked as pending",
          type: "success",
        });
      } else if (type === "trash") {
        setComments((prev) => prev.filter((c) => c.id !== targetComment.id));
        setTrashedCount((prev) => prev + 1);
        if (!targetComment.isApproved) {
          setUnapprovedCount((prev) => Math.max(0, prev - 1));
        }
        setTotalCount((prev) => Math.max(0, prev - 1));

        const res = await fetch(`/api/comments/${targetComment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: true }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Comment moved to Trash", type: "success" });
      } else if (type === "restore") {
        setComments((prev) => prev.filter((c) => c.id !== targetComment.id));
        setTrashedCount((prev) => Math.max(0, prev - 1));
        setTotalCount((prev) => prev + 1);
        if (!targetComment.isApproved) {
          setUnapprovedCount((prev) => prev + 1);
        }

        const res = await fetch(`/api/comments/${targetComment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: false }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Comment restored from Trash", type: "success" });
      } else if (type === "delete") {
        setComments((prev) => prev.filter((c) => c.id !== targetComment.id));
        setTrashedCount((prev) => Math.max(0, prev - 1));

        const res = await fetch(`/api/comments/${targetComment.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Comment permanently deleted", type: "success" });
      } else if (type === "reply") {
        if (!replyText.trim()) return;

        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogId: targetComment.blogId,
            parentId: targetComment.id,
            content: replyText,
          }),
        });

        if (!res.ok) throw new Error("Failed to post reply");

        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setReplyingToId(null);
        setReplyText("");
        toast.add({ title: "Admin reply published", type: "success" });
      }

      closeModal();
    } catch (err) {
      toast.add({ title: "Action failed", type: "error" });
      fetchComments(true);
    } finally {
      setActionLoading(false);
    }
  };

  // Search Filter for Comments
  const filteredComments = comments.filter((c) => {
    const query = searchQuery.toLowerCase();
    const name = (c.name || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const content = (c.content || "").toLowerCase();

    return (
      name.includes(query) ||
      email.includes(query) ||
      content.includes(query)
    );
  });

  // Filter for Left Blog Sidebar
  const filteredBlogs = blogsSummary.filter((b) =>
    b.title.toLowerCase().includes(blogSearchQuery.toLowerCase())
  );

  const selectedBlogInfo = blogsSummary.find((b) => b.id === selectedBlogId);

  const rootComments = filteredComments.filter((c) => !c.parentId);
  const replies = filteredComments.filter((c) => !!c.parentId);

  const getRepliesForComment = (parentId: string) => {
    return replies.filter((r) => r.parentId === parentId);
  };

  // Modal configuration based on active type
  const getModalConfig = () => {
    const { type, targetComment } = modal;
    if (!type || !targetComment) {
      return { title: "", description: "", confirmText: "", actionClass: "bg-black hover:bg-black/90 text-white" };
    }

    switch (type) {
      case "approve":
        return {
          title: "Approve Comment?",
          description: `Are you sure you want to approve this comment by "${targetComment.name}"? It will immediately be published on the main blog.`,
          confirmText: "Approve & Publish",
          actionClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
        };
      case "unapprove":
        return {
          title: "Mark Comment as Pending?",
          description: `Are you sure you want to unapprove this comment by "${targetComment.name}"? It will be hidden from the public blog page.`,
          confirmText: "Mark Pending",
          actionClass: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "trash":
        return {
          title: "Move Comment to Trash?",
          description: `Move comment by "${targetComment.name}" to Trash? You can restore it anytime from the Trash tab.`,
          confirmText: "Move to Trash",
          actionClass: "bg-red-500 hover:bg-red-600 text-white",
        };
      case "restore":
        return {
          title: "Restore Comment?",
          description: `Restore comment by "${targetComment.name}" back to active comments?`,
          confirmText: "Restore Comment",
          actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black",
        };
      case "delete":
        return {
          title: "Permanently Delete Comment?",
          description: `Are you sure you want to permanently delete this comment by "${targetComment.name}"? This action CANNOT be undone.`,
          confirmText: "Delete Permanently",
          actionClass: "bg-red-600 hover:bg-red-700 text-white",
        };
      case "reply":
        return {
          title: "Publish Admin Reply?",
          description: `Publish official admin response to "${targetComment.name}"?`,
          confirmText: "Publish Reply",
          actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black",
        };
    }
  };

  const modalConfig = getModalConfig();

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Top Navigation Header */}
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
                    <MessageSquare className="w-4 h-4 text-black dark:text-white" />
                    <span>Blog Comments Moderation</span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Top Counter Badges & Refresh */}
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
              <TooltipContent side="bottom">Refresh Comments</TooltipContent>
            </Tooltip>

            <Badge variant="outline" className="text-xs bg-card px-3 py-1">
              Total: <span className="font-bold ml-1 text-foreground">{totalCount}</span>
            </Badge>

            {unapprovedCount > 0 && (
              <Badge className="text-xs bg-amber-500 text-white px-3 py-1 font-bold">
                {unapprovedCount} Pending
              </Badge>
            )}

            {trashedCount > 0 && (
              <Badge variant="outline" className="text-xs border-red-300 text-red-600 dark:text-red-400 px-3 py-1 font-bold">
                {trashedCount} Trashed
              </Badge>
            )}
          </div>
        </header>

        {/* SPLIT MASTER-DETAIL LAYOUT */}
        <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden min-h-0">
          
          {/* LEFT SIDEBAR: BLOGS MASTER LIST */}
          <aside className="w-full md:w-80 lg:w-96 shrink-0 border-r border-border bg-card/30 flex flex-col h-full overflow-hidden">
            {/* Sidebar Header & Search */}
            <div className="p-4 border-b border-border space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Blogs with Comments</span>
                </span>
                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full text-foreground">
                  {blogsSummary.length}
                </span>
              </div>

              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Filter blog titles..."
                  value={blogSearchQuery}
                  onChange={(e) => setBlogSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Blogs List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* All Blogs Master Pill */}
              <button
                onClick={() => setSelectedBlogId("all")}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                  selectedBlogId === "all"
                    ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs font-bold"
                    : "bg-background/60 hover:bg-muted border-border/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedBlogId === "all"
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">All Blog Comments</p>
                    <p className={`text-[11px] truncate ${selectedBlogId === "all" ? "opacity-80" : "text-muted-foreground"}`}>
                      All discussions across site
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {unapprovedCount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors ${
                        selectedBlogId === "all"
                          ? "bg-white text-black dark:bg-black dark:text-white shadow-xs"
                          : "bg-black text-white dark:bg-white dark:text-black"
                      }`}
                    >
                      {unapprovedCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </div>
              </button>

              <Separator className="my-2" />

              {/* Individual Blog Items */}
              {filteredBlogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No blogs match filter
                </div>
              ) : (
                filteredBlogs.map((b) => {
                  const isSelected = selectedBlogId === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBlogId(b.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                        isSelected
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs font-bold"
                          : "bg-background/40 hover:bg-muted border-border/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold line-clamp-1 leading-snug">
                            {b.title}
                          </p>
                          <p
                            className={`text-[11px] ${
                              isSelected ? "opacity-80" : "text-muted-foreground"
                            }`}
                          >
                            {b.totalComments} comment{b.totalComments === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {b.pendingComments > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors ${
                              isSelected
                                ? "bg-white text-black dark:bg-black dark:text-white shadow-xs"
                                : "bg-black text-white dark:bg-white dark:text-black"
                            }`}
                          >
                            {b.pendingComments}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT CONTENT PANEL: COMMENTS FEED FOR SELECTED BLOG */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-background min-h-0">
            
            {/* Top Fixed Control Panel */}
            <div className="p-6 pb-4 border-b border-border space-y-4 shrink-0 bg-background">
              {/* Header for Selected View */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold text-foreground tracking-tight line-clamp-1">
                      {selectedBlogId === "all"
                        ? "All Blog Discussions"
                        : selectedBlogInfo?.title || "Selected Blog Comments"}
                    </h1>

                    {selectedBlogId !== "all" && selectedBlogInfo && (
                      <a
                        href={`/blogs/edit/${selectedBlogInfo.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                        title="Edit blog in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedBlogId === "all"
                      ? "Viewing discussions across all published articles."
                      : `Filtered specifically for "${selectedBlogInfo?.title || "selected post"}".`}
                  </p>
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "all"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilter("pending")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "pending"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pending ({unapprovedCount})
                  </button>
                  <button
                    onClick={() => setFilter("approved")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "approved"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilter("trashed")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all ${
                      filter === "trashed"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Trash ({trashedCount})
                  </button>
                </div>
              </div>

              {/* Comment Search Input */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search commenter name, email, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Moderation Cards Scrollable Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Moderation Cards Feed */}
            {loading && comments.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground bg-card border rounded-2xl">
                Fetching comments from database...
              </div>
            ) : rootComments.length === 0 ? (
              <div className="p-16 text-center bg-card border rounded-2xl space-y-3">
                <Inbox className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                <h3 className="text-base font-bold text-foreground">
                  No comments found
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? "No comments match your search query."
                    : filter === "trashed"
                    ? "Trash is currently empty."
                    : "No comments posted for this blog yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rootComments.map((comment) => {
                  const relativeTime = formatDistanceToNow(
                    new Date(comment.createdAt),
                    { addSuffix: true }
                  );
                  const commentReplies = getRepliesForComment(comment.id);

                  return (
                    <div
                      key={comment.id}
                      className={`bg-card border rounded-2xl p-5 shadow-xs transition-all space-y-4 relative ${
                        comment.isTrashed
                          ? "border-red-200 dark:border-red-900/40 bg-red-50/10 dark:bg-red-950/10"
                          : !comment.isApproved
                          ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10"
                          : "hover:border-primary/30"
                      }`}
                    >
                      {/* Header: Author Info + Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-extrabold uppercase shrink-0">
                            {comment.name.charAt(0)}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">
                                {comment.name}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                &lt;{comment.email}&gt;
                              </span>
                            </div>

                            {/* Context Line: Blog Link */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                              <span>Posted on:</span>
                              <a
                                href={`/blogs/edit/${comment.blog?.id}`}
                                className="font-bold text-foreground hover:underline flex items-center gap-1"
                                title="Edit blog post in admin"
                              >
                                <span>{comment.blog?.title || "Unknown Blog"}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </a>

                              <span>&bull; {relativeTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {comment.isTrashed ? (
                            <Badge className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800 text-xs font-bold px-2.5 py-0.5">
                              Trashed
                            </Badge>
                          ) : comment.isApproved ? (
                            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-bold px-2.5 py-0.5">
                              Approved
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs font-bold px-2.5 py-0.5">
                              Pending Approval
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Comment Body Content */}
                      <div className="text-sm text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </div>

                      {/* NESTED CHILD REPLIES (Threaded UI) */}
                      {commentReplies.length > 0 && (
                        <div className="pt-2 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Replies ({commentReplies.length})</span>
                          </div>

                          <div className="space-y-3">
                            {commentReplies.map((reply) => {
                              const replyTime = formatDistanceToNow(
                                new Date(reply.createdAt),
                                { addSuffix: true }
                              );
                              const isAdminReply = reply.name.includes("(Admin)");

                              return (
                                <div
                                  key={reply.id}
                                  className={`ml-4 sm:ml-8 p-4 rounded-xl border border-border/80 space-y-2 relative ${
                                    isAdminReply
                                      ? "bg-muted/40 border-l-4 border-l-black dark:border-l-white"
                                      : "bg-background"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        {isAdminReply && (
                                          <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white" />
                                        )}
                                        {reply.name}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-medium">
                                        &lt;{reply.email}&gt;
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground">
                                        {replyTime}
                                      </span>
                                      {/* Action button for reply */}
                                      {filter === "trashed" ? (
                                        <button
                                          onClick={() => openConfirmModal("delete", reply)}
                                          className="p-1 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                                          title="Delete reply permanently"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => openConfirmModal("trash", reply)}
                                          className="p-1 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                                          title="Move reply to trash"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-xs text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap">
                                    {reply.content}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Inline Reply Form */}
                      {replyingToId === comment.id && (
                        <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center gap-1.5">
                              <Reply className="w-3.5 h-3.5" />
                              <span>Reply to {comment.name} as Admin</span>
                            </span>
                            <button
                              onClick={() => {
                                setReplyingToId(null);
                                setReplyText("");
                              }}
                              className="text-muted-foreground hover:text-foreground text-xs"
                            >
                              Cancel
                            </button>
                          </div>

                          <textarea
                            rows={3}
                            placeholder="Type your official response..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full p-3 bg-background border border-border rounded-xl text-xs font-medium focus:outline-none focus:border-accent transition-colors"
                          />

                          <div className="flex justify-end">
                            <button
                              onClick={() => openConfirmModal("reply", comment)}
                              disabled={!replyText.trim()}
                              className="px-4 py-2 bg-black hover:bg-black/90 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Publish Reply</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {filter === "trashed" ? (
                          <>
                            {/* Restore Button */}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() => openConfirmModal("restore", comment)}
                                    className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                  />
                                }
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                Restore comment from trash
                              </TooltipContent>
                            </Tooltip>

                            {/* Delete Permanently Button */}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() => openConfirmModal("delete", comment)}
                                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                  />
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Permanently</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                Permanently remove comment from database
                              </TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            {/* Approve / Unapprove Button */}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() =>
                                      openConfirmModal(
                                        comment.isApproved ? "unapprove" : "approve",
                                        comment
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                      comment.isApproved
                                        ? "bg-background border-border text-foreground hover:bg-muted"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                                    }`}
                                  />
                                }
                              >
                                {comment.isApproved ? (
                                  <>
                                    <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Mark Pending</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </>
                                )}
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                {comment.isApproved
                                  ? "Unapprove comment and hide from site"
                                  : "Approve comment to publish on main site"}
                              </TooltipContent>
                            </Tooltip>

                            {/* Reply Button */}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() => {
                                      setReplyingToId(
                                        replyingToId === comment.id ? null : comment.id
                                      );
                                      setReplyText("");
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                  />
                                }
                              >
                                <Reply className="w-3.5 h-3.5" />
                                <span>Reply</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                Post an official admin response
                              </TooltipContent>
                            </Tooltip>

                            {/* Move to Trash Button */}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() => openConfirmModal("trash", comment)}
                                    className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                                  />
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                Move comment to trash
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </main>
        </div>
      </div>

      {/* Centralized Trash & Action Confirmation Modal */}
      <TrashConfirmationModal
        open={modal.isOpen}
        onOpenChange={(open) => !open && closeModal()}
        type={modal.type}
        itemName={modal.targetComment?.name}
        itemType="comment"
        customTitle={modalConfig.title}
        customDescription={modalConfig.description}
        customConfirmText={modalConfig.confirmText}
        customActionClass={modalConfig.actionClass}
        loading={actionLoading}
        onConfirm={handleModalConfirm}
      />
    </TooltipProvider>
  );
}
