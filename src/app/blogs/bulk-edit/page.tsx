"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkEditorGrid, BulkBlogItem } from "./BulkEditorGrid";

function BulkEditContent() {
  const searchParams = useSearchParams();
  const urlIds = searchParams.get("ids");

  const [resolvedIds] = useState<string[]>(() => {
    if (urlIds) {
      return urlIds.split(",").map((id) => id.trim()).filter(Boolean);
    }
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("ys_bulk_edit_ids");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  });

  const queryKey =
    resolvedIds.length > 0
      ? `/api/blogs/bulk?ids=${resolvedIds.join(",")}`
      : null;

  const { data: bulkData, isLoading, error } = useSWR<{ blogs: BulkBlogItem[] }>(queryKey);
  const { data: categoriesData } = useSWR<any[]>("/api/categories");
  const { data: tagsData } = useSWR<any[]>("/api/tags");

  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const tags = Array.isArray(tagsData) ? tagsData : [];
  const blogs = bulkData?.blogs || [];

  if (resolvedIds.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          No Blog Posts Selected
        </h2>
        <p className="text-xs text-muted-foreground">
          Select one or more blog posts from the blogs table and click &quot;Bulk Edit&quot; to open them here in the spreadsheet.
        </p>
        <Link href="/blogs">
          <Button size="sm" className="mt-2 text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Blogs
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || blogs.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          Failed to Load Selected Blogs
        </h2>
        <p className="text-xs text-muted-foreground">
          {error?.message || "The selected blog posts could not be found or have been deleted."}
        </p>
        <Link href="/blogs">
          <Button variant="outline" size="sm" className="text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Return to Blogs Table
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background p-3 sm:p-4 gap-3 animate-in fade-in duration-200">
      <BulkEditorGrid
        initialBlogs={blogs}
        allCategories={categories}
        allTags={tags}
      />
    </div>
  );
}

export default function BulkEditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      }
    >
      <BulkEditContent />
    </Suspense>
  );
}
