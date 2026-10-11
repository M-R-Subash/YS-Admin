"use client";

import React, { useState } from "react";
import { Tag as TagIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { slugify } from "@/lib/slugify";

interface TagCreateFormProps {
  totalTagCount: number;
  onSuccess: () => void;
}

export const TagCreateForm = React.memo(function TagCreateForm({
  totalTagCount,
  onSuccess,
}: TagCreateFormProps) {
  const [tagName, setTagName] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [tagSlugManual, setTagSlugManual] = useState(false);
  const [tagDesc, setTagDesc] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const handleTagNameChange = (val: string) => {
    setTagName(val);
    if (!tagSlugManual) {
      setTagSlug(slugify(val));
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tagName.trim();
    if (!cleanName) {
      toast.add({ title: "Tag name is required", type: "error" });
      return;
    }

    setIsCreatingTag(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          slug: tagSlug.trim() || slugify(cleanName),
          description: tagDesc.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create tag");
      }

      toast.add({
        title: "Tag Created",
        description: `Tag "${data.name}" was created successfully.`,
        type: "success",
      });

      setTagName("");
      setTagSlug("");
      setTagSlugManual(false);
      setTagDesc("");
      onSuccess();
    } catch (err: any) {
      toast.add({
        title: "Creation Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  return (
    <div className="w-full lg:w-95 shrink-0 bg-card border rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <TagIcon className="size-4 text-purple-500" />
          <h2 className="text-sm font-bold text-foreground">Add New Tag</h2>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold">
          {totalTagCount} total
        </Badge>
      </div>

      <form onSubmit={handleCreateTag} className="space-y-3.5">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Name <span className="text-red-500">*</span></span>
          </label>
          <Input
            type="text"
            placeholder="e.g. Next.js, SEO Tips, TypeScript"
            value={tagName}
            onChange={(e) => handleTagNameChange(e.target.value)}
            className="h-8.5 text-xs"
            disabled={isCreatingTag}
            required
          />
          <p className="text-[11px] text-muted-foreground">
            The display label of the tag chip across the blog.
          </p>
        </div>

        {/* Slug */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Slug</span>
            <span className="text-[10px] text-muted-foreground">
              {tagSlugManual ? "manual" : "auto-generated"}
            </span>
          </label>
          <Input
            type="text"
            placeholder="e.g. next-js"
            value={tagSlug}
            onChange={(e) => {
              setTagSlugManual(true);
              setTagSlug(e.target.value);
            }}
            className="h-8.5 text-xs font-mono"
            disabled={isCreatingTag}
          />
          <p className="text-[11px] text-muted-foreground">
            URL-friendly slug (e.g. <span className="font-mono">/tag/{tagSlug || "..."}</span>).
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Description <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <Textarea
            placeholder="Optional brief description for the tag..."
            value={tagDesc}
            onChange={(e) => setTagDesc(e.target.value)}
            className="text-xs min-h-17.5 resize-y"
            disabled={isCreatingTag}
          />
          <p className="text-[11px] text-muted-foreground">
            Tags help readers discover closely related articles and search keywords.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isCreatingTag || !tagName.trim()}
          className="w-full h-9 text-xs font-semibold gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isCreatingTag ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="size-3.5" />
              Add Tag
            </>
          )}
        </Button>
      </form>
    </div>
  );
});
