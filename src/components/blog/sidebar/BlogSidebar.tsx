"use client";

import React from "react";
import { useBlogForm } from "../context/BlogFormContext";
import { BlogTableOfContents } from "./BlogTableOfContents";
import { BlogArticleInsights } from "./BlogArticleInsights";

export function BlogSidebar() {
  const { editorTab } = useBlogForm();

  if (editorTab !== "content") {
    return null;
  }

  return (
    <div className="hidden lg:flex shrink-0 h-full lg:w-72 xl:w-80 flex-col gap-4 min-h-0">
      <BlogTableOfContents />
      <BlogArticleInsights />
    </div>
  );
}
