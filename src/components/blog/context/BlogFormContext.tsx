"use client";

import React, { createContext, useContext } from "react";
import {
  Control,
  FieldErrors,
  UseFormSetValue,
  UseFormGetValues,
  UseFormClearErrors,
  UseFormWatch,
} from "react-hook-form";
import { BlogFormData } from "@/lib/schemas/blog/blog-validation";
import { SeoAnalysisResult, ExtractedDoc } from "@/lib/seo/blog-seo-analyzer";
import { TocItem, TocIssue } from "../blog-form-utils";

export type BlogEditorTab = "general" | "content" | "faqs" | "seo";

export interface BlogFormContextValue {
  // Form instance
  control: Control<BlogFormData>;
  errors: FieldErrors<BlogFormData>;
  setValue: UseFormSetValue<BlogFormData>;
  getValues: UseFormGetValues<BlogFormData>;
  clearErrors: UseFormClearErrors<BlogFormData>;
  watch: UseFormWatch<BlogFormData>;

  // Mode & Loading
  blogId?: string;
  isEditMode: boolean;
  isSubmitting: boolean;
  isLoading: boolean;

  // Tabs & Fullscreen
  editorTab: BlogEditorTab;
  setEditorTab: (tab: BlogEditorTab) => void;
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;

  // Draft & Dirty tracking
  isDirtyOrFilled: boolean;
  hasCloudDraft: boolean;
  loadedFromBackup: boolean;
  lastSavedAt: string | null;

  // SEO & Preview
  seoPreviewMode: "google" | "social";
  setSeoPreviewMode: (mode: "google" | "social") => void;
  editorWordCount: number | null;
  setEditorWordCount: (count: number | null) => void;
  isSeoCalculating: boolean;
  seoAnalysis: SeoAnalysisResult;
  extractedDoc: ExtractedDoc;
  readingTime: number;
  handleAutoFillMeta: () => void;

  // TOC
  tocItems: TocItem[];
  tocIssues: TocIssue[];
  handleTocClick: (item: TocItem) => void;

  // Scheduling
  scheduledAt: string | Date | null;
  handleSchedule: (date: Date) => Promise<boolean>;
  handlePublishNow: () => Promise<boolean>;
  handleCancelSchedule: () => Promise<boolean>;
  showScheduleModal: boolean;
  setShowScheduleModal: (show: boolean) => void;

  // Actions
  handleSave: (
    publishStatus: "draft" | "published" | "scheduled",
    shouldExit?: boolean,
    overrideScheduledAt?: Date | null
  ) => Promise<boolean>;
  handlePreview: () => Promise<void>;
  isPreviewSaving: boolean;
  handleDiscardDraft: () => Promise<void>;
  discarding: boolean;

  // Modals
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  showDiscardConfirm: boolean;
  setShowDiscardConfirm: (show: boolean) => void;
}

const BlogFormContext = createContext<BlogFormContextValue | null>(null);

export function BlogFormProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: BlogFormContextValue;
}) {
  return <BlogFormContext.Provider value={value}>{children}</BlogFormContext.Provider>;
}

export function useBlogForm(): BlogFormContextValue {
  const context = useContext(BlogFormContext);
  if (!context) {
    throw new Error("useBlogForm must be used within a BlogFormProvider");
  }
  return context;
}
