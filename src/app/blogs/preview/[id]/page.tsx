"use client";

import { useParams } from "next/navigation";
import { FileText } from "lucide-react";
import { FullscreenPreviewWorkspace } from "@/components/preview/FullscreenPreviewWorkspace";

export default function BlogPreviewPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <FullscreenPreviewWorkspace
      id={id}
      itemTypeLabel="Blog Post"
      titleIcon={<FileText className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />}
      fetchEndpoint={`/api/blogs/${id}`}
      editorUrl={`/blogs/edit/${id}`}
      backUrl="/blogs"
      channelName={`blog_preview_${id}`}
      getItemPath={(slug) => `/blogs/${slug.startsWith("/") ? slug.slice(1) : slug}`}
    />
  );
}
