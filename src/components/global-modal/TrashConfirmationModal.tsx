"use client";

import React from "react";
import { ConfirmModal, ConfirmVariant } from "./ConfirmModal";

export type TrashActionType = "trash" | "restore" | "delete" | "approve" | "unapprove" | "reply";

export interface TrashConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TrashActionType | null;
  itemName?: string;
  itemType?: string;
  customTitle?: string;
  customDescription?: string;
  customConfirmText?: string;
  customActionClass?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function TrashConfirmationModal({
  open,
  onOpenChange,
  type,
  itemName = "item",
  itemType = "item",
  customTitle,
  customDescription,
  customConfirmText,
  onConfirm,
  loading = false,
}: TrashConfirmationModalProps) {
  if (!type) return null;

  const getConfig = (): {
    title: string;
    description: string;
    confirmText: string;
    variant: ConfirmVariant;
  } => {
    if (customTitle && customDescription && customConfirmText) {
      return {
        title: customTitle,
        description: customDescription,
        confirmText: customConfirmText,
        variant: "danger",
      };
    }

    const nameDisplay = itemName ? `"${itemName}"` : `this ${itemType}`;

    switch (type) {
      case "trash":
        return {
          title: `Move ${itemType} to Trash?`,
          description: `Are you sure you want to move ${nameDisplay} to Trash? You can restore it anytime from the Trash tab.`,
          confirmText: "Move to Trash",
          variant: "danger",
        };
      case "restore":
        return {
          title: `Restore ${itemType}?`,
          description: `Restore ${nameDisplay} back to active items?`,
          confirmText: "Restore Item",
          variant: "neutral",
        };
      case "delete":
        return {
          title: `Permanently Delete ${itemType}?`,
          description: `Are you sure you want to permanently delete ${nameDisplay}? This action CANNOT be undone.`,
          confirmText: "Delete Permanently",
          variant: "danger",
        };
      case "approve":
        return {
          title: `Approve ${itemType}?`,
          description: `Approve ${nameDisplay}? It will immediately be published live.`,
          confirmText: "Approve & Publish",
          variant: "success",
        };
      case "unapprove":
        return {
          title: `Mark ${itemType} as Pending?`,
          description: `Unapprove ${nameDisplay}? It will be hidden from public view.`,
          confirmText: "Mark Pending",
          variant: "warning",
        };
      case "reply":
        return {
          title: `Publish Reply to ${itemType}?`,
          description: `Publish official admin response to ${nameDisplay}?`,
          confirmText: "Publish Reply",
          variant: "neutral",
        };
      default:
        return {
          title: "Confirm Action",
          description: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          variant: "neutral",
        };
    }
  };

  const config = getConfig();

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={config.title}
      description={config.description}
      confirmText={config.confirmText}
      variant={config.variant}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
