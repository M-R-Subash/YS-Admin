"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react";

interface RestoreConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  versionNumber?: number;
  dateStr?: string;
  authorName?: string | null;
  isRestoring?: boolean;
}

export function RestoreConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  versionNumber,
  dateStr,
  authorName,
  isRestoring = false,
}: RestoreConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold">
                Restore Version {versionNumber ?? ""}?
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dateStr ? `Saved on ${dateStr}` : ""}
                {authorName ? ` by ${authorName}` : ""}
              </p>
            </div>
          </div>

          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-2 space-y-2">
            <span>
              This action will hydrate your editor with the exact content and metadata from this snapshot.
            </span>
            <span className="block p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Any uncommitted draft changes currently in your editor will be replaced. Restoring does <strong>not</strong> publish immediately; you can review all changes before saving.
              </span>
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isRestoring}
            className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 font-medium text-xs flex items-center gap-1.5"
          >
            {isRestoring ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Restore to Editor
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
