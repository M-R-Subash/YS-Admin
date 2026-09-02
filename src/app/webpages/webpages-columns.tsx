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
import { TrashConfirmationModal } from "@/components/ui/trash-confirmation-modal";
import { useTrashManager } from "@/hooks/useTrashManager";
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
export const ActionCell = ({ page, onDataChange }: { page: Page; onDataChange: () => void }) => {
  const router = useRouter();
  const [seoOpen, setSeoOpen] = useState(false);

  const { modal, loading, openTrashModal, closeModal, handleConfirm } =
    useTrashManager({
      itemType: "webpage",
      onSuccess: async () => {
        onDataChange();
      },
    });

  const onModalConfirm = () => {
    handleConfirm(async (type, item, id) => {
      if (type === "trash") {
        const res = await fetch(`/api/pages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: true, status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Page moved to trash", type: "success" });
      } else if (type === "restore") {
        const res = await fetch(`/api/pages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: false, status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Page restored as draft", type: "success" });
      } else if (type === "delete") {
        const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.add({ title: "Page permanently deleted", type: "success" });
      } else if (type === "unapprove") {
        const res = await fetch(`/api/pages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Page set to draft", type: "success" });
      } else if (type === "approve") {
        const res = await fetch(`/api/pages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: "Page published successfully", type: "success" });
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
                <DropdownMenuItem
                  onClick={() => {
                    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ;
                    const pageSlug = page.slug === "/" ? "" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
                    window.open(`${baseUrl}${pageSlug}?nocache=${Date.now()}`, "_blank");
                  }}
                >
                  View Page
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {page.status === "published" ? (
                  <DropdownMenuItem onClick={() => openTrashModal("unapprove", page, page.id, page.title)}>
                    Move to Draft
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => openTrashModal("approve", page, page.id, page.title)}>
                    Set as Published
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => openTrashModal("trash", page, page.id, page.title)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Trash Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openTrashModal("restore", page, page.id, page.title)}>
                  Restore
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => openTrashModal("delete", page, page.id, page.title)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                  Permanently Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Centralized Trash & Action Confirmation Modal */}
      <TrashConfirmationModal
        open={modal.isOpen}
        onOpenChange={(open) => !open && closeModal()}
        type={modal.type}
        itemName={modal.targetName}
        itemType="webpage"
        loading={loading}
        onConfirm={onModalConfirm}
      />

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
