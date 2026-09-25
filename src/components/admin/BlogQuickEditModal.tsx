"use client";

import React from "react";
import { UniversalSeoModal } from "./UniversalSeoModal";

export interface BlogQuickEditModalProps {
  blogId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialData: any; // { title, slug, allowComments, featuredImage, authorId, seo: { ... } }
}

export function BlogQuickEditModal({
  blogId,
  isOpen,
  onClose,
  onSaved,
  initialData,
}: BlogQuickEditModalProps) {
  return (
    <UniversalSeoModal
      entityId={blogId}
      entityType="blog"
      isOpen={isOpen}
      onClose={onClose}
      onSaved={onSaved}
      initialData={initialData}
    />
  );
}
