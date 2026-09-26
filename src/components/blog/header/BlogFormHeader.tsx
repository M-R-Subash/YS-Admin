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
    setShowScheduleModal,
    handlePublishNow,
    handleCancelSchedule,
    watch,
  } = useBlogForm();

  const status = watch("status");
  const scheduledAt = watch("scheduledAt");

  const isScheduled = status === "scheduled";
  const isPublished = status === "published";

  const publishLabel = isScheduled
    ? isDirtyOrFilled
      ? "Save Schedule"
      : "Update Schedule"
    : isPublished
    ? hasCloudDraft || loadedFromBackup
      ? "Publish"
      : "Update"
    : "Publish";

  return (
    <EditorTopBar
      title={isEditMode ? "Edit Blog Post" : "Create Blog Post"}
      subtitle={
        isEditMode
          ? isScheduled
            ? "Manage and update your scheduled article."
            : "Make changes to your article."
          : "Write and publish a new article."
      }
      status={status}
      scheduledAt={scheduledAt}
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
      onPublish={() => {
        if (isScheduled) {
          handleSave("scheduled");
        } else {
          handleSave("published");
        }
      }}
      canPublish={
        !isSubmitting &&
        (isEditMode
          ? status !== "published" || hasCloudDraft || loadedFromBackup || isDirtyOrFilled
          : isDirtyOrFilled)
      }
      publishLabel={publishLabel}
      onSaveDraft={() => handleSave("draft")}
      canSaveDraft={!isSubmitting && isDirtyOrFilled}
      onOpenSchedule={() => setShowScheduleModal(true)}
      onPublishNow={isScheduled ? () => handlePublishNow() : undefined}
      onCancelSchedule={isScheduled ? () => handleCancelSchedule() : undefined}
    />
  );
}

