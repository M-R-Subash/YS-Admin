"use client";

import React from "react";
import { ConfirmModal } from "./ConfirmModal";
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
    <ConfirmModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      variant="warning"
      title={title}
      description={description}
      cancelText="Stay Here"
      onCancel={handleStay}
      secondaryAction={{
        label: "Exit Without Saving",
        onClick: handleExit,
        disabled: isSubmitting,
      }}
      confirmText={onSaveAndExit ? "Save Draft & Exit" : undefined}
      onConfirm={onSaveAndExit}
      loading={isSubmitting}
    />
  );
}

export const DirtyConfirmModal = ExitConfirmModal;
