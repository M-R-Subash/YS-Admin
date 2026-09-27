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

  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const hasValidScheduleDate = Boolean(scheduleDate && !isNaN(scheduleDate.getTime()));

  // 1. Pending Overdue Schedule: target time reached/passed, awaiting scheduler execution
  const isPendingOverdue = Boolean(
    hasValidScheduleDate &&
      scheduleDate!.getTime() <= Date.now() &&
      (status === "scheduled" || hasCloudDraft || loadedFromBackup)
  );

  // 2. Upcoming Future Schedule: target time is strictly in the future
  const isUpcoming = Boolean(
    hasValidScheduleDate &&
      scheduleDate!.getTime() > Date.now() &&
      (status === "scheduled" || status === "published")
  );

  const isActivelyScheduled = isUpcoming || isPendingOverdue;
  const isPublished = status === "published";

  const publishLabel = isActivelyScheduled
    ? isDirtyOrFilled
      ? isPendingOverdue
        ? "Save to Pending Release"
        : "Save to Schedule"
      : isPendingOverdue
      ? "Update Pending Post"
      : "Update Scheduled Post"
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
          ? isPendingOverdue
            ? "This article has a pending scheduled release awaiting execution."
            : isActivelyScheduled
            ? "Manage and update your scheduled article."
            : "Make changes to your article."
          : "Write and publish a new article."
      }
      status={status}
      scheduledAt={isActivelyScheduled ? scheduledAt : null}
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
        if (isActivelyScheduled) {
          handleSave("scheduled");
        } else {
          handleSave("published");
        }
      }}
      canPublish={
        !isSubmitting &&
        (isEditMode
          ? isActivelyScheduled
            ? isDirtyOrFilled
            : status !== "published" || hasCloudDraft || loadedFromBackup || isDirtyOrFilled
          : isDirtyOrFilled)
      }
      publishLabel={publishLabel}
      onSaveDraft={() => handleSave("draft")}
      canSaveDraft={!isSubmitting && isDirtyOrFilled}
      onOpenSchedule={() => setShowScheduleModal(true)}
      onPublishNow={isActivelyScheduled ? () => handlePublishNow() : undefined}
      onCancelSchedule={isActivelyScheduled ? () => handleCancelSchedule() : undefined}
    />
  );
}

