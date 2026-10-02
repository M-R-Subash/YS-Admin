"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  MoreHorizontal,
  PenTool,
  SlidersHorizontal,
  ExternalLink,
  Globe,
  Undo2,
  Play,
  Trash2,
  RotateCcw,
} from "lucide-react";
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
import { TrashConfirmationModal } from "@/components/global-modal";
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
  extraMenuItems?: ReactNode;
  showQuickViewLive?: boolean;
}

export function ContentActionCell<T extends ContentActionItem = ContentActionItem>({
  item,
  itemType,
  apiEndpoint,
  editUrl,
  previewUrl,
  publicUrl,
  publicUrlLabel = "View Live",
  showQuickViewLive = true,
  quickEditLabel = "Quick Edit",
  renderQuickEditModal,
  onDataChange,
  requireAdminForPermanentDelete = true,
  extraMenuItems,
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
        const isScheduled = item.status === "scheduled";
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "draft",
            ...(isScheduled ? { action: "cancel-schedule" } : {}),
          }),
        });
        if (!res.ok) throw new Error();
        toast.add({
          title: isScheduled
            ? `${capitalizedItemType} schedule cancelled (reverted to draft)`
            : `${capitalizedItemType} set to draft`,
          type: "success",
        });
      } else if (type === "approve") {
        const isScheduled = item.status === "scheduled";
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "published",
            ...(isScheduled ? { action: "publish-now" } : {}),
          }),
        });
        if (!res.ok) throw new Error();
        toast.add({
          title: isScheduled
            ? `${capitalizedItemType} published immediately`
            : `${capitalizedItemType} published successfully`,
          type: "success",
        });
      }
    });
  };

  const showDelete = !requireAdminForPermanentDelete || isAdmin;
  const previewWindowName = `${itemType.toLowerCase().replace(/[^a-z0-9]/g, "_")}_preview_${item.id}`;

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {showQuickViewLive && publicUrl && item.status === "published" && !item.isTrashed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const separator = publicUrl.includes("?") ? "&" : "?";
              window.open(`${publicUrl}${separator}nocache=${Date.now()}`, "_blank");
            }}
            className="h-7 px-2.5 text-[11px] font-semibold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer hidden sm:inline-flex"
          >
            <Globe className="w-3 h-3" />
            <span>{publicUrlLabel}</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48 text-xs">
            {!item.isTrashed ? (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push(editUrl)} className="cursor-pointer">
                    <PenTool className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <span>Edit (Builder)</span>
                  </DropdownMenuItem>
                  {renderQuickEditModal && (
                    <DropdownMenuItem onClick={() => setQuickEditOpen(true)} className="cursor-pointer">
                      <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <span>{quickEditLabel}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      window.open(previewUrl, previewWindowName);
                    }}
                    className="cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <span>Live Preview</span>
                  </DropdownMenuItem>
                  {publicUrl && (
                    <DropdownMenuItem
                      onClick={() => {
                        const separator = publicUrl.includes("?") ? "&" : "?";
                        window.open(`${publicUrl}${separator}nocache=${Date.now()}`, "_blank");
                      }}
                      className="cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <span>{publicUrlLabel}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {item.status === "published" ? (
                    <DropdownMenuItem
                      onClick={() => openTrashModal("unapprove", item, item.id, item.title)}
                      className="cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <span>Move to Draft</span>
                    </DropdownMenuItem>
                  ) : item.status === "scheduled" ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => openTrashModal("approve", item, item.id, item.title)}
                        className="cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 mr-2 text-emerald-600 fill-current" />
                        <span>Publish Immediately</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openTrashModal("unapprove", item, item.id, item.title)}
                        className="cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5 mr-2 text-amber-600" />
                        <span>Cancel Schedule (Draft)</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => openTrashModal("approve", item, item.id, item.title)}
                      className="cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 mr-2 text-emerald-600 fill-current" />
                      <span>Set as Published</span>
                    </DropdownMenuItem>
                  )}
                  {extraMenuItems}
                  <DropdownMenuItem
                    onClick={() => openTrashModal("trash", item, item.id, item.title)}
                    className="text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
                    <span>Move to Trash</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Trash Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => openTrashModal("restore", item, item.id, item.title)}
                    className="cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                    <span>Restore</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {showDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => openTrashModal("delete", item, item.id, item.title)}
                        className="text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
                        <span>Permanently Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
