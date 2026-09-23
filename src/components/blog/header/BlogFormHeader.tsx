"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { EditorTopBar } from "@/components/editor-shell";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogFormHeader() {
  const router = useRouter();
  const {
    isEditMode,
    isSubmitting,
    isDirtyOrFilled,
    hasCloudDraft,
    loadedFromBackup,
    lastSavedAt,
    isFullscreen,
    setIsFullscreen,
    handleSave,
    handlePreview,
    isPreviewSaving,
    setShowExitConfirm,
    watch,
  } = useBlogForm();

  const status = watch("status");

  return (
    <EditorTopBar
      title={isEditMode ? "Edit Blog Post" : "Create Blog Post"}
      subtitle={
        isEditMode
          ? "Make changes to your article."
          : "Write and publish a new article."
      }
      status={status}
      isEditMode={isEditMode}
      hasCloudDraft={hasCloudDraft}
      loadedFromBackup={loadedFromBackup}
      isDirty={isDirtyOrFilled}
      lastSavedAt={lastSavedAt}
      isSavingDraft={isSubmitting}
      isPublishing={isSubmitting}
      onBack={() => {
        if (isDirtyOrFilled) {
          setShowExitConfirm(true);
        } else {
          router.push("/blogs");
        }
      }}
      backTitle="Back to Blogs"
      onPreview={handlePreview}
      isPreviewSaving={isPreviewSaving}
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
      onPublish={() => handleSave("published")}
      canPublish={
        !isSubmitting &&
        (isEditMode
          ? status !== "published" || hasCloudDraft || loadedFromBackup || isDirtyOrFilled
          : isDirtyOrFilled)
      }
      publishLabel={
        isEditMode && status === "published"
          ? hasCloudDraft || loadedFromBackup
            ? "Publish"
            : "Update"
          : "Publish"
      }
      onSaveDraft={() => handleSave("draft")}
      canSaveDraft={!isSubmitting && isDirtyOrFilled}
    />
  );
}

