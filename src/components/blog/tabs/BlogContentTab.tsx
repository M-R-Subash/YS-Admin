"use client";

import React from "react";
import { Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import BlogEditor from "../BlogEditor";
import { useBlogForm } from "../context/BlogFormContext";

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
