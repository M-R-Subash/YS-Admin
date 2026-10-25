"use client";

import React, { useState } from "react";
import { FolderPlus, Sparkles, Globe, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { slugify } from "@/lib/slugify";
import { clientConfig } from "@/lib/config/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CategoryCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CategoryCreateForm = React.memo(function CategoryCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: CategoryCreateFormProps) {
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catSlugManual, setCatSlugManual] = useState(false);
  const [catDesc, setCatDesc] = useState("");
  const [showSeoFields, setShowSeoFields] = useState(false);
  const [catMetaTitle, setCatMetaTitle] = useState("");
  const [catMetaDesc, setCatMetaDesc] = useState("");
  const [catFocusKeyword, setCatFocusKeyword] = useState("");
  const [catNoIndex, setCatNoIndex] = useState(false);
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const siteUrl = clientConfig.app.frontendUrl;

  const resetForm = () => {
    setCatName("");
    setCatSlug("");
    setCatSlugManual(false);
    setCatDesc("");
    setCatMetaTitle("");
    setCatMetaDesc("");
    setCatFocusKeyword("");
    setCatNoIndex(false);
    setShowSeoFields(false);
  };

  const handleCatNameChange = (val: string) => {
    setCatName(val);
    if (!catSlugManual) {
      setCatSlug(slugify(val));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catName.trim();
    if (!cleanName) {
      toast.add({ title: "Category name is required", type: "error" });
      return;
    }

    setIsCreatingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          slug: catSlug.trim() || slugify(cleanName),
          description: catDesc.trim() || null,
          metaTitle: catMetaTitle.trim() || null,
          metaDesc: catMetaDesc.trim() || null,
          focusKeyword: catFocusKeyword.trim() || null,
          noIndex: catNoIndex,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create category");
      }

      toast.add({ title: `Category "${cleanName}" created successfully!`, type: "success" });
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.add({ title: "Error creating category", description: error.message, type: "error" });
    } finally {
      setIsCreatingCat(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden text-xs">
        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FolderPlus className="size-4.5 text-primary" />
            <span>Add New Category</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Create a category to group related blog posts and organize archives.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateCategory} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Name <span className="text-red-500">*</span>
                </span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Technology, AI Tools"
                value={catName}
                onChange={(e) => handleCatNameChange(e.target.value)}
                className="h-9 text-xs"
                disabled={isCreatingCat}
                autoFocus
                required
              />
              <p className="text-[11px] text-muted-foreground">
                The display name shown on article badges and archive pages.
              </p>
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Slug</span>
                <span className="text-[10px] text-muted-foreground">
                  {catSlugManual ? "manual" : "auto-generated"}
                </span>
              </label>
              <Input
                type="text"
                placeholder="e.g. technology"
                value={catSlug}
                onChange={(e) => {
                  setCatSlugManual(true);
                  setCatSlug(e.target.value);
                }}
                className="h-9 text-xs font-mono"
                disabled={isCreatingCat}
              />
              <p className="text-[11px] text-muted-foreground">
                URL-friendly slug (e.g. <span className="font-mono">/category/{catSlug || "..."}</span>).
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Description <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Textarea
                placeholder="Brief description for header overview and archives..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="text-xs min-h-18 resize-y"
                disabled={isCreatingCat}
              />
            </div>

            {/* Collapsible SEO Section */}
            <div className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-3">
              <button
                type="button"
                onClick={() => setShowSeoFields(!showSeoFields)}
                className="w-full flex items-center justify-between text-xs font-bold text-foreground cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Search Engine Optimization (SEO)</span>
                </span>
                <span className="text-[11px] text-primary hover:underline">
                  {showSeoFields ? "Hide SEO" : "Customize SEO"}
                </span>
              </button>

              {showSeoFields && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="font-semibold text-foreground">Meta Title</label>
                      <span
                        className={`text-[10px] ${
                          catMetaTitle.length > 60 ? "text-amber-500 font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {catMetaTitle.length}/60 chars
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder={catName ? `${catName} Articles & Guides | YS Innovations` : "Custom SEO title..."}
                      value={catMetaTitle}
                      onChange={(e) => setCatMetaTitle(e.target.value)}
                      className="h-8.5 text-xs"
                      disabled={isCreatingCat}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="font-semibold text-foreground">Meta Description</label>
                      <span
                        className={`text-[10px] ${
                          catMetaDesc.length > 160 ? "text-amber-500 font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {catMetaDesc.length}/160 chars
                      </span>
                    </div>
                    <Textarea
                      placeholder="Snippet shown in Google search results (140-160 chars recommended)..."
                      value={catMetaDesc}
                      onChange={(e) => setCatMetaDesc(e.target.value)}
                      className="text-xs min-h-16 resize-y"
                      disabled={isCreatingCat}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Focus Keyword</label>
                    <Input
                      type="text"
                      placeholder="e.g. digital marketing, ai tools"
                      value={catFocusKeyword}
                      onChange={(e) => setCatFocusKeyword(e.target.value)}
                      className="h-8.5 text-xs"
                      disabled={isCreatingCat}
                    />
                  </div>

                  {/* Live Google Search Preview Card */}
                  <div className="rounded-lg border border-border/70 p-2.5 bg-background space-y-1 text-left">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                      <Globe className="size-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{siteUrl}/category/{catSlug || slugify(catName) || "topic"}</span>
                    </div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {catMetaTitle || (catName ? `${catName} - Guides & Articles` : "Category Title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {catMetaDesc || catDesc || "Explore comprehensive articles, tutorials, and latest industry insights in this category."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="cat-noindex-toggle"
                      checked={catNoIndex}
                      onCheckedChange={(checked) => setCatNoIndex(Boolean(checked))}
                    />
                    <label htmlFor="cat-noindex-toggle" className="text-xs text-foreground cursor-pointer select-none">
                      NoIndex <span className="text-[10px] text-muted-foreground">(hide category from Google Search)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isCreatingCat}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCreatingCat || !catName.trim()}
              className="text-xs font-semibold gap-1.5 cursor-pointer text-white"
            >
              {isCreatingCat ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Add Category
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
