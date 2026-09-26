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

import type { UseDirtyManagerReturn } from "@/hooks/useDirtyManager";

export interface ExitConfirmModalProps {
  manager?: UseDirtyManagerReturn;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onStay?: () => void;
  onExitWithoutSave?: () => void;
  onSaveAndExit?: () => void;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
}

export function ExitConfirmModal({
  manager,
  open,
  onOpenChange,
  onStay,
  onExitWithoutSave,
  onSaveAndExit,
  isSubmitting = false,
  title = "Unsaved Changes",
  description = "You have modifications that haven't been saved yet. What would you like to do before leaving?",
}: ExitConfirmModalProps) {
  const isOpen = manager ? manager.showExitConfirm : (open ?? false);
  const handleOpenChange = manager ? manager.setShowExitConfirm : (onOpenChange ?? (() => {}));
  const handleStay = onStay || (manager ? manager.handleCancelExit : () => handleOpenChange(false));
  const handleExit = onExitWithoutSave || (manager ? manager.handleConfirmExit : () => {});

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
          <AlertDialogCancel onClick={handleStay}>
            Stay Here
          </AlertDialogCancel>
          <button
            type="button"
            onClick={handleExit}
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

export const DirtyConfirmModal = ExitConfirmModal;

