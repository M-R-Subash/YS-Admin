"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, MessageSquare, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { BlogQuickEditModal } from "@/components/admin/BlogQuickEditModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrashConfirmationModal, TrashActionType } from "@/components/ui/trash-confirmation-modal";
import { useTrashManager } from "@/hooks/useTrashManager";

function formatDate(dateStr: string) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Action Component
export const ActionCell = ({ blog, onDataChange }: { blog: any; onDataChange: () => void }) => {
  const router = useRouter();
  const [seoOpen, setSeoOpen] = useState(false);

  const { modal, loading, openTrashModal, closeModal, handleConfirm } =
    useTrashManager({
      itemType: "blog post",
      onSuccess: async () => {
        onDataChange();
      },
    });

  const onModalConfirm = () => {
    handleConfirm(async (type, item, id) => {
      if (type === "trash") {
        const res = await fetch(`/api/blogs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: true, status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Blog moved to trash", type: "success" });
      } else if (type === "restore") {
        const res = await fetch(`/api/blogs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: false, status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Blog restored as draft", type: "success" });
      } else if (type === "delete") {
        const res = await fetch(`/api/blogs/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.add({ title: "Blog permanently deleted", type: "success" });
      } else if (type === "unapprove") {
        // Draft
        const res = await fetch(`/api/blogs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Blog set to draft", type: "success" });
      } else if (type === "approve") {
        // Publish
        const res = await fetch(`/api/blogs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Blog published successfully", type: "success" });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" />}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!blog.isTrashed ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/blogs/edit/${blog.id}`)}>
                  Edit (Builder)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSeoOpen(true)}>
                  Quick Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const siteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "http://localhost:3001";
                  window.open(`${siteUrl}/blogs/${blog.slug}`, '_blank');
                }}>
                  View Live
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {blog.status === "published" ? (
                  <DropdownMenuItem onClick={() => openTrashModal("unapprove", blog, blog.id, blog.title)}>
                    Move to Draft
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => openTrashModal("approve", blog, blog.id, blog.title)}>
                    Set as Published
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => openTrashModal("trash", blog, blog.id, blog.title)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Trash Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openTrashModal("restore", blog, blog.id, blog.title)}>
                  Restore
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => openTrashModal("delete", blog, blog.id, blog.title)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                  Permanently Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Centralized Confirmation Modal */}
      <TrashConfirmationModal
        open={modal.isOpen}
        onOpenChange={(open) => !open && closeModal()}
        type={modal.type}
        itemName={modal.targetName}
        itemType="blog post"
        loading={loading}
        onConfirm={onModalConfirm}
      />

      {seoOpen && (
        <BlogQuickEditModal
          blogId={blog.id}
          isOpen={seoOpen}
          onClose={() => setSeoOpen(false)}
          onSaved={onDataChange}
          initialData={blog}
        />
      )}
    </>
  );
};

function calculateSeoStatus(seo: any, fallbackImage?: string) {
  if (!seo) return { label: "Bad", variant: "destructive" };

  const image = seo.ogImage || fallbackImage;
  const coreFields = [seo.metaTitle, seo.metaDesc, seo.focusKeyword, image].filter(Boolean);
  const coreCount = coreFields.length;

  if (coreCount <= 1) {
    return { label: "Bad", variant: "destructive" };
  }

  const titleLen = seo.metaTitle?.length || 0;
  const descLen = seo.metaDesc?.length || 0;

  if (titleLen >= 40 && titleLen <= 60 && descLen >= 120 && descLen <= 160) {
    return { label: "Good", variant: "success" };
  }

  if (coreCount >= 2) {
    return { label: "Medium", variant: "warning" };
  }

  return { label: "Needs Improvement", variant: "default" };
}

export const getBlogsColumns = (onDataChange: () => void): ColumnDef<any>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 px-2 font-bold hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-1.5"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Title</span>
          {isSorted === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : isSorted === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
        </Button>
      );
    },
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
            <img src={blog.featuredImage} alt={blog.title} className="w-8 h-8 rounded-sm object-cover shrink-0 bg-muted border border-border" />
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
      const status: string = row.getValue("status");
      return (
        <span
          className={`text-xs px-2.5 py-1 rounded-sm font-bold uppercase tracking-wider ${
            status === "published"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {status}
        </span>
      );
    },
  },
  {
    id: "seoStatus",
    header: "SEO Status",
    cell: ({ row }) => {
      const blog = row.original as any;
      const status = calculateSeoStatus(blog.seo, blog.featuredImage);
      
      let badgeClasses = "text-xs px-2.5 py-1 rounded-sm font-semibold border";
      if (status.variant === "destructive") {
        badgeClasses += " bg-red-100 text-red-700 border-red-200";
      } else if (status.variant === "warning") {
        badgeClasses += " bg-yellow-100 text-yellow-700 border-yellow-200";
      } else if (status.variant === "success") {
        badgeClasses += " bg-green-100 text-green-700 border-green-200";
      } else {
        badgeClasses += " bg-orange-100 text-orange-700 border-orange-200";
      }

      return (
        <span className={badgeClasses}>
          {status.label}
        </span>
      );
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
    }
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
    }
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
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 px-2 font-bold hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-1.5"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Published Date</span>
          {isSorted === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : isSorted === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
        </Button>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const timeA = rowA.getValue(columnId) ? new Date(rowA.getValue(columnId) as string).getTime() : 0;
      const timeB = rowB.getValue(columnId) ? new Date(rowB.getValue(columnId) as string).getTime() : 0;
      return timeA - timeB;
    },
    cell: ({ row }) => {
      const publishedAt = row.getValue("publishedAt") as string | null;
      if (!publishedAt) return <span className="text-muted-foreground italic text-xs">Not published</span>;
      return <div className="text-muted-foreground text-xs">{formatDate(publishedAt)}</div>;
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 px-2 font-bold hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-1.5"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Last Updated</span>
          {isSorted === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : isSorted === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
        </Button>
      );
    },
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
