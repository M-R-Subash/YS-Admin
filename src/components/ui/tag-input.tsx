"use client";

import React, { useState, KeyboardEvent, ClipboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add tag...",
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pasteText = e.clipboardData.getData("text");
    const tagsToAdd = pasteText
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newTags = [...value];
    tagsToAdd.forEach((t) => {
      if (!newTags.includes(t)) {
        newTags.push(t);
      }
    });
    onChange(newTags);
    setInputValue("");
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {value.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant="secondary"
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-sm bg-secondary text-secondary-foreground"
        >
          <span>{tag}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-xs p-0.5"
              title={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Badge>
      ))}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
          }
        }}
        placeholder={value.length === 0 ? placeholder : "Add more..."}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-w-[100px] h-6 py-0"
      />
    </div>
  );
}
