"use client";

import React, { useState } from "react";
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

export default function CreateBlogPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  // Editor State
  const [content, setContent] = useState<any>(null);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const response = await fetch("/api/blogs", {
        method: "POST",
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
          readingTime: Math.ceil(JSON.stringify(content).length / 1000), // Very rough estimate
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
            <h1 className="text-sm font-bold text-black tracking-tight">Create Blog Post</h1>
            <p className="text-xs text-black font-medium">Write and publish a new article</p>
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
      <div className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-[1400px] mx-auto p-6 md:p-8 lg:p-10 w-full flex flex-col lg:flex-row gap-8">
          
          {/* Main Editor Column */}
          <div className="flex-1 space-y-6">
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div>
              <Label htmlFor="title" className="text-lg">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={handleTitleChange}
                placeholder="The Future of Next.js..."
                className="mt-2 text-lg font-semibold h-12"
              />
            </div>
          </div>

          <BlogEditor
            initialContent=""
            onChange={setContent}
          />
        </div>

        {/* Sidebar Settings Column */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-6 lg:sticky lg:top-8 lg:self-start pb-32">
          <div className="bg-card border border-border p-6 rounded-xl space-y-6">
            
            <div>
              <Label className="block mb-2">Featured Image</Label>
              <ImageUploadBlock 
                value={featuredImage || undefined}
                onChange={(val) => setFeaturedImage(val?.url || null)}
              />
            </div>
            
            <div className="border-t border-border pt-6">
              <Label htmlFor="slug">URL Slug</Label>
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
              <Label htmlFor="categories">Categories</Label>
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
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-2"
                placeholder="nextjs, tips, 2024"
              />
              <p className="text-xs text-muted-foreground mt-2">Comma separated</p>
            </div>

            <div className="border-t border-border pt-6 flex items-center justify-between">
              <div>
                <Label htmlFor="allowComments">Allow Comments</Label>
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
