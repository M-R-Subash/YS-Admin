"use client";

import React, { useState, useEffect, useRef, KeyboardEvent, ClipboardEvent } from "react";
import useSWR from "swr";
import { Hash, X, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagData {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

interface TagAutocompleteInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TagAutocompleteInput({
  value = [],
  onChange,
  placeholder = "Type tag and press Enter...",
  className,
  disabled = false,
}: TagAutocompleteInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search query for SWR
  const trimmedInput = inputValue.trim();
  const searchUrl = trimmedInput
    ? `/api/tags?search=${encodeURIComponent(trimmedInput)}&limit=10`
    : null;

  const { data: suggestions = [], isLoading } = useSWR<TagData[]>(searchUrl);

  // Keep all suggestions so user can see tags like "Productivity" even if already selected
  const availableSuggestions = suggestions;

  const exactMatchExists = suggestions.some(
    (s) => s.name.toLowerCase() === trimmedInput.toLowerCase()
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tagName: string) => {
    const clean = tagName.trim();
    if (!clean) return;

    // Use canonical casing if matching suggestion exists
    const matchedSuggestion = suggestions.find(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );
    const finalName = matchedSuggestion ? matchedSuggestion.name : clean;

    // Prevent duplicate entries case-insensitively
    const alreadySelected = value.some(
      (v) => v.toLowerCase() === finalName.toLowerCase()
    );

    if (!alreadySelected) {
      onChange([...value, finalName]);
    }
    setInputValue("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (showDropdown && availableSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < availableSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : availableSuggestions.length - 1
        );
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < availableSuggestions.length) {
        e.preventDefault();
        addTag(availableSuggestions[highlightedIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (trimmedInput) {
        addTag(trimmedInput);
      }
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
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs transition-colors focus-within:border-foreground/50 cursor-text",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {value.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-sm bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
          >
            <Hash className="size-2.5 text-purple-500 shrink-0" />
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="text-purple-600/70 hover:text-purple-800 dark:hover:text-purple-200 transition-colors cursor-pointer rounded-xs p-0.5"
                title={`Remove ${tag}`}
              >
                <X className="size-2.5" />
              </button>
            )}
          </Badge>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (trimmedInput) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={value.length === 0 ? placeholder : "Add more tags..."}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground"
        />

        {isLoading && (
          <Loader2 className="size-3 text-muted-foreground animate-spin shrink-0 ml-auto" />
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {showDropdown && trimmedInput.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border shadow-md rounded-lg overflow-hidden py-1 max-h-56 overflow-y-auto custom-scrollbar">
          {availableSuggestions.map((item, index) => {
            const isHighlighted = highlightedIndex === index;
            const isAlreadyAdded = value.some(
              (v) => v.toLowerCase() === item.name.toLowerCase()
            );
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => addTag(item.name)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-xs text-left cursor-pointer transition-colors",
                  isHighlighted
                    ? "bg-purple-500/15 text-purple-900 dark:text-purple-100 font-semibold"
                    : "hover:bg-muted text-foreground",
                  isAlreadyAdded && "opacity-80"
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Hash className="size-3 text-purple-500 shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {isAlreadyAdded && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      (already added)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                  {item.postCount} {item.postCount === 1 ? "article" : "articles"}
                </span>
              </button>
            );
          })}

          {/* Option to create brand new tag if exact match is not in available suggestions */}
          {!exactMatchExists && (
            <button
              type="button"
              onClick={() => addTag(trimmedInput)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-left text-primary hover:bg-primary/10 font-semibold transition-colors cursor-pointer border-t border-border/50"
            >
              <Plus className="size-3" />
              <span>Create new tag &ldquo;{trimmedInput}&rdquo;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
