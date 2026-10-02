import { Search, Layers, MessageSquare, ChevronRight, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogSummary } from "./types";

interface CommentsSidebarProps {
  blogsSummary: BlogSummary[];
  filteredBlogs: BlogSummary[];
  selectedBlogId: string;
  setSelectedBlogId: (id: string) => void;
  blogSearchQuery: string;
  setBlogSearchQuery: (query: string) => void;
  mobileView: "blogs" | "comments";
  setMobileView: (view: "blogs" | "comments") => void;
  isSidebarOpen: boolean;
  unapprovedCount: number;
  loading: boolean;
}

export function CommentsSidebar({
  blogsSummary,
  filteredBlogs,
  selectedBlogId,
  setSelectedBlogId,
  blogSearchQuery,
  setBlogSearchQuery,
  mobileView,
  setMobileView,
  isSidebarOpen,
  unapprovedCount,
  loading,
}: CommentsSidebarProps) {
  return (
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
                className={`text-[11px] truncate ${
                  selectedBlogId === "all" ? "opacity-80" : "text-muted-foreground"
                }`}
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
  );
}
