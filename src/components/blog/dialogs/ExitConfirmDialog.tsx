"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ExitConfirmModal } from "@/components/editor-shell";
import { useBlogForm } from "../context/BlogFormContext";

export function ExitConfirmDialog() {
  const router = useRouter();
  const { showExitConfirm, setShowExitConfirm, handleSave, isSubmitting } = useBlogForm();

  return (
    <ExitConfirmModal
      open={showExitConfirm}
      onOpenChange={setShowExitConfirm}
      onStay={() => setShowExitConfirm(false)}
      onExitWithoutSave={() => router.push("/blogs")}
      onSaveAndExit={() => handleSave("draft", true)}
      isSubmitting={isSubmitting}
    />
  );
}

