"use client";

import { Share2 } from "lucide-react";

interface SocialSharePreviewProps {
  title: string;
  description: string;
  imageUrl?: string | null;
  siteName?: string;
}

export function SocialSharePreview({
  title,
  description,
  imageUrl,
  siteName = "ysinnovations.com",
}: SocialSharePreviewProps) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-2xs">
      <div className="aspect-[1.91/1] w-full bg-muted/50 flex items-center justify-center relative overflow-hidden border-b border-border">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || "Social Card Preview"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-4 text-center">
            <Share2 className="size-6 opacity-40" />
            <span className="text-xs font-semibold">No Social Image Provided</span>
            <span className="text-[10px] text-muted-foreground">
              Upload an Open Graph image below (1200 &times; 630 recommended)
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs shadow-xs">
          Open Graph 1200&times;630
        </div>
      </div>
      <div className="p-3.5 space-y-1 bg-card">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block font-mono">
          {siteName}
        </span>
        <h4 className="text-sm font-bold text-foreground line-clamp-1 leading-snug">
          {title || "Page Title on Social Platforms"}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description ||
            "Engaging summary shown when visitors share this URL on LinkedIn, Twitter/X, WhatsApp, and Slack."}
        </p>
      </div>
    </div>
  );
}
