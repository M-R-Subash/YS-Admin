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
import { useBlogForm } from "../context/BlogFormContext";

export function DiscardDraftDialog() {
  const { showDiscardConfirm, setShowDiscardConfirm, handleDiscardDraft, discarding } = useBlogForm();

  return (
    <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard Draft Changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the current draft changes and restore the editor to the live published version. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDiscardDraft}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {discarding ? "Discarding..." : "Discard Draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
