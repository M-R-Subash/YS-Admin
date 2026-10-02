"use client";

import React from "react";
import { ConfirmModal } from "./ConfirmModal";

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
      variant="danger"
      title="Discard Draft Changes?"
      description="This will permanently delete the current cloud draft and restore the editor to the live published version. This action cannot be undone."
      cancelText="Cancel"
      confirmText="Discard Draft"
      onCancel={onCancel}
      onConfirm={onConfirmDiscard}
      loading={isDiscarding}
    />
  );
}
