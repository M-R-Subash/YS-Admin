"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, MessageSquare, ExternalLink } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatDate(dateStr: string) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Action Component
export const ActionCell = ({ blog, onDataChange }: { blog: any, onDataChange: () => void }) => {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTrashing, setIsTrashing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await fetch(`/api/blogs/${blog.id}`, { method: "DELETE" });
    toast.add({ title: "Blog permanently deleted", type: "success" });
    setDeleteOpen(false);
    onDataChange(); 
  };

  const handleTrash = async () => {
    setIsTrashing(true);
    await fetch(`/api/blogs/${blog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTrashed: true, status: "draft" })
    });
    toast.add({ title: "Blog moved to trash", type: "success" });
    setTrashOpen(false);
    onDataChange(); 
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    await fetch(`/api/blogs/${blog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTrashed: false, status: "draft" })
    });
    toast.add({ title: "Blog restored as draft", type: "success" });
    onDataChange(); 
  };

  const handleDraft = async () => {
    setIsDrafting(true);
    await fetch(`/api/blogs/${blog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" })
    });
    toast.add({ title: "Blog set to draft", type: "success" });
    setDraftOpen(false);
    onDataChange(); 
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await fetch(`/api/blogs/${blog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" })
    });
    toast.add({ title: "Blog published successfully", type: "success" });
    setPublishOpen(false);
    onDataChange(); 
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
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
                  <DropdownMenuItem onClick={() => setDraftOpen(true)}>
                    Move to Draft
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setPublishOpen(true)}>
                    Set as Published
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setTrashOpen(true)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Trash Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleRestore} disabled={isRestoring}>
                  {isRestoring ? "Restoring..." : "Restore"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                  Permanently Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Trash Modal */}
      <AlertDialog open={trashOpen} onOpenChange={setTrashOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpublish the blog and move it to the trash. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTrashing} className="h-auto px-5 py-2.5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleTrash(); }} disabled={isTrashing} className="h-auto px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white">
              {isTrashing ? "Moving..." : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Modal */}
      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Set as Published?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately publish this blog post and make it visible on the live website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing} className="h-auto px-5 py-2.5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handlePublish(); }} disabled={isPublishing} className="h-auto px-5 py-2.5 bg-black hover:bg-black/90 text-white">
              {isPublishing ? "Publishing..." : "Publish Post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Draft Modal */}
      <AlertDialog open={draftOpen} onOpenChange={setDraftOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately unpublish the blog post from the live website and move it to your drafts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDrafting} className="h-auto px-5 py-2.5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDraft(); }} disabled={isDrafting} className="h-auto px-5 py-2.5 bg-black hover:bg-black/90 text-white">
              {isDrafting ? "Moving..." : "Move to Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Modal */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-2xl bg-card p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground mt-3">
              This action cannot be undone. This will permanently delete this blog post from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel disabled={isDeleting} className="px-6 py-3 text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }} 
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 text-base"
            >
              {isDeleting ? "Deleting..." : "Permanent Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

  // If Meta Title and Meta Description fall within optimal character ranges, mark as Good
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
    header: "Title",
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
            <TooltipTrigger className="truncate max-w-[200px] block cursor-default text-left">
              {blog.title}
            </TooltipTrigger>
            <TooltipContent className="max-w-[400px]">
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
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-semibold">{count}</span>
        </div>
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
    header: "Published Date",
    cell: ({ row }) => {
      const publishedAt = row.getValue("publishedAt") as string | null;
      if (!publishedAt) return <span className="text-muted-foreground italic text-xs">Not published</span>;
      return <div className="text-muted-foreground text-xs">{formatDate(publishedAt)}</div>;
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
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
