import React from "react";
import { ConfirmModal, CONFIRM_PRESETS } from "./ConfirmModal";

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
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      {...CONFIRM_PRESETS.discardDraft}
      onCancel={onCancel}
      onConfirm={onConfirmDiscard}
      loading={isDiscarding}
    />
  );
}
