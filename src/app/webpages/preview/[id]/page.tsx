"use client";

import { useParams } from "next/navigation";
import { Layers } from "lucide-react";
import { FullscreenPreviewWorkspace } from "@/components/preview/FullscreenPreviewWorkspace";

export default function WebpagePreviewPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <FullscreenPreviewWorkspace
      id={id}
      itemTypeLabel="Webpage"
      titleIcon={<Layers className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />}
      fetchEndpoint={`/api/pages/${id}`}
      editorUrl={`/editor/${id}`}
      backUrl="/webpages"
      channelName={`page_preview_${id}`}
      getItemPath={(slug) => (slug === "/" ? "" : slug.startsWith("/") ? slug : `/${slug}`)}
    />
  );
}
