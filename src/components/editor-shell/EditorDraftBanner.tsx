"use client";

import React from "react";
import { X } from "lucide-react";

export interface EditorDraftBannerProps {
  hasDraft: boolean;
  lastSavedAt?: string | null;
  onDiscard: () => void;
  isDiscarding?: boolean;
  className?: string;
}

export function EditorDraftBanner({
  hasDraft,
  lastSavedAt,
  onDiscard,
  isDiscarding = false,
  className = "",
}: EditorDraftBannerProps) {
  if (!hasDraft) return null;

  return (
    <div
      className={`flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <p className="text-xs font-semibold text-amber-900">
          {lastSavedAt
            ? `You're editing an unpublished draft from ${lastSavedAt}. Changes won't go live until you publish.`
            : `You're editing an unpublished draft. Changes won't go live until you publish.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onDiscard}
        disabled={isDiscarding}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold bg-amber-100 hover:bg-red-100 text-amber-900 hover:text-red-700 border border-amber-300 hover:border-red-300 transition-all cursor-pointer shrink-0 shadow-xs disabled:opacity-50"
        title="Discard draft and revert to live published version"
      >
        <X className="w-3 h-3" strokeWidth={2.5} />
        <span>{isDiscarding ? "Discarding..." : "Discard Draft"}</span>
      </button>
    </div>
  );
}
