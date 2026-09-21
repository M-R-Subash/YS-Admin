"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBlogForm } from "../context/BlogFormContext";

export function ExitConfirmDialog() {
  const router = useRouter();
  const { showExitConfirm, setShowExitConfirm, handleSave, isSubmitting } = useBlogForm();

  return (
    <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have modifications that haven&apos;t been saved to your draft yet. What would you like to do before leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
          <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Stay Here</AlertDialogCancel>
          <button
            type="button"
            onClick={() => router.push("/blogs")}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md transition-all cursor-pointer"
          >
            Exit Without Saving
          </button>
          <AlertDialogAction
            onClick={() => handleSave("draft", true)}
            disabled={isSubmitting}
            className="bg-black hover:bg-zinc-800 text-white"
          >
            Save Draft &amp; Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
