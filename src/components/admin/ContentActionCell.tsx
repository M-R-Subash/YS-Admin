"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MoreHorizontal } from "lucide-react";
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

export interface ContentActionItem {
  id: string;
  title: string;
  status: string;
  isTrashed?: boolean;
  slug?: string;
  [key: string]: any;
}

export interface ContentActionCellProps<T extends ContentActionItem = ContentActionItem> {
  item: T;
  itemType: string; // e.g. "blog post", "webpage"
  apiEndpoint: string; // e.g. "/api/blogs", "/api/pages"
  editUrl: string; // e.g. `/blogs/edit/${item.id}`, `/editor/${item.id}`
  previewUrl: string; // e.g. `/blogs/preview/${item.id}`, `/webpages/preview/${item.id}`
  publicUrl?: string; // e.g. `${siteUrl}/blogs/${cleanSlug}`
  publicUrlLabel?: string; // e.g. "View Live", "View Page"
  quickEditLabel?: string; // e.g. "Quick Edit", "Quick Edit (SEO)"
  renderQuickEditModal?: (props: {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
  }) => ReactNode;
  onDataChange: () => void;
  requireAdminForPermanentDelete?: boolean;
}

export function ContentActionCell<T extends ContentActionItem = ContentActionItem>({
  item,
  itemType,
  apiEndpoint,
  editUrl,
  previewUrl,
  publicUrl,
  publicUrlLabel = "View Live",
  quickEditLabel = "Quick Edit",
  renderQuickEditModal,
  onDataChange,
  requireAdminForPermanentDelete = true,
}: ContentActionCellProps<T>) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  const { modal, loading, openTrashModal, closeModal, handleConfirm } =
    useTrashManager({
      itemType,
      onSuccess: async () => {
        onDataChange();
      },
    });

  const capitalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1);

  const onModalConfirm = () => {
    handleConfirm(async (type, _, id) => {
      const endpoint = `${apiEndpoint}/${id}`;
      if (type === "trash") {
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: true, status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: `${capitalizedItemType} moved to trash`, type: "success" });
      } else if (type === "restore") {
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTrashed: false, status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: `${capitalizedItemType} restored as draft`, type: "success" });
      } else if (type === "delete") {
        const res = await fetch(endpoint, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.add({ title: `${capitalizedItemType} permanently deleted`, type: "success" });
      } else if (type === "unapprove") {
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: `${capitalizedItemType} set to draft`, type: "success" });
      } else if (type === "approve") {
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
        if (!res.ok) throw new Error();
        toast.add({ title: `${capitalizedItemType} published successfully`, type: "success" });
      }
    });
  };

  const showDelete = !requireAdminForPermanentDelete || isAdmin;
  const previewWindowName = `${itemType.toLowerCase().replace(/[^a-z0-9]/g, "_")}_preview_${item.id}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" />}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!item.isTrashed ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(editUrl)}>
                  Edit (Builder)
                </DropdownMenuItem>
                {renderQuickEditModal && (
                  <DropdownMenuItem onClick={() => setQuickEditOpen(true)}>
                    {quickEditLabel}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    window.open(previewUrl, previewWindowName);
                  }}
                >
                  Live Preview
                </DropdownMenuItem>
                {publicUrl && (
                  <DropdownMenuItem
                    onClick={() => {
                      const separator = publicUrl.includes("?") ? "&" : "?";
                      window.open(`${publicUrl}${separator}nocache=${Date.now()}`, "_blank");
                    }}
                  >
                    {publicUrlLabel}
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {item.status === "published" ? (
                  <DropdownMenuItem onClick={() => openTrashModal("unapprove", item, item.id, item.title)}>
                    Move to Draft
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => openTrashModal("approve", item, item.id, item.title)}>
                    Set as Published
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => openTrashModal("trash", item, item.id, item.title)}
                  className="text-red-500 focus:text-red-500 focus:bg-red-50"
                >
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Trash Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openTrashModal("restore", item, item.id, item.title)}>
                  Restore
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {showDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => openTrashModal("delete", item, item.id, item.title)}
                      className="text-red-500 focus:text-red-500 focus:bg-red-50"
                    >
                      Permanently Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
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
        itemType={itemType}
        loading={loading}
        onConfirm={onModalConfirm}
      />

      {quickEditOpen &&
        renderQuickEditModal?.({
          isOpen: quickEditOpen,
          onClose: () => setQuickEditOpen(false),
          onSaved: onDataChange,
        })}
    </>
  );
}

// Re-export as ActionCell for backwards compatibility if needed
export { ContentActionCell as ActionCell };
