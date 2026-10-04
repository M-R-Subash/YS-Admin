"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { useBlogForm } from "../context/BlogFormContext";

const FaqManager = dynamic(() => import("@/components/faq/FaqManager"), {
  ssr: false,
});

export function BlogFaqsTab() {
  const { editorTab, errors, control, clearErrors } = useBlogForm();

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar p-1.5 sm:p-4 md:p-5 bg-card rounded-lg sm:rounded-xl border border-border ${
        editorTab === "faqs" ? "block" : "hidden"
      }`}
    >
      {errors.faqs && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {typeof errors.faqs?.message === "string"
              ? errors.faqs.message
              : "Both Question and Answer are required for each FAQ item"}
          </span>
        </div>
      )}
      <Controller
        name="faqs"
        control={control}
        render={({ field }) => (
          <FaqManager
            value={field.value || []}
            onChange={(val) => {
              field.onChange(val);
              if (errors.faqs) clearErrors("faqs");
            }}
            title="Blog Post Frequently Asked Questions"
            description="Add FAQ items to appear at the end of this blog post. If empty, the FAQ section will not render on the public blog."
          />
        )}
      />
    </div>
  );
}
