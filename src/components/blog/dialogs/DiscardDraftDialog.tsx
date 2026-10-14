"use client";

import React from "react";
import { ConfirmModal, CONFIRM_PRESETS } from "@/components/modals/ConfirmModal";
import { useBlogForm } from "../context/BlogFormContext";

export function DiscardDraftDialog() {
  const { showDiscardConfirm, setShowDiscardConfirm, handleDiscardDraft, discarding } =
    useBlogForm();

  return (
    <ConfirmModal
      open={showDiscardConfirm}
      onOpenChange={setShowDiscardConfirm}
      {...CONFIRM_PRESETS.discardDraft}
      onCancel={() => setShowDiscardConfirm(false)}
      onConfirm={handleDiscardDraft}
      loading={discarding}
    />
  );
}