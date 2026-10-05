"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  FolderTree,
  Check,
  Plus,
  Search,
  X,
  ChevronDown,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
}

interface CategorySelectProps {
  value: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function CategorySelect({
  value = [],
  onChange,
  disabled = false,
  className = "",
  error,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: categories = [], mutate } = useSWR<CategoryData[]>("/api/categories");

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const exactMatchExists = useMemo(() => {
    const q = search.toLowerCase().trim();
    return categories.some((c) => c.name.toLowerCase() === q);
  }, [categories, search]);

  const toggleCategory = (catName: string) => {
    if (disabled) return;
    if (value.includes(catName)) {
      onChange(value.filter((c) => c !== catName));
    } else {
      onChange([...value, catName]);
    }
  };

  const removeCategory = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(value.filter((c) => c !== catName));
  };

  const handleCreateCategory = async () => {
    const trimmed = search.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      toast.add({
        title: "Category Created",
        description: `"${data.name}" was created and selected.`,
        type: "success",
      });

      mutate();
      if (!value.includes(data.name)) {
        onChange([...value, data.name]);
      }
      setSearch("");
    } catch (err: any) {
      toast.add({
        title: "Creation Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-xs transition-colors hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer",
            error && "border-red-500 focus:ring-red-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
            {value.length === 0 ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <FolderTree className="size-3.5" />
                Select article categories...
              </span>
            ) : (
              value.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-sm bg-primary/10 text-primary border border-primary/20"
                >
                  <FolderTree className="size-3 shrink-0" />
                  <span>{cat}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => removeCategory(cat, e)}
                      className="text-primary/70 hover:text-primary transition-colors cursor-pointer rounded-xs p-0.5"
                    >
                      <X className="size-2.5" />
                    </button>
                  )}
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-80 p-2.5 bg-popover border border-border shadow-md rounded-lg space-y-2 z-50"
        >
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search or add category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-full bg-background"
              autoFocus
            />
          </div>

          {/* Inline Create Option if search does not match any category */}
          {search.trim() && !exactMatchExists && (
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={isCreating}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer text-left"
            >
              {isCreating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5 shrink-0" />
              )}
              <span>Create category &ldquo;{search.trim()}&rdquo;</span>
            </button>
          )}

          {/* Categories List */}
          <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {filteredCategories.length === 0 && !search.trim() ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No categories available yet.
              </p>
            ) : filteredCategories.length === 0 && search.trim() ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No matching category found.
              </p>
            ) : (
              filteredCategories.map((category) => {
                const isSelected = value.includes(category.name);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-primary/15 text-primary font-semibold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={cn(
                          "size-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background"
                        )}
                      >
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{category.name}</span>
                    </div>

                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {category.postCount} {category.postCount === 1 ? "post" : "posts"}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with Manage Link */}
          <div className="border-t pt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>{value.length} selected</span>
            <Link
              href="/categories"
              target="_blank"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors font-medium"
            >
              <span>Manage all</span>
              <ExternalLink className="size-2.5" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
