"use client";

import React from "react";
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

export interface DiscardDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
  onConfirmDiscard: () => void;
  isDiscarding?: boolean;
}

export function DiscardDraftModal({
  open,
  onOpenChange,
  onCancel,
  onConfirmDiscard,
  isDiscarding = false,
}: DiscardDraftModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard Draft Changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the current cloud draft and restore the
            editor to the live published version. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel || (() => onOpenChange(false))}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDiscard}
            disabled={isDiscarding}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDiscarding ? "Discarding..." : "Discard Draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
