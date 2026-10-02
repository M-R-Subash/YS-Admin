"use client";

import { Search, Inbox, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormSubmission, FilterType, MobileView, getSenderName } from "./types";

interface SubmissionsSidebarProps {
  submissions: FormSubmission[];
  filteredSubmissions: FormSubmission[];
  selectedSubmission: FormSubmission | null;
  onSelectSubmission: (submission: FormSubmission) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  totalCount: number;
  unreadCount: number;
  trashedCount: number;
  loading: boolean;
  mobileView: MobileView;
  isSidebarOpen: boolean;
  handleRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function SubmissionsSidebar({
  submissions,
  filteredSubmissions,
  selectedSubmission,
  onSelectSubmission,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  totalCount,
  unreadCount,
  trashedCount,
  loading,
  mobileView,
  isSidebarOpen,
  handleRefresh,
  isRefreshing,
}: SubmissionsSidebarProps) {
  return (
    <aside
      className={`w-full shrink-0 md:w-80 lg:w-96 xl:w-100 md:shrink-0 border-r border-border bg-card/30 flex flex-col h-full overflow-hidden transition-opacity ${
        mobileView !== "list" ? "pointer-events-none md:pointer-events-auto" : ""
      } ${!isSidebarOpen ? "md:hidden" : ""}`}
    >
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-border space-y-2.5 shrink-0 bg-card">
        {/* Search Bar & In-Page Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sender, email, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xs text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="p-2 rounded-xs border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            title="Refresh Submissions"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing || loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Status Filter Tabs (Scrollable/Flex) */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`py-1.5 px-1 text-center text-[11px] sm:text-xs font-semibold cursor-pointer rounded-xs transition-all truncate ${
              filter === "all"
                ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                : "bg-background border border-border text-muted-foreground hover:text-foreground"
            }`}
            title={`All (${totalCount})`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`py-1.5 px-1 text-center text-[11px] sm:text-xs font-semibold cursor-pointer rounded-xs transition-all truncate ${
              filter === "unread"
                ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                : "bg-background border border-border text-muted-foreground hover:text-foreground"
            }`}
            title={`Unread (${unreadCount})`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`py-1.5 px-1 text-center text-[11px] sm:text-xs font-semibold cursor-pointer rounded-xs transition-all truncate ${
              filter === "read"
                ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                : "bg-background border border-border text-muted-foreground hover:text-foreground"
            }`}
            title="Read"
          >
            Read
          </button>
          <button
            onClick={() => setFilter("trashed")}
            className={`py-1.5 px-1 text-center text-[11px] sm:text-xs font-semibold cursor-pointer rounded-xs transition-all truncate ${
              filter === "trashed"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-background border border-border text-muted-foreground hover:text-foreground"
            }`}
            title={`Trash (${trashedCount})`}
          >
            Trash ({trashedCount})
          </button>
        </div>
      </div>

      {/* Scrollable Submissions List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {loading && submissions.length === 0 ? (
          <div className="divide-y divide-border/60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 space-y-2.5 bg-card/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-xs" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-36" />
                <div className="space-y-1 pt-0.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-10 text-center space-y-3">
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
            const relativeTime = formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
            });
            const messageSnippet =
              item.payload?.message ||
              item.payload?.service ||
              item.payload?.email ||
              "No message content";

            return (
              <div
                key={item.id}
                onClick={() => onSelectSubmission(item)}
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
                      className="text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 bg-background shrink-0 truncate max-w-35"
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
    </aside>
  );
}
