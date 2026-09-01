"use client";

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

export type TrashActionType = "trash" | "restore" | "delete" | "approve" | "unapprove" | "reply";

interface TrashConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TrashActionType | null;
  itemName?: string;
  itemType?: string;
  customTitle?: string;
  customDescription?: string;
  customConfirmText?: string;
  customActionClass?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function TrashConfirmationModal({
  open,
  onOpenChange,
  type,
  itemName = "item",
  itemType = "item",
  customTitle,
  customDescription,
  customConfirmText,
  customActionClass,
  onConfirm,
  loading = false,
}: TrashConfirmationModalProps) {
  if (!type) return null;

  const getConfig = () => {
    if (customTitle && customDescription && customConfirmText) {
      return {
        title: customTitle,
        description: customDescription,
        confirmText: customConfirmText,
        actionClass: customActionClass || "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black",
      };
    }

    const nameDisplay = itemName ? `"${itemName}"` : `this ${itemType}`;

    switch (type) {
      case "trash":
        return {
          title: `Move ${itemType} to Trash?`,
          description: `Are you sure you want to move ${nameDisplay} to Trash? You can restore it anytime from the Trash tab.`,
          confirmText: "Move to Trash",
          actionClass: "bg-red-500 hover:bg-red-600 text-white font-bold",
        };
      case "restore":
        return {
          title: `Restore ${itemType}?`,
          description: `Restore ${nameDisplay} back to active items?`,
          confirmText: "Restore Item",
          actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-bold",
        };
      case "delete":
        return {
          title: `Permanently Delete ${itemType}?`,
          description: `Are you sure you want to permanently delete ${nameDisplay}? This action CANNOT be undone.`,
          confirmText: "Delete Permanently",
          actionClass: "bg-red-600 hover:bg-red-700 text-white font-bold",
        };
      case "approve":
        return {
          title: `Approve ${itemType}?`,
          description: `Approve ${nameDisplay}? It will immediately be published live.`,
          confirmText: "Approve & Publish",
          actionClass: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold",
        };
      case "unapprove":
        return {
          title: `Mark ${itemType} as Pending?`,
          description: `Unapprove ${nameDisplay}? It will be hidden from public view.`,
          confirmText: "Mark Pending",
          actionClass: "bg-amber-600 hover:bg-amber-700 text-white font-bold",
        };
      case "reply":
        return {
          title: `Publish Reply to ${itemType}?`,
          description: `Publish official admin response to ${nameDisplay}?`,
          confirmText: "Publish Reply",
          actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-bold",
        };
      default:
        return {
          title: "Confirm Action",
          description: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          actionClass: "bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-bold",
        };
    }
  };

  const config = getConfig();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} className="h-auto px-5 py-2.5 text-xs font-semibold cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={`h-auto px-5 py-2.5 text-xs cursor-pointer ${config.actionClass}`}
          >
            {loading ? "Processing..." : config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
