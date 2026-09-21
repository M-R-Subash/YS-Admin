"use client";

import { Search } from "lucide-react";

interface GoogleSearchPreviewProps {
  title: string;
  slug: string;
  description: string;
  siteUrl?: string;
  siteName?: string;
}

export function GoogleSearchPreview({
  title,
  slug,
  description,
  siteUrl,
  siteName = "YS Innovations",
}: GoogleSearchPreviewProps) {
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "https://ysinnovations.com";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm font-sans space-y-1">
      <div className="flex items-center gap-2 mb-1 text-[12px] text-gray-700">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <Search className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div>
          <span className="block font-medium">{siteName}</span>
          <span className="block text-gray-500 text-[11px] truncate w-60">
            {baseUrl}/blogs/{slug || "slug"}
          </span>
        </div>
      </div>
      <h3 className="text-[18px] text-[#1a0dab] hover:underline cursor-pointer truncate font-medium">
        {title || "SEO Title Preview"}
      </h3>
      <p className="text-[13px] text-[#4d5156] line-clamp-2 leading-snug">
        {description ||
          "Write an engaging meta description that encourages users to click through to your content from search engines."}
      </p>
    </div>
  );
}
