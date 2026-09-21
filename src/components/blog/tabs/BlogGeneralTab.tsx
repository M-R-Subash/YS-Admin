"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { EditorRenderer } from "@/components/EditorRenderer";
import {
  blogGeneralLeftUiSchema,
  blogGeneralRightUiSchema,
} from "@/lib/schemas/blog/blog-ui-schema";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogGeneralTab() {
  const { control, editorTab } = useBlogForm();

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-card rounded-xl border border-border ${
        editorTab === "general" ? "block" : "hidden"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto space-y-5">
        <div>
          <h2 className="text-base font-bold text-foreground">General Article Information</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the core details, featured cover image, taxonomy, and reader interaction settings for this post.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Title, Excerpt, Categories, Tags, Comments */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs">
            <EditorRenderer schema={blogGeneralLeftUiSchema} control={control} />
          </div>

          {/* Right Column: Featured Cover Image & Guidelines */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
            <EditorRenderer schema={blogGeneralRightUiSchema} control={control} />
            <div className="rounded-lg bg-muted/30 border border-border/60 p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Cover Image Guidelines
              </p>
              <p className="text-[11px] leading-relaxed">
                Recommended dimensions: <strong>1200 &times; 630 px</strong> (1.91:1 ratio). This visual serves as your article&apos;s header banner and defaults as the social share preview card on Twitter, LinkedIn, and messaging apps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
