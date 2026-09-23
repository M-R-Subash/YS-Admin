"use client";

import React from "react";
import { DiscardDraftModal } from "@/components/editor-shell";
import { useBlogForm } from "../context/BlogFormContext";

export function DiscardDraftDialog() {
  const { showDiscardConfirm, setShowDiscardConfirm, handleDiscardDraft, discarding } =
    useBlogForm();

  return (
    <DiscardDraftModal
      open={showDiscardConfirm}
      onOpenChange={setShowDiscardConfirm}
      onCancel={() => setShowDiscardConfirm(false)}
      onConfirmDiscard={handleDiscardDraft}
      isDiscarding={discarding}
    />
  );
}

