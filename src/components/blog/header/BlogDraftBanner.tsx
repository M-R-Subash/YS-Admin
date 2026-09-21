"use client";

import React from "react";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogDraftBanner() {
  const { hasCloudDraft, loadedFromBackup, lastSavedAt, setShowDiscardConfirm } = useBlogForm();

  if (!hasCloudDraft && !loadedFromBackup) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <p className="text-xs font-semibold text-amber-900">
          {lastSavedAt
            ? `You're editing an unpublished draft from ${lastSavedAt}. Changes won't go live until you publish.`
            : `You're editing an unpublished draft. Changes won't go live until you publish.`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDiscardConfirm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold bg-amber-100 hover:bg-red-100 text-amber-900 hover:text-red-700 border border-amber-300 hover:border-red-300 transition-all cursor-pointer shrink-0 shadow-xs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          Discard Draft
        </button>
      </div>
    </div>
  );
}
