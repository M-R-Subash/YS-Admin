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

export interface ExitConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStay?: () => void;
  onExitWithoutSave: () => void;
  onSaveAndExit?: () => void;
  isSubmitting?: boolean;
}

export function ExitConfirmModal({
  open,
  onOpenChange,
  onStay,
  onExitWithoutSave,
  onSaveAndExit,
  isSubmitting = false,
}: ExitConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have modifications that haven&apos;t been saved to your draft yet. What would you like to do before leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onStay || (() => onOpenChange(false))}>
            Stay Here
          </AlertDialogCancel>
          <button
            type="button"
            onClick={onExitWithoutSave}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md transition-all cursor-pointer"
          >
            Exit Without Saving
          </button>
          {onSaveAndExit && (
            <AlertDialogAction
              onClick={onSaveAndExit}
              disabled={isSubmitting}
              className="bg-black hover:bg-zinc-800 text-white"
            >
              {isSubmitting ? "Saving..." : "Save Draft & Exit"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
