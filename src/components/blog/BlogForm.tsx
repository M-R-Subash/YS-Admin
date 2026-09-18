"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BlogEditor from "@/components/blog/BlogEditor";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { TagInput } from "@/components/ui/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { ScreenLoader } from "@/components/ui/screen-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmergencyDraft, getEmergencyBackup } from "@/hooks/useEmergencyDraft";

interface BlogFormProps {
  blogId?: string;
}

export default function BlogForm({ blogId }: BlogFormProps) {
  const router = useRouter();
  const isEditMode = !!blogId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Initial Form Snapshot for dirty check
  const [initialData, setInitialData] = useState<any>(null);
  
  const [loadedFromBackup, setLoadedFromBackup] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasCloudDraft, setHasCloudDraft] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [excerpt, setExcerpt] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  // Editor State
  const [content, setContent] = useState<any>(null);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  // Fetch blog data if in edit mode
  useEffect(() => {
    if (!isEditMode || !blogId) return;

    async function fetchBlog() {
      try {
        const res = await fetch(`/api/blogs/${blogId}`);
        if (!res.ok) throw new Error("Failed to fetch blog");
        const data = await res.json();

        const dbTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
        
        const initialPayload = data.draftContent ? (typeof data.draftContent === 'string' ? JSON.parse(data.draftContent) : data.draftContent) : data;
        let finalData = { ...initialPayload };
        let isBackup = false;

        setHasCloudDraft(!!data.draftContent);

        const backup = getEmergencyBackup<any>(`emergency_blog_draft_${blogId || 'new'}`, dbTime);
        if (backup) {
          finalData = { ...finalData, ...backup.data };
          isBackup = true;
          setLoadedFromBackup(true);
          setLastSavedAt(new Date(backup.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }

        const blogTags = Array.isArray(finalData.tags) ? finalData.tags : finalData.tags ? String(finalData.tags).split(",").map((s: string) => s.trim()).filter(Boolean) : [];
        const blogCategories = Array.isArray(finalData.categories) ? finalData.categories : finalData.categories ? String(finalData.categories).split(",").map((s: string) => s.trim()).filter(Boolean) : [];

        setTitle(finalData.title || "");
        setSlug(finalData.slug || "");
        setTags(blogTags);
        setCategories(blogCategories);
        setAllowComments(finalData.allowComments ?? true);
        setStatus(finalData.status || "draft");
        setContent(finalData.content);
        setFeaturedImage(finalData.featuredImage || null);
        setExcerpt(finalData.excerpt || "");
        setMetaTitle(finalData.metaTitle || finalData.seo?.metaTitle || "");
        setMetaDesc(finalData.metaDesc || finalData.seo?.metaDesc || "");
        setFocusKeyword(finalData.focusKeyword || finalData.seo?.focusKeyword || "");

        // Save snapshot for dirty check using the effective loaded data
        setInitialData({
          title: finalData.title || "",
          slug: finalData.slug || "",
          tags: blogTags,
          categories: blogCategories,
          allowComments: finalData.allowComments ?? true,
          status: finalData.status || "draft",
          content: finalData.content,
          featuredImage: finalData.featuredImage || null,
          excerpt: finalData.excerpt || "",
          metaTitle: finalData.metaTitle || finalData.seo?.metaTitle || "",
          metaDesc: finalData.metaDesc || finalData.seo?.metaDesc || "",
          focusKeyword: finalData.focusKeyword || finalData.seo?.focusKeyword || "",
        });

        if (!isBackup && data.updatedAt) {
          try {
             setLastSavedAt(new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          } catch {}
        }
      } catch {
        toast.add({ title: "Error", description: "Could not load blog post.", type: "error" });
        router.push("/blogs");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBlog();
  }, [blogId, isEditMode, router]);

  // Form dirty / filled check
  const isDirtyOrFilled = useMemo(() => {
    if (isEditMode) {
      if (!initialData) return false;
      return (
        title !== initialData.title ||
        slug !== initialData.slug ||
        JSON.stringify(tags) !== JSON.stringify(initialData.tags || []) ||
        JSON.stringify(categories) !== JSON.stringify(initialData.categories || []) ||
        allowComments !== initialData.allowComments ||
        featuredImage !== initialData.featuredImage ||
        excerpt !== initialData.excerpt ||
        metaTitle !== initialData.metaTitle ||
        metaDesc !== initialData.metaDesc ||
        focusKeyword !== initialData.focusKeyword ||
        JSON.stringify(content) !== JSON.stringify(initialData.content)
      );
    } else {
      // Create Mode
      return (
        title.trim() !== "" ||
        slug.trim() !== "" ||
        (content && JSON.stringify(content) !== '""' && JSON.stringify(content) !== 'null') ||
        featuredImage !== null ||
        excerpt.trim() !== "" ||
        tags.length > 0 ||
        categories.length > 0 ||
        metaTitle.trim() !== "" ||
        metaDesc.trim() !== "" ||
        focusKeyword.trim() !== ""
      );
    }
  }, [isEditMode, initialData, title, slug, tags, categories, allowComments, featuredImage, excerpt, metaTitle, metaDesc, focusKeyword, content]);

  // Emergency load for Create mode
  useEffect(() => {
    if (isEditMode) return;
    const backup = getEmergencyBackup<any>("emergency_blog_draft_new", 0);
    if (backup) {
      setTimeout(() => {
        setTitle(backup.data.title || "");
        setSlug(backup.data.slug || "");
        setTags(backup.data.tags || []);
        setCategories(backup.data.categories || []);
        setAllowComments(backup.data.allowComments ?? true);
        setStatus(backup.data.status || "draft");
        setContent(backup.data.content || null);
        setFeaturedImage(backup.data.featuredImage || null);
        setExcerpt(backup.data.excerpt || "");
        setMetaTitle(backup.data.metaTitle || "");
        setMetaDesc(backup.data.metaDesc || "");
        setFocusKeyword(backup.data.focusKeyword || "");
        
        setLoadedFromBackup(true);
        setLastSavedAt(new Date(backup.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }, 0);
    }
  }, [isEditMode]);

  const { clearBackup } = useEmergencyDraft({
    key: `emergency_blog_draft_${blogId || 'new'}`,
    isDirty: isDirtyOrFilled,
    getPayload: () => ({
      title, slug, featuredImage, content, allowComments, status, tags, categories, excerpt, metaTitle, metaDesc, focusKeyword
    }),
  });

  const handleDiscardDraft = async () => {
    if (!blogId) return;
    setDiscarding(true);
    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard-draft" }),
      });
      if (!response.ok) throw new Error("Failed to discard draft");
      
      clearBackup();
      window.location.reload();
    } catch (err: any) {
      toast.add({ title: "Error", description: err.message, type: "error" });
      setDiscarding(false);
    }
  };

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSlug(
      newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    );
  };

  const handleSave = async (publishStatus: "draft" | "published", shouldExit: boolean = false) => {
    if (!title || !slug) {
      toast.add({ title: "Validation Error", description: "Title and Slug are required.", type: "error" });
      return;
    }
    if (!content) {
      toast.add({ title: "Validation Error", description: "Blog content is empty.", type: "error" });
      return;
    }

    const isStatusChanged = isEditMode && publishStatus !== status;
    if (!isDirtyOrFilled && !isStatusChanged) {
      toast.add({ title: "No Changes", description: "No changes detected to save.", type: "info" });
      return;
    }

    setIsSubmitting(true);
    setStatus(publishStatus);

    const calculateReadingTime = (json: any): number => {
      if (!json) return 1;
      let text = "";
      const extractText = (node: any) => {
        if (!node) return;
        if (node.text) text += " " + node.text;
        if (Array.isArray(node.content)) {
          node.content.forEach(extractText);
        }
      };
      extractText(json);
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(1, Math.ceil(words / 200));
    };

    const payload = {
      title,
      slug,
      featuredImage,
      content,
      allowComments,
      status: publishStatus,
      tags: tags.map((t) => t.trim()).filter(Boolean),
      categories: categories.map((c) => c.trim()).filter(Boolean),
      excerpt,
      metaTitle,
      metaDesc,
      focusKeyword,
      readingTime: calculateReadingTime(content),
      action: publishStatus === "draft" ? "save-draft" : "publish",
    };

    try {
      const endpoint = isEditMode ? `/api/blogs/${blogId}` : "/api/blogs";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save blog");
      }
      
      const responseData = await response.json();

      setStatus(publishStatus);
      if (publishStatus === "published") {
        setHasCloudDraft(false);
      } else if (publishStatus === "draft") {
        setHasCloudDraft(true);
      }
      setLoadedFromBackup(false);
      
      setInitialData({
        title,
        slug,
        tags,
        categories,
        allowComments,
        status: publishStatus,
        content,
        featuredImage,
        excerpt,
        metaTitle,
        metaDesc,
        focusKeyword,
      });

      toast.add({
        title: "Success",
        description: `Blog ${publishStatus === "published" ? "published" : "saved as draft"} successfully.`,
        type: "success",
      });
      clearBackup();
      
      if (shouldExit) {
        router.push("/blogs");
      } else if (!isEditMode && responseData && responseData.id) {
        router.replace(`/blogs/${responseData.id}`);
      }
    } catch (error: any) {
      toast.add({ title: "Error", description: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Draft Info Banner */}
      {(hasCloudDraft || loadedFromBackup) && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-900">
              {loadedFromBackup
                ? `You're editing an emergency backup from ${lastSavedAt}.`
                : lastSavedAt
                  ? `You're editing a saved cloud draft from ${lastSavedAt}. Changes won't go live until you publish.`
                  : `You're editing a saved cloud draft. Changes won't go live until you publish.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loadedFromBackup && (
              <button
                type="button"
                onClick={() => {
                   clearBackup();
                   window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold bg-amber-100 hover:bg-red-100 text-amber-900 hover:text-red-700 border border-amber-300 hover:border-red-300 transition-all cursor-pointer shrink-0 shadow-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Discard Backup
              </button>
            )}
            {hasCloudDraft && (
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold bg-amber-100 hover:bg-red-100 text-amber-900 hover:text-red-700 border border-amber-300 hover:border-red-300 transition-all cursor-pointer shrink-0 shadow-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Discard Draft
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 shadow-sm z-50 relative">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (isDirtyOrFilled) {
                setShowExitConfirm(true);
              } else {
                router.push("/blogs");
              }
            }}
            className="p-2 rounded-sm bg-black border border-black hover:bg-zinc-800 transition-all text-white shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-black tracking-tight">
                {isEditMode ? "Edit Blog Post" : "Create Blog Post"}
              </h1>
              {isEditMode && status === "draft" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                  <span className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${isDirtyOrFilled ? "animate-pulse" : ""}`} />
                  {isDirtyOrFilled ? "Unsaved Edits" : lastSavedAt ? `Draft · Saved ${lastSavedAt}` : "Draft Saved"}
                </span>
              ) : isEditMode && status === "published" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live Published
                </span>
              ) : null}
            </div>
            <p className="text-xs text-black font-medium mt-1">
              {isEditMode ? "Make changes to your article." : "Write and publish a new article."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isSubmitting || (isEditMode ? (!isDirtyOrFilled && status === "draft") : !isDirtyOrFilled)}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting && status === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave("published")}
            disabled={isSubmitting || (isEditMode ? (!isDirtyOrFilled && status === "published") : !isDirtyOrFilled)}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] bg-black hover:bg-black/90 text-white disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting && status === "published" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden w-full relative">
        <div className="max-w-full mx-auto p-4 md:p-6 w-full h-full flex flex-col lg:flex-row gap-6">
          
          {/* Main Editor Column */}
          <div className="flex-1 h-full min-h-125 flex flex-col overflow-hidden">
            {isLoading ? (
              <ScreenLoader
                text="Loading Blog Post..."
                subtitle="Fetching article content and SEO settings..."
              />
            ) : (
              <div className="flex-1 overflow-hidden h-full">
                <BlogEditor
                  initialContent={content}
                  onChange={setContent}
                />
              </div>
            )}
          </div>

          {/* Sidebar Settings Column */}
          <div className="w-full lg:w-100 shrink-0 h-full overflow-y-auto pb-8 pr-2 custom-scrollbar">
            <div className="bg-card border border-border p-6 rounded-xl space-y-6">
              
              {/* Blog Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-bold text-foreground">Blog Title</Label>
                <textarea
                  id="title"
                  value={title}
                  onChange={(e) => {
                    handleTitleChange(e);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="The Future of Next.js..."
                  className="mt-2 w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-base font-semibold shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={2}
                />
              </div>

              {/* URL Slug */}
              <div className="border-t border-border pt-6">
                <Label htmlFor="slug" className="text-sm font-bold text-foreground">URL Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="mt-2"
                  placeholder="the-future-of-nextjs"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This is the URL path for the blog post.
                </p>
              </div>

              {/* Categories */}
              <div className="border-t border-border pt-6">
                <Label htmlFor="categories" className="text-sm font-bold text-foreground mb-2 block">Categories</Label>
                <TagInput
                  value={categories}
                  onChange={setCategories}
                  placeholder="Add category (e.g. Technology)..."
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">Press Enter or comma to add</p>
              </div>

              {/* Tags */}
              <div className="border-t border-border pt-6">
                <Label htmlFor="tags" className="text-sm font-bold text-foreground mb-2 block">Tags</Label>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder="Add tag (e.g. react, nextjs)..."
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">Press Enter or comma to add</p>
              </div>

              {/* Featured Image */}
              <div className="border-t border-border pt-6">
                <Label className="block mb-2 text-sm font-bold text-foreground">Featured Image</Label>
                <ImageUploadBlock 
                  value={featuredImage || undefined}
                  onChange={(val) => setFeaturedImage(val?.url || null)}
                />
              </div>

              {/* Excerpt */}
              <div className="border-t border-border pt-6">
                <Label htmlFor="excerpt" className="text-sm font-bold text-foreground">Excerpt</Label>
                <textarea
                  id="excerpt"
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-2"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="A brief summary of the blog..."
                />
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="font-bold text-sm tracking-tight text-foreground">SEO & Meta</h3>
                
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="SEO Title (50-60 chars)"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="metaDesc">Meta Description</Label>
                  <textarea
                    id="metaDesc"
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-2"
                    value={metaDesc}
                    onChange={(e) => setMetaDesc(e.target.value)}
                    placeholder="SEO Description (150-160 chars)"
                  />
                </div>

                <div>
                  <Label htmlFor="focusKeyword">Focus Keyword</Label>
                  <Input
                    id="focusKeyword"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="e.g. Next.js tutorial"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6 flex items-center justify-between">
                <div>
                  <Label htmlFor="allowComments" className="text-sm font-bold text-foreground">Allow Comments</Label>
                  <p className="text-xs text-muted-foreground mt-1">Enable user comments on this post</p>
                </div>
                <Switch
                  id="allowComments"
                  checked={allowComments}
                  onCheckedChange={setAllowComments}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have modifications that haven&apos;t been saved to your draft yet.
              What would you like to do before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
              Stay Here
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => router.push("/blogs")}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md transition-all cursor-pointer"
            >
              Exit Without Saving
            </button>
            <AlertDialogAction
              onClick={() => handleSave("draft", true)}
              disabled={isSubmitting}
              className="bg-black hover:bg-zinc-800 text-white"
            >
              Save Draft & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Draft Confirmation Dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Draft Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the current cloud draft and restore the
              editor to the live published version. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardDraft}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {discarding ? "Discarding..." : "Discard Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
