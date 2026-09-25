"use client";

import React from "react";
import { useBlogForm } from "../context/BlogFormContext";
import { SeoEditorSuite, SeoEditorSuiteValues } from "@/components/seo/SeoEditorSuite";

export function BlogSeoTab() {
  const {
    editorTab,
    watch,
    setValue,
    errors,
    handleAutoFillMeta,
  } = useBlogForm();

  if (editorTab !== "seo") return null;

  const title = watch("title") || "";
  const slug = watch("slug") || "";
  const content = watch("content");
  const featuredImage = watch("featuredImage") || "";
  const metaTitle = watch("metaTitle") || "";
  const metaDesc = watch("metaDesc") || "";
  const focusKeyword = watch("focusKeyword") || "";
  const ogTitle = watch("ogTitle") || "";
  const ogDesc = watch("ogDesc") || "";
  const ogImage = watch("ogImage") || "";
  const canonicalUrl = watch("canonicalUrl") || "";
  const structuredData = (watch as any)("structuredData") || null;
  const noIndex = Boolean(watch("noIndex"));
  const authorName = (watch as any)("authorName") || "";
  const authorRole = (watch as any)("authorRole") || "";
  const authorDescription = (watch as any)("authorDescription") || "";

  const values: SeoEditorSuiteValues = {
    title,
    slug,
    featuredImage,
    metaTitle,
    metaDesc,
    focusKeyword,
    ogTitle,
    ogDesc,
    ogImage,
    canonicalUrl,
    structuredData,
    noIndex,
    authorName,
    authorRole,
    authorDescription,
  };

  const handleChange = (field: string, value: any) => {
    setValue(field as any, value, { shouldDirty: true, shouldValidate: true });
  };

  // Convert RHF errors to Record<string, string | undefined>
  const formattedErrors: Record<string, string | undefined> = {};
  if (errors) {
    Object.entries(errors).forEach(([key, val]) => {
      if (val && typeof val === "object" && "message" in val && typeof (val as any).message === "string") {
        formattedErrors[key] = (val as any).message;
      }
    });
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-card rounded-xl border border-border">
      <SeoEditorSuite
        values={values}
        onChange={handleChange}
        entityType="blog"
        content={content}
        slugPrefix="/blogs"
        onAutoFillMeta={handleAutoFillMeta}
        errors={formattedErrors}
      />
    </div>
  );
}
