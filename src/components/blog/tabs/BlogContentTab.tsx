"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlogForm } from "../context/BlogFormContext";

const BlogEditor = dynamic(() => import("../BlogEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col gap-4 p-6 bg-card rounded-xl border border-border">
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
      <Skeleton className="h-32 w-full rounded-md" />
    </div>
  ),
});

export function BlogContentTab() {
  const { editorTab, errors, control, clearErrors, setEditorWordCount } = useBlogForm();

  return (
    <div
      className={`flex-1 overflow-hidden h-full ${
        editorTab === "content" ? "flex flex-col" : "hidden"
      }`}
    >
      {errors.content && (
        <div className="mb-3 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {typeof errors.content?.message === "string"
              ? errors.content.message
              : "Article content cannot be empty"}
          </span>
        </div>
      )}
      <Controller
        name="content"
        control={control}
        render={({ field }) => (
          <BlogEditor
            initialContent={field.value}
            onChange={(val) => {
              field.onChange(val);
              if (errors.content) clearErrors("content");
            }}
            onWordCountChange={setEditorWordCount}
          />
        )}
      />
    </div>
  );
}
