"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import BlogEditor from "@/components/blog/BlogEditor";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import Link from "next/link";

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    async function fetchBlog() {
      try {
        const res = await fetch(`/api/blogs/${id}`);
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
      } catch (err) {
        toast.add({ title: "Error", description: "Could not load blog.", type: "error" });
        router.push("/blogs");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) {
      fetchBlog();
    }
  }, [id, router]);

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

    setIsSubmitting(true);
    setStatus(publishStatus);

    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save blog");
      }

      toast.add({ title: "Success", description: `Blog ${publishStatus === "published" ? "published" : "saved as draft"} successfully.`, type: "success" });
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
            <h1 className="text-sm font-bold text-black tracking-tight">Edit Blog Post</h1>
            <p className="text-xs text-black font-medium">Make changes to your article.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isSubmitting}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02]"
          >
            {isSubmitting && status === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave("published")}
            disabled={isSubmitting}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] bg-black hover:bg-black/90 text-white"
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
          <div className="flex-1 h-full min-h-[500px] flex flex-col overflow-hidden">

          {isLoading ? (
            <div className="h-[400px] bg-card border rounded-xl animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <BlogEditor
              initialContent={content}
              onChange={setContent}
            />
          )}
        </div>

        {/* Sidebar Settings Column */}
        <div className="w-full lg:w-[400px] shrink-0 h-full overflow-y-auto pb-8 pr-2 custom-scrollbar">
          <div className="bg-card border border-border p-6 rounded-xl space-y-6">
            
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
                className="mt-2 w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-lg font-semibold shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={2}
              />
            </div>

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
