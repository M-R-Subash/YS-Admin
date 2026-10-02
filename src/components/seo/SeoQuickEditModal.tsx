"use client";

import React from "react";
import { UniversalSeoModal } from "./UniversalSeoModal";

export interface SeoQuickEditModalProps {
  pageId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialData: any; // { title, slug, seo: { ... } }
}

export function SeoQuickEditModal({
  pageId,
  isOpen,
  onClose,
  onSaved,
  initialData,
}: SeoQuickEditModalProps) {
  return (
    <UniversalSeoModal
      entityId={pageId}
      entityType="page"
      isOpen={isOpen}
      onClose={onClose}
      onSaved={onSaved}
      initialData={initialData}
    />
  );
}
