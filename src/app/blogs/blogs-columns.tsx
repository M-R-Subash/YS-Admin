"use client";

import { useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { MessageSquare, CalendarClock, Lock } from "lucide-react";
import { UniversalSeoModal } from "@/components/seo/UniversalSeoModal";
import { SchedulePostModal } from "@/components/blog/dialogs/SchedulePostModal";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { SeoStatusBadge } from "@/components/seo/SeoStatusBadge";
import { ContentActionCell } from "@/components/table/ContentActionCell";
import {
  createSelectColumn,
  createStatusColumn,
  createDateColumn,
  createActionColumn,
} from "@/components/table/column-helpers";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { format } from "date-fns";
import { clientConfig } from "@/lib/config/client";

// Action Component
export const ActionCell = ({
  blog,
  onDataChange,
  lock,
  isLockedByOther,
}: {
  blog: any;
  onDataChange: () => void;
  lock?: { userId: string; userName: string };
  isLockedByOther?: boolean;
}) => {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const siteUrl = clientConfig.app.frontendUrl;
  const cleanSlug = blog.slug?.startsWith("/") ? blog.slug.slice(1) : (blog.slug || "");

  // If another team member is actively editing this post, disable all actions and modals
  if (isLockedByOther) {
    return (
      <div className="flex items-center justify-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-not-allowed select-none">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px]">Locked</span>
              </div>
            }
          />
          <TooltipContent side="left" className="text-xs max-w-xs font-medium">
            Currently being edited by {lock?.userName || "another editor"}. All editing and quick actions are disabled to prevent overwrites.
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  const handleReschedule = async (newDate: Date) => {
    try {
      setRescheduling(true);
      const res = await fetch(`/api/blogs/${blog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          scheduledAt: newDate.toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to schedule");
      }
      toast.add({
        title: "Schedule Updated",
        description: `Post scheduled for ${format(newDate, "MMM d, yyyy h:mm a")}`,
        type: "success",
      });
      setScheduleModalOpen(false);
      onDataChange();
    } catch (err: any) {
      toast.add({ title: "Scheduling Failed", description: err.message, type: "error" });
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <>
      <ContentActionCell
        item={blog}
        itemType="blog post"
        apiEndpoint="/api/blogs"
        editUrl={`/blogs/edit/${blog.id}`}
        previewUrl={`/blogs/preview/${blog.id}`}
        publicUrl={siteUrl ? `${siteUrl}/blogs/${cleanSlug}` : undefined}
        publicUrlLabel="View Live"
        quickEditLabel="Quick Edit"
        extraMenuItems={
          !blog.isTrashed && (blog.status === "scheduled" || blog.status === "draft") && (
            <DropdownMenuItem onClick={() => setScheduleModalOpen(true)} className="cursor-pointer">
              <CalendarClock className="w-3.5 h-3.5 mr-2 text-purple-600" />
              <span>{blog.status === "scheduled" ? "Reschedule" : "Schedule Post"}</span>
            </DropdownMenuItem>
          )
        }
        renderQuickEditModal={({ isOpen, onClose, onSaved }) => (
          <UniversalSeoModal
            entityId={blog.id}
            entityType="blog"
            isOpen={isOpen}
            onClose={onClose}
            onSaved={onSaved}
            initialData={blog}
          />
        )}
        onDataChange={onDataChange}
      />
      {scheduleModalOpen && (
        <SchedulePostModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          currentScheduledAt={blog.scheduledAt}
          postTitle={blog.title}
          onConfirmSchedule={handleReschedule}
          isSubmitting={rescheduling}
        />
      )}
    </>
  );
};

export const getBlogsColumns = (
  onDataChange: () => void,
  activeLocks: Record<string, { userId: string; userName: string }> = {},
  currentUserId?: string
): ColumnDef<any>[] => [
  createSelectColumn<any>({
    isRowDisabled: (blog) => {
      const lock = activeLocks[blog.id];
      if (lock && lock.userId !== currentUserId) {
        return {
          disabled: true,
          reason: `Locked: ${lock.userName} is currently editing this post`,
        };
      }
      return { disabled: false };
    },
  }),
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Post & Title" />,
    meta: {
      className: "w-[240px] md:w-[260px] max-w-[260px]",
    },
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as string || "").toLowerCase();
      const valB = (rowB.getValue(columnId) as string || "").toLowerCase();
      return valA.localeCompare(valB);
    },
    cell: ({ row }) => {
      const blog = row.original as any;
      const cleanSlug = blog.slug?.startsWith("/") ? blog.slug.slice(1) : (blog.slug || "");
      const lock = activeLocks[blog.id];
      const isLockedByOther = Boolean(lock && lock.userId !== currentUserId);

      return (
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:max-w-60 md:max-w-65 min-w-0">
          {blog.featuredImage ? (
            <img
              src={blog.featuredImage}
              alt={blog.title}
              className="hidden sm:block w-10 h-10 rounded-sm object-cover shrink-0 bg-muted border border-border"
            />
          ) : (
            <div className="hidden sm:flex w-10 h-10 rounded-sm bg-muted items-center justify-center shrink-0 border border-border text-[10px] text-muted-foreground uppercase font-bold">
              Img
            </div>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    isLockedByOther ? (
                      <span className="font-bold text-muted-foreground line-through decoration-amber-500/60 truncate block text-xs cursor-not-allowed">
                        {blog.title}
                      </span>
                    ) : (
                      <Link
                        href={`/blogs/edit/${blog.id}`}
                        className="font-bold text-foreground hover:text-primary transition-colors truncate block text-xs"
                      >
                        {blog.title}
                      </Link>
                    )
                  }
                />
                <TooltipContent side="top" className="text-xs max-w-sm font-medium">
                  {isLockedByOther
                    ? `Locked by ${lock?.userName}. Direct edit is disabled.`
                    : blog.title}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Active Lock Badge Indicator */}
            {isLockedByOther && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                  <span>{lock?.userName} is editing</span>
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-0.5 min-w-0 w-full overflow-hidden">
              <span className="text-[11px] text-muted-foreground truncate font-mono min-w-0 flex-1">
                /blogs/{cleanSlug}
              </span>
              {blog.categories?.length > 0 && (
                <span className="px-1.5 py-0.2 bg-secondary text-secondary-foreground text-[9px] font-semibold uppercase rounded-xs shrink-0">
                  {blog.categories[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  createStatusColumn<any>(),
  {
    id: "seoStatus",
    header: "SEO Score",
    cell: ({ row }) => {
      const blog = row.original as any;
      return <SeoStatusBadge seo={blog.seo} fallbackImage={blog.featuredImage} />;
    },
  },
  {
    accessorKey: "categories",
    header: "Categories",
    cell: ({ row }) => {
      const categories: string[] = row.getValue("categories") || [];
      if (categories.length === 0) return <span className="text-muted-foreground text-xs italic">Uncategorized</span>;

      return (
        <div className="flex flex-wrap gap-1">
          {categories.slice(0, 2).map((category, index) => (
            <span
              key={index}
              className="px-1.5 py-0.5 rounded-xs bg-muted text-foreground text-[10px] font-medium border border-border"
            >
              {category}
            </span>
          ))}
          {categories.length > 2 && (
            <span className="text-[10px] text-muted-foreground font-medium self-center">
              +{categories.length - 2}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "commentsCount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Comments" />,
    sortingFn: "basic",
    cell: ({ row }) => {
      const count = row.original.commentsCount || 0;
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span>{count}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "author",
    header: "Author",
    cell: ({ row }) => {
      const blog = row.original as any;
      const customAuthor = blog.seo?.authorName?.trim();
      const authorName = customAuthor || blog.author?.name || "Admin";
      const authorRole = customAuthor ? "Guest Author" : blog.author?.authorRole;
      const avatarUrl = blog.author?.profilePicture;

      return (
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={authorName}
              className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border border-border shrink-0">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-xs min-w-0">
            <p className="font-medium text-foreground truncate max-w-32.5">{authorName}</p>
            {authorRole && (
              <p className="text-[10px] text-muted-foreground truncate max-w-32.5">
                {authorRole}
              </p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "publishedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Published Date" />,
    sortingFn: (rowA, rowB, columnId) => {
      const timeA = rowA.getValue(columnId) ? new Date(rowA.getValue(columnId) as string).getTime() : 0;
      const timeB = rowB.getValue(columnId) ? new Date(rowB.getValue(columnId) as string).getTime() : 0;
      return timeA - timeB;
    },
    cell: ({ row }) => {
      const blog = row.original as any;
      const publishedAt = row.getValue("publishedAt") as string | null;
      if (blog.status === "scheduled" && blog.scheduledAt) {
        return (
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              Target Schedule
            </span>
            <span className="text-muted-foreground text-xs">{formatDate(blog.scheduledAt)}</span>
          </div>
        );
      }
      if (!publishedAt) return <span className="text-muted-foreground italic text-xs">Not published</span>;
      return <div className="text-muted-foreground text-xs">{formatDate(publishedAt)}</div>;
    },
  },
  createDateColumn<any>("updatedAt", "Last Updated"),
  createActionColumn<any>((blog) => {
    const lock = activeLocks[blog.id];
    const isLockedByOther = Boolean(lock && lock.userId !== currentUserId);
    return (
      <ActionCell
        blog={blog}
        onDataChange={onDataChange}
        lock={lock}
        isLockedByOther={isLockedByOther}
      />
    );
  }),
];
