"use client";

import React from "react";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { RotateCcw, AlertTriangle } from "lucide-react";

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
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      variant="warning"
      icon={<RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
      title={`Restore Version ${versionNumber ?? ""}?`}
      description={
        <div className="space-y-2 mt-1">
          {dateStr && (
            <p className="text-xs text-muted-foreground">
              Saved on {dateStr}
              {authorName ? ` by ${authorName}` : ""}
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            This action will hydrate your editor with the exact content and metadata from this snapshot.
          </p>
          <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Any uncommitted draft changes currently in your editor will be replaced. Restoring does <strong>not</strong> publish immediately; you can review all changes before saving.
            </span>
          </div>
        </div>
      }
      confirmText="Restore to Editor"
      loading={isRestoring}
      onConfirm={onConfirm}
    />
  );
}
