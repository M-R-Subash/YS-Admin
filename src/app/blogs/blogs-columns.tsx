"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MessageSquare, CalendarClock } from "lucide-react";
import { UniversalSeoModal } from "@/components/admin/UniversalSeoModal";
import { SchedulePostModal } from "@/components/blog/dialogs/SchedulePostModal";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SeoStatusBadge } from "@/components/admin/SeoStatusBadge";
import { ContentActionCell } from "@/components/admin/ContentActionCell";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { format } from "date-fns";

// Action Component
export const ActionCell = ({ blog, onDataChange }: { blog: any; onDataChange: () => void }) => {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";
  const cleanSlug = blog.slug?.startsWith("/") ? blog.slug.slice(1) : (blog.slug || "");

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
          !blog.isTrashed && (
            <DropdownMenuItem onClick={() => setScheduleModalOpen(true)}>
              <span className="flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5 text-purple-600" />
                <span>{blog.status === "scheduled" ? "Reschedule" : "Schedule Post"}</span>
              </span>
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
          onConfirmSchedule={handleReschedule}
          isSubmitting={rescheduling}
        />
      )}
    </>
  );
};

export const getBlogsColumns = (onDataChange: () => void): ColumnDef<any>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as string || "").toLowerCase();
      const valB = (rowB.getValue(columnId) as string || "").toLowerCase();
      return valA.localeCompare(valB);
    },
    cell: ({ row }) => {
      const blog = row.original as any;
      return (
        <div className="font-bold text-foreground flex items-center gap-3">
          {blog.featuredImage ? (
            <img
              src={blog.featuredImage}
              alt={blog.title}
              className="w-8 h-8 rounded-sm object-cover shrink-0 bg-muted border border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center shrink-0 border border-border text-[10px] text-muted-foreground uppercase">
              Img
            </div>
          )}
          <Tooltip>
            <TooltipTrigger className="truncate max-w-50 block cursor-default text-left">
              {blog.title}
            </TooltipTrigger>
            <TooltipContent className="max-w-100">
              <p>{blog.title}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const blog = row.original as any;
      return <StatusBadge status={blog.status} scheduledAt={blog.scheduledAt} />;
    },
  },
  {
    id: "seoStatus",
    header: "SEO Status",
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
          {categories.slice(0, 2).map((cat, i) => (
            <span key={i} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] uppercase font-bold tracking-wide rounded-sm">
              {cat}
            </span>
          ))}
          {categories.length > 2 && (
            <span className="text-[10px] text-muted-foreground font-medium">+{categories.length - 2}</span>
          )}
        </div>
      );
    },
  },
  {
    id: "comments",
    header: "Comments",
    cell: ({ row }) => {
      const blog = row.original as any;
      const count = blog._count?.comments || 0;
      return (
        <Link
          href={`/comments?blogId=${blog.id}`}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-semibold">{count}</span>
        </Link>
      );
    },
  },
  {
    id: "author",
    header: "Author",
    cell: ({ row }) => {
      const blog = row.original as any;
      return <div className="text-muted-foreground">{blog.author?.name || "Unknown"}</div>;
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
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
    sortingFn: (rowA, rowB, columnId) => {
      const timeA = rowA.getValue(columnId) ? new Date(rowA.getValue(columnId) as string).getTime() : 0;
      const timeB = rowB.getValue(columnId) ? new Date(rowB.getValue(columnId) as string).getTime() : 0;
      return timeA - timeB;
    },
    cell: ({ row }) => {
      const updatedAt = row.getValue("updatedAt") as string | null;
      if (!updatedAt) return <span className="text-muted-foreground italic text-xs">Unknown</span>;
      return <div className="text-muted-foreground text-xs">{formatDate(updatedAt)}</div>;
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right flex justify-end">
        <ActionCell blog={row.original} onDataChange={onDataChange} />
      </div>
    ),
  },
];
