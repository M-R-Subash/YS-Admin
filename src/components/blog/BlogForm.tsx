"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BlogEditor from "@/components/blog/BlogEditor";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import Link from "next/link";

interface BlogFormProps {
  blogId?: string;
}

export default function BlogForm({ blogId }: BlogFormProps) {
  const router = useRouter();
  const isEditMode = !!blogId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  // Initial Form Snapshot for dirty check
  const [initialData, setInitialData] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState("");
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

        setTitle(data.title || "");
        setSlug(data.slug || "");
        setTags(data.tags ? data.tags.join(", ") : "");
        setCategories(data.categories ? data.categories.join(", ") : "");
        setAllowComments(data.allowComments ?? true);
        setStatus(data.status || "draft");
        setContent(data.content);
        setFeaturedImage(data.featuredImage || null);
        setExcerpt(data.excerpt || "");
        setMetaTitle(data.seo?.metaTitle || "");
        setMetaDesc(data.seo?.metaDesc || "");
        setFocusKeyword(data.seo?.focusKeyword || "");

        // Save snapshot for dirty check
        setInitialData({
          title: data.title || "",
          slug: data.slug || "",
          tags: data.tags ? data.tags.join(", ") : "",
          categories: data.categories ? data.categories.join(", ") : "",
          allowComments: data.allowComments ?? true,
          status: data.status || "draft",
          content: data.content,
          featuredImage: data.featuredImage || null,
          excerpt: data.excerpt || "",
          metaTitle: data.seo?.metaTitle || "",
          metaDesc: data.seo?.metaDesc || "",
          focusKeyword: data.seo?.focusKeyword || "",
        });
      } catch (err) {
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
        tags !== initialData.tags ||
        categories !== initialData.categories ||
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
        tags.trim() !== "" ||
        categories.trim() !== "" ||
        metaTitle.trim() !== "" ||
        metaDesc.trim() !== "" ||
        focusKeyword.trim() !== ""
      );
    }
  }, [isEditMode, initialData, title, slug, tags, categories, allowComments, featuredImage, excerpt, metaTitle, metaDesc, focusKeyword, content]);

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

  const handleSave = async (publishStatus: "draft" | "published") => {
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

    const payload = {
      title,
      slug,
      featuredImage,
      content,
      allowComments,
      status: publishStatus,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      categories: categories.split(",").map((c) => c.trim()).filter(Boolean),
      excerpt,
      metaTitle,
      metaDesc,
      focusKeyword,
      readingTime: Math.ceil(JSON.stringify(content).length / 1000),
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
        const data = await response.json();
        throw new Error(data.message || "Failed to save blog");
      }

      toast.add({
        title: "Success",
        description: `Blog ${publishStatus === "published" ? "published" : "saved as draft"} successfully.`,
        type: "success",
      });
      router.push("/blogs");
      router.refresh();
    } catch (error: any) {
      toast.add({ title: "Error", description: error.message, type: "error" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 shadow-sm z-50 relative">
        <div className="flex items-center gap-4">
          <Link href="/blogs" className="p-2 rounded-sm bg-black border border-black hover:bg-card-hover transition-all text-white shadow-sm cursor-pointer">
            <ArrowLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-black tracking-tight">
              {isEditMode ? "Edit Blog Post" : "Create Blog Post"}
            </h1>
            <p className="text-xs text-black font-medium">
              {isEditMode ? "Make changes to your article." : "Write and publish a new article."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isSubmitting || (isEditMode ? (!isDirtyOrFilled && status === "draft") : !isDirtyOrFilled)}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isSubmitting && status === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave("published")}
            disabled={isSubmitting || (isEditMode ? (!isDirtyOrFilled && status === "published") : !isDirtyOrFilled)}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] bg-black hover:bg-black/90 text-white disabled:opacity-50"
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
          <div className="flex-1 h-full min-h-[500px] flex flex-col overflow-hidden space-y-4">
            {isLoading ? (
              <div className="h-full bg-card border rounded-xl animate-pulse flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="bg-card border border-border p-4 rounded-xl shrink-0">
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
                    className="mt-2 w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-lg font-semibold shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    rows={1}
                  />
                </div>

                <div className="flex-1 overflow-hidden">
                  <BlogEditor
                    initialContent={content}
                    onChange={setContent}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sidebar Settings Column */}
          <div className="w-full lg:w-[400px] shrink-0 h-full overflow-y-auto pb-8 pr-2 custom-scrollbar">
            <div className="bg-card border border-border p-6 rounded-xl space-y-6">
              
              <div>
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

              <div className="border-t border-border pt-6">
                <Label className="block mb-2 text-sm font-bold text-foreground">Featured Image</Label>
                <ImageUploadBlock 
                  value={featuredImage || undefined}
                  onChange={(val) => setFeaturedImage(val?.url || null)}
                />
              </div>

              <div className="border-t border-border pt-6">
                <Label htmlFor="excerpt" className="text-sm font-bold text-foreground">Excerpt</Label>
                <textarea
                  id="excerpt"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-2"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="A brief summary of the blog..."
                />
              </div>

              <div className="border-t border-border pt-6">
                <Label htmlFor="categories" className="text-sm font-bold text-foreground">Categories</Label>
                <Input
                  id="categories"
                  value={categories}
                  onChange={(e) => setCategories(e.target.value)}
                  className="mt-2"
                  placeholder="Technology, React"
                />
                <p className="text-xs text-muted-foreground mt-2">Comma separated</p>
              </div>

              <div className="border-t border-border pt-6">
                <Label htmlFor="tags" className="text-sm font-bold text-foreground">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="mt-2"
                  placeholder="nextjs, tips, 2024"
                />
                <p className="text-xs text-muted-foreground mt-2">Comma separated</p>
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
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-2"
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
    </div>
  );
}
