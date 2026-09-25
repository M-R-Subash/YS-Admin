"use client";

import { Globe } from "lucide-react";

interface GoogleSearchPreviewProps {
  title: string;
  slug: string;
  description: string;
  pathPrefix?: string;
  siteUrl?: string;
  siteName?: string;
}

export function GoogleSearchPreview({
  title,
  slug,
  description,
  pathPrefix = "",
  siteUrl,
  siteName = "YS Innovations",
}: GoogleSearchPreviewProps) {
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_FRONTEND_URL || "https://ysinnovations.com";

  // Build clean path representation
  let formattedPath = "";
  if (pathPrefix) {
    const cleanPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");
    const cleanSlug = slug.replace(/^\/+|\/+$/g, "");
    formattedPath = cleanSlug ? `/${cleanPrefix}/${cleanSlug}` : `/${cleanPrefix}`;
  } else {
    formattedPath = slug.startsWith("/") ? slug : `/${slug || "your-page"}`;
  }

  const fullDisplayUrl = `${baseUrl.replace(/\/$/, "")}${formattedPath}`;

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-2xs font-sans space-y-1.5 transition-colors">
      <div className="flex items-center gap-2 mb-1 text-[12px] text-foreground">
        <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
          <Globe className="size-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <span className="block font-bold text-xs truncate">{siteName}</span>
          <span className="block text-muted-foreground text-[11px] truncate max-w-xs font-mono">
            {fullDisplayUrl}
          </span>
        </div>
      </div>
      <h3 className="text-[17px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate font-medium">
        {title || "SEO Title Preview"}
      </h3>
      <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
        {description ||
          "Write an engaging meta description that encourages users to click through to your content from search engines."}
      </p>
    </div>
  );
}
