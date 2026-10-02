"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR, { mutate as globalMutate } from "swr";
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
  PanelLeft,
  ArrowLeft,
} from "lucide-react";
import { AdminTopBar } from "@/components/AdminTopBar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrashConfirmationModal } from "@/components/ui/trash-confirmation-modal";

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

type ModalActionType =
  | "approve"
  | "unapprove"
  | "trash"
  | "restore"
  | "delete"
  | "reply";

interface ModalState {
  isOpen: boolean;
  type: ModalActionType | null;
  targetComment: CommentItem | null;
}

interface CommentsResponse {
  comments?: CommentItem[];
  totalCount?: number;
  unapprovedCount?: number;
  trashedCount?: number;
  blogsSummary?: BlogSummary[];
}

function CarouselTitle({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  const calculateOverflow = () => {
    if (!containerRef.current || !measureRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    // Don't calculate if container is currently hidden (e.g. mobile view tab switched)
    if (containerWidth <= 0) return;

    const textWidth = measureRef.current.offsetWidth;
    // When stopped at the end, stop cleanly near the right edge (near redirection icon)
    const diff = textWidth + 8 - containerWidth;
    setOverflowDistance(diff > 4 ? diff : 0);
  };

  useEffect(() => {
    calculateOverflow();

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(calculateOverflow);
    }

    const t1 = setTimeout(calculateOverflow, 60);
    const t2 = setTimeout(calculateOverflow, 300);

    const observer = new ResizeObserver(() => {
      calculateOverflow();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", calculateOverflow);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
      window.removeEventListener("resize", calculateOverflow);
    };
  }, [title]);

  // Smooth scroll speed (~32px/sec)
  const scrollDuration = Math.max(2.5, overflowDistance / 32);
  // Total cycle where smooth scrolling takes 55% of the time (15% to 70%)
  const totalDuration = Math.max(5.5, Math.round(scrollDuration / 0.55));

  return (
    <>
      <style>{`
        @keyframes carouselTitleScroll {
          0%, 15% {
            transform: translateX(0);
          }
          70%, 85% {
            transform: translateX(var(--title-scroll-dist, 0px));
          }
          85.01%, 100% {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Hidden untransformed element for accurate text measurement */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="invisible absolute pointer-events-none whitespace-nowrap text-lg sm:text-xl font-extrabold tracking-tight select-none -z-50"
      >
        {title}
      </span>

      <div
        ref={containerRef}
        style={
          overflowDistance > 0
            ? {
                maskImage:
                  "linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)",
              }
            : undefined
        }
        className="overflow-hidden min-w-0 flex-1 group relative"
      >
        <h1
          ref={textRef}
          style={
            overflowDistance > 0
              ? {
                  animation: `carouselTitleScroll ${totalDuration}s linear infinite`,
                  ["--title-scroll-dist" as any]: `-${overflowDistance}px`,
                }
              : undefined
          }
          className={`text-lg sm:text-xl font-extrabold text-foreground tracking-tight whitespace-nowrap inline-block ${
            overflowDistance > 0 ? "group-hover:[animation-play-state:paused]" : ""
          }`}
          title={title}
        >
          {title}
        </h1>
      </div>
    </>
  );
}

function CommentsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Security Check: Comments moderation is restricted to ADMIN only
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/webpages");
    }
  }, [status, session, router]);

  const searchParams = useSearchParams();
  const initialBlogId = searchParams.get("blogId") || "all";

  const [actionLoading, setActionLoading] = useState(false);

  // Selected blog & filters
  const [selectedBlogId, setSelectedBlogId] = useState<string>(initialBlogId);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "trashed"
  >("all");

  // Mobile View state: "blogs" (master list) or "comments" (detail feed)
  const [mobileView, setMobileView] = useState<"blogs" | "comments">("comments");

  // Tablet/Desktop sidebar collapsible state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const isAuthorized =
    status === "authenticated" && session?.user?.role === "ADMIN";
  const endpoint = isAuthorized
    ? `/api/comments?filter=${filter}&blogId=${selectedBlogId}`
    : null;
  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    mutate,
  } = useSWR<CommentsResponse>(endpoint);

  const comments = commentsData?.comments ?? [];
  const blogsSummary = commentsData?.blogsSummary ?? [];
  const totalCount = commentsData?.totalCount ?? 0;
  const unapprovedCount = commentsData?.unapprovedCount ?? 0;
  const trashedCount = commentsData?.trashedCount ?? 0;

  const loading = isCommentsLoading && !commentsData;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 600);
  };

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
        // Optimistic Update directly in SWR cache
        mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            unapprovedCount: newStatus
              ? Math.max(0, (current.unapprovedCount || 0) - 1)
              : (current.unapprovedCount || 0) + 1,
            comments: (current.comments || []).map((c) =>
              c.id === targetComment.id ? { ...c, isApproved: newStatus } : c,
            ),
          };
        }, false);

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
        mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            totalCount: Math.max(0, (current.totalCount || 0) - 1),
            trashedCount: (current.trashedCount || 0) + 1,
            unapprovedCount: !targetComment.isApproved
              ? Math.max(0, (current.unapprovedCount || 0) - 1)
              : current.unapprovedCount,
            comments: (current.comments || []).filter(
              (c) => c.id !== targetComment.id,
            ),
          };
        }, false);

        const res = await fetch(`/api/comments/${targetComment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: true }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Comment moved to Trash", type: "success" });
      } else if (type === "restore") {
        mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            totalCount: (current.totalCount || 0) + 1,
            trashedCount: Math.max(0, (current.trashedCount || 0) - 1),
            unapprovedCount: !targetComment.isApproved
              ? (current.unapprovedCount || 0) + 1
              : current.unapprovedCount,
            comments: (current.comments || []).filter(
              (c) => c.id !== targetComment.id,
            ),
          };
        }, false);

        const res = await fetch(`/api/comments/${targetComment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: false }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Comment restored from Trash", type: "success" });
      } else if (type === "delete") {
        mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            trashedCount: Math.max(0, (current.trashedCount || 0) - 1),
            comments: (current.comments || []).filter(
              (c) => c.id !== targetComment.id,
            ),
          };
        }, false);

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
        mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            comments: [data.comment, ...(current.comments || [])],
          };
        }, false);
        setReplyingToId(null);
        setReplyText("");
        toast.add({ title: "Admin reply published", type: "success" });
      }

      globalMutate("/api/badges");
      globalMutate("/api/dashboard/stats");
      mutate();
      closeModal();
    } catch {
      toast.add({ title: "Failed to update status", type: "error" });
      mutate();
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
      name.includes(query) || email.includes(query) || content.includes(query)
    );
  });

  // Filter for Left Blog Sidebar
  const filteredBlogs = blogsSummary.filter((b) =>
    b.title.toLowerCase().includes(blogSearchQuery.toLowerCase()),
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
      return {
        title: "",
        description: "",
        confirmText: "",
        actionClass: "bg-black hover:bg-black/90 text-white",
      };
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
          actionClass:
            "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black",
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
          actionClass:
            "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black",
        };
    }
  };

  const modalConfig = getModalConfig();

  if (
    status === "loading" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Top Navigation Header */}
        <AdminTopBar
          breadcrumbs="Comments"
          actions={
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Tablet/Desktop Sidebar Toggle */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setIsSidebarOpen((prev) => !prev)}
                      className="hidden md:flex p-1.5 sm:p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <PanelLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  }
                />
                <TooltipContent side="bottom">
                  {isSidebarOpen ? "Hide blog sidebar" : "Show blog sidebar"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleRefresh}
                      className="p-1.5 sm:p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    />
                  }
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing || loading ? "animate-spin" : ""}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">Refresh Comments</TooltipContent>
              </Tooltip>

              <Badge variant="outline" className="text-xs bg-card px-2.5 py-1">
                Total:{" "}
                <span className="font-bold ml-1 text-foreground">
                  {totalCount}
                </span>
              </Badge>

              {unapprovedCount > 0 && (
                <Badge className="text-xs bg-amber-500 text-white px-2.5 py-1 font-bold">
                  {unapprovedCount} Pending
                </Badge>
              )}

              {trashedCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs border-red-300 text-red-600 dark:text-red-400 px-2.5 py-1 font-bold"
                >
                  {trashedCount} Trashed
                </Badge>
              )}
            </div>
          }
        />

        {/* SPLIT MASTER-DETAIL LAYOUT */}
        <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden min-h-0">
          {/* LEFT SIDEBAR: BLOGS MASTER LIST */}
          <aside
            className={`w-full md:w-72 lg:w-80 xl:w-96 shrink-0 border-r border-border bg-card/30 flex-col h-full overflow-hidden ${
              mobileView === "blogs" ? "flex" : "hidden md:flex"
            } ${!isSidebarOpen ? "md:hidden" : ""}`}
          >
            {/* Sidebar Header & Search */}
            <div className="p-4 border-b border-border space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Blogs with Comments</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full text-foreground">
                    {blogsSummary.length}
                  </span>
                  <button
                    onClick={() => setMobileView("comments")}
                    className="md:hidden text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Feed &rarr;
                  </button>
                </div>
              </div>

              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Filter blog titles..."
                  value={blogSearchQuery}
                  onChange={(e) => setBlogSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-sm text-xs font-medium text-foreground focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Blogs List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* All Blogs Master Pill */}
              <button
                onClick={() => {
                  setSelectedBlogId("all");
                  setMobileView("comments");
                }}
                className={`w-full text-left p-3 rounded-sm transition-all flex items-center justify-between cursor-pointer border ${
                  selectedBlogId === "all"
                    ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs font-bold"
                    : "bg-background/60 hover:bg-muted border-border/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
                      selectedBlogId === "all"
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      All Blog Comments
                    </p>
                    <p
                      className={`text-[11px] truncate ${selectedBlogId === "all" ? "opacity-80" : "text-muted-foreground"}`}
                    >
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
              {loading && blogsSummary.length === 0 ? (
                <div className="space-y-1.5 p-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="p-3 rounded-sm border border-border/50 bg-card/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Skeleton className="w-8 h-8 rounded-sm shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                      </div>
                      <Skeleton className="w-4 h-4 rounded-full ml-2 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredBlogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No blogs match filter
                </div>
              ) : (
                filteredBlogs.map((b) => {
                  const isSelected = selectedBlogId === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBlogId(b.id);
                        setMobileView("comments");
                      }}
                      className={`w-full text-left p-3 rounded-sm transition-all flex items-center justify-between cursor-pointer border ${
                        isSelected
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs font-bold"
                          : "bg-background/40 hover:bg-muted border-border/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
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
                              isSelected
                                ? "opacity-80"
                                : "text-muted-foreground"
                            }`}
                          >
                            {b.totalComments} comment
                            {b.totalComments === 1 ? "" : "s"}
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
          <main
            className={`flex-1 flex-col h-full overflow-hidden bg-background min-h-0 ${
              mobileView === "comments" ? "flex" : "hidden md:flex"
            }`}
          >
            {/* Top Fixed Control Panel */}
            <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border space-y-3 sm:space-y-4 shrink-0 bg-background">
              {/* Mobile Back Button to Blogs List */}
              <div className="flex items-center justify-between gap-2 md:hidden pb-1">
                <button
                  onClick={() => setMobileView("blogs")}
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-sm transition-colors cursor-pointer border border-border"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Blogs List ({blogsSummary.length})</span>
                </button>

                {selectedBlogId !== "all" && (
                  <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[180px]">
                    {selectedBlogInfo?.title}
                  </span>
                )}
              </div>

              {/* Header for Selected View */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b pb-3 sm:pb-4">
                <div className="min-w-0 flex-1 w-full">
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                    <CarouselTitle
                      title={
                        selectedBlogId === "all"
                          ? "All Blog Discussions"
                          : selectedBlogInfo?.title || "Selected Blog Comments"
                      }
                    />

                    {selectedBlogId !== "all" && selectedBlogInfo && (
                      <a
                        href={`/blogs/edit/${selectedBlogInfo.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 flex items-center gap-1"
                        title="Edit blog in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none no-scrollbar shrink-0 -mx-1 px-1">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all shrink-0 whitespace-nowrap ${
                      filter === "all"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilter("pending")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all shrink-0 whitespace-nowrap ${
                      filter === "pending"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pending ({unapprovedCount})
                  </button>
                  <button
                    onClick={() => setFilter("approved")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all shrink-0 whitespace-nowrap ${
                      filter === "approved"
                        ? "bg-black text-white shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilter("trashed")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer rounded-xs transition-all shrink-0 whitespace-nowrap ${
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
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
              {/* Moderation Cards Feed */}
              {loading && comments.length === 0 ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-card border border-border/70 rounded-sm p-5 shadow-xs space-y-4"
                    >
                      {/* Header Skeleton: Author Avatar + Name + Context + Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-3 w-36" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-3 w-40" />
                            </div>
                          </div>
                        </div>
                        <Skeleton className="h-5 w-24 rounded-full shrink-0" />
                      </div>

                      <Separator />

                      {/* Comment Content Skeleton */}
                      <div className="space-y-2">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-5/6" />
                        <Skeleton className="h-3.5 w-2/3" />
                      </div>

                      {/* Actions Skeleton */}
                      <div className="flex items-center gap-2 pt-1">
                        <Skeleton className="h-8 w-24 rounded-sm" />
                        <Skeleton className="h-8 w-16 rounded-sm" />
                        <Skeleton className="h-8 w-8 rounded-sm" />
                      </div>
                    </div>
                  ))}
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
                      { addSuffix: true },
                    );
                    const commentReplies = getRepliesForComment(comment.id);

                    return (
                      <div
                        key={comment.id}
                        className={`bg-card border rounded-sm p-3.5 sm:p-5 shadow-xs transition-all space-y-3 sm:space-y-4 relative ${
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
                                  <span>
                                    {comment.blog?.title || "Unknown Blog"}
                                  </span>
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
                                  { addSuffix: true },
                                );
                                const isAdminReply =
                                  reply.name.includes("(Admin)");

                                return (
                                  <div
                                    key={reply.id}
                                    className={`ml-2.5 sm:ml-8 p-3 sm:p-4 rounded-sm border-l-2 sm:border border-border/80 space-y-2 relative ${
                                      isAdminReply
                                        ? "bg-muted/40 border-l-4 border-l-black dark:border-l-white"
                                        : "bg-background"
                                    }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
                                          {isAdminReply && (
                                            <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />
                                          )}
                                          {reply.name}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground font-medium truncate">
                                          &lt;{reply.email}&gt;
                                        </span>
                                      </div>

                                      <span className="text-[10px] sm:text-[11px] text-muted-foreground shrink-0">
                                        {replyTime}
                                      </span>
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
                          <div className="p-4 rounded-sm border border-border bg-muted/30 space-y-3">
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
                              className="w-full p-3 bg-background border border-border rounded-sm text-xs font-medium focus:outline-none focus:border-accent transition-colors"
                            />

                            <div className="flex justify-end">
                              <button
                                onClick={() =>
                                  openConfirmModal("reply", comment)
                                }
                                disabled={!replyText.trim()}
                                className="px-4 py-2 bg-black hover:bg-black/90 text-white text-xs font-bold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Publish Reply</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Footer Action Buttons: Space-Between for Safety */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                          {/* Left Actions: Approve/Pending & Reply (or Restore) */}
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {filter === "trashed" ? (
                              /* Restore Button */
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <button
                                      onClick={() =>
                                        openConfirmModal("restore", comment)
                                      }
                                      className="px-3 py-1.5 rounded-sm border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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
                            ) : (
                              <>
                                {/* Approve / Unapprove Button */}
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <button
                                        onClick={() =>
                                          openConfirmModal(
                                            comment.isApproved
                                              ? "unapprove"
                                              : "approve",
                                            comment,
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
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
                                            replyingToId === comment.id
                                              ? null
                                              : comment.id,
                                          );
                                          setReplyText("");
                                        }}
                                        className="px-3 py-1.5 rounded-sm border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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
                              </>
                            )}
                          </div>

                          {/* Right Action: Delete Button (separated to avoid misclicks) */}
                          <div>
                            {filter === "trashed" ? (
                              /* Delete Permanently Button */
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <button
                                      onClick={() =>
                                        openConfirmModal("delete", comment)
                                      }
                                      className="px-3 py-1.5 rounded-sm border border-red-200 bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
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
                            ) : (
                              /* Move to Trash Button */
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <button
                                      onClick={() =>
                                        openConfirmModal("trash", comment)
                                      }
                                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-sm border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                    />
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Trash</span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  Move comment to trash
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
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

export default function CommentsPage() {
  return (
    <Suspense fallback={null}>
      <CommentsPageContent />
    </Suspense>
  );
}
