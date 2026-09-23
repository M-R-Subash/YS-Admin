"use client";

import React from "react";
import { EditorDraftBanner } from "@/components/editor-shell";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogDraftBanner() {
  const { hasCloudDraft, loadedFromBackup, lastSavedAt, setShowDiscardConfirm, discarding } =
    useBlogForm();

  return (
    <EditorDraftBanner
      hasDraft={hasCloudDraft || loadedFromBackup}
      lastSavedAt={lastSavedAt}
      onDiscard={() => setShowDiscardConfirm(true)}
      isDiscarding={discarding}
    />
  );
}

