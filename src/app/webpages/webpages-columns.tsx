"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Page } from "@/types";
import { toast } from "@/components/ui/toast";

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
import { SeoQuickEditModal } from "@/components/admin/SeoQuickEditModal";

function formatDate(dateStr: string) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Action Component
export const ActionCell = ({ page, onDataChange }: { page: Page, onDataChange: () => void }) => {
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
    await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
    toast.add({ title: "Page permanently deleted", type: "success" });
    router.refresh(); 
  };

  const handleTrash = async () => {
    setIsTrashing(true);
    await fetch(`/api/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTrashed: true, status: "draft" })
    });
    toast.add({ title: "Page moved to trash", type: "success" });
    setTrashOpen(false);
    onDataChange(); 
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    await fetch(`/api/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTrashed: false, status: "draft" })
    });
    toast.add({ title: "Page restored as draft", type: "success" });
    onDataChange(); 
  };

  const handleDraft = async () => {
    setIsDrafting(true);
    await fetch(`/api/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" })
    });
    toast.add({ title: "Page set to draft", type: "success" });
    setDraftOpen(false);
    onDataChange(); 
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await fetch(`/api/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" })
    });
    toast.add({ title: "Page published successfully", type: "success" });
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
          {!page.isTrashed ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/editor/${page.id}`)}>
                  Edit (Builder)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSeoOpen(true)}>
                  Quick Edit (SEO)
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {page.status === "published" ? (
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
              This will unpublish the page and move it to the trash. You can restore it later if needed.
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
              This will immediately publish this page and make it visible on the live website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing} className="h-auto px-5 py-2.5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handlePublish(); }} disabled={isPublishing} className="h-auto px-5 py-2.5 bg-black hover:bg-black/90 text-white">
              {isPublishing ? "Publishing..." : "Publish Page"}
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
              This will immediately unpublish the page from the live website and move it to your drafts.
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
              This action cannot be undone. This will permanently delete this webpage from the database.
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
        <SeoQuickEditModal
          pageId={page.id}
          isOpen={seoOpen}
          onClose={() => setSeoOpen(false)}
          onSaved={onDataChange}
          initialData={page}
        />
      )}
    </>
  );
};

function calculateSeoStatus(seo: any) {
  if (!seo) return { label: "Bad", variant: "destructive" };

  const coreFields = [seo.metaTitle, seo.metaDesc, seo.focusKeyword, seo.ogImage].filter(Boolean);
  const coreCount = coreFields.length;

  if (coreCount <= 1) {
    return { label: "Bad", variant: "destructive" };
  }

  if (coreCount === 2 || coreCount === 3) {
    return { label: "Medium", variant: "warning" };
  }

  const titleLen = seo.metaTitle?.length || 0;
  const descLen = seo.metaDesc?.length || 0;

  if (titleLen >= 40 && titleLen <= 60 && descLen >= 120 && descLen <= 160) {
    return { label: "Good", variant: "success" };
  }

  return { label: "Needs Improvement", variant: "default" };
}

export const getWebpagesColumns = (onDataChange: () => void): ColumnDef<Page>[] => [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const title: string = row.getValue("title");
      return (
        <div className="font-bold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {title}
        </div>
      );
    },
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => <div className="text-muted-foreground font-mono">{row.getValue("slug")}</div>,
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
      const page = row.original as any;
      const status = calculateSeoStatus(page.seo);
      
      let badgeClasses = "text-xs px-2.5 py-1 rounded-sm font-semibold border";
      if (status.variant === "destructive") {
        badgeClasses += " bg-red-100 text-red-700 border-red-200";
      } else if (status.variant === "warning") {
        badgeClasses += " bg-yellow-100 text-yellow-700 border-yellow-200";
      } else if (status.variant === "success") {
        badgeClasses += " bg-green-100 text-green-700 border-green-200";
      } else {
        badgeClasses += " bg-orange-100 text-orange-700 border-orange-200"; // default: Needs Improvement
      }

      return (
        <span className={badgeClasses}>
          {status.label}
        </span>
      );
    },
  },
  {
    id: "author",
    header: "Last Edited By",
    cell: ({ row }) => {
      const page = row.original as any;
      return <div className="text-muted-foreground">{page.author?.name || "Default - Admin"}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created Date",
    cell: ({ row }) => <div className="text-muted-foreground">{formatDate(row.getValue("createdAt"))}</div>,
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => <div className="text-muted-foreground">{formatDate(row.getValue("updatedAt"))}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <ActionCell page={row.original} onDataChange={onDataChange} />
      </div>
    ),
  },
];
