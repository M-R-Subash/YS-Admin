"use client";

import React, { useState } from "react";
import { Tag as TagIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { slugify } from "@/lib/slugify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TagCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TagCreateForm = React.memo(function TagCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: TagCreateFormProps) {
  const [tagName, setTagName] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [tagSlugManual, setTagSlugManual] = useState(false);
  const [tagDesc, setTagDesc] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const resetForm = () => {
    setTagName("");
    setTagSlug("");
    setTagSlugManual(false);
    setTagDesc("");
  };

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

      resetForm();
      onSuccess();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden text-xs">
        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <TagIcon className="size-4.5 text-purple-500" />
            <span>Add New Tag</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Create a topic tag to classify articles and improve reader navigation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateTag} className="flex-1 flex flex-col min-h-0">
          <div className="p-5 space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Name <span className="text-red-500">*</span>
                </span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Next.js, SEO Tips, TypeScript"
                value={tagName}
                onChange={(e) => handleTagNameChange(e.target.value)}
                className="h-9 text-xs"
                disabled={isCreatingTag}
                autoFocus
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
                className="h-9 text-xs font-mono"
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
                className="text-xs min-h-20 resize-y"
                disabled={isCreatingTag}
              />
              <p className="text-[11px] text-muted-foreground">
                Tags help readers discover closely related articles and search keywords.
              </p>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isCreatingTag}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCreatingTag || !tagName.trim()}
              className="text-xs font-semibold gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
