"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Share2,
  AlertCircle,
  Link2,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { GoogleSearchPreview } from "./GoogleSearchPreview";
import { SocialSharePreview } from "./SocialSharePreview";
import { SchemaOrgBuilder } from "./SchemaOrgBuilder";
import { SeoHealthAdvisor } from "./SeoHealthAdvisor";
import { analyzeSeo } from "@/lib/seo/seo-engine";
import type { SeoEntityType, SeoMetadata } from "@/types/seo";

export interface SeoEditorSuiteValues extends SeoMetadata {
  title: string;
  slug: string;
  featuredImage?: string | null;
  [key: string]: any;
}

interface SeoEditorSuiteProps {
  values: SeoEditorSuiteValues;
  onChange: (field: string, value: any) => void;
  entityType?: SeoEntityType;
  content?: any;
  slugPrefix?: string;
  errors?: Record<string, string | undefined>;
  className?: string;
}

function charCountColor(current: number, optimal: number, max: number): string {
  if (current > max) return "text-destructive font-bold";
  if (current >= optimal) return "text-emerald-500 font-bold";
  if (current > 0) return "text-amber-500 font-bold";
  return "text-muted-foreground";
}

export function SeoEditorSuite({
  values,
  onChange,
  entityType = "page",
  content,
  slugPrefix = "",
  errors = {},
  className = "",
}: SeoEditorSuiteProps) {
  const [previewMode, setPreviewMode] = useState<"google" | "social">("google");

  const title = values.title || "";
  const slug = values.slug || "";
  const metaTitle = values.metaTitle || "";
  const metaDesc = values.metaDesc || "";
  const focusKeyword = values.focusKeyword || "";
  const ogTitle = values.ogTitle || "";
  const ogDesc = values.ogDesc || "";
  const ogImage = values.ogImage || "";
  const canonicalUrl = values.canonicalUrl || "";
  const structuredData = values.structuredData || null;
  const noIndex = Boolean(values.noIndex);
  const featuredImage = values.featuredImage || "";

  // Real-time SEO analysis computed from current values + content
  const analysis = useMemo(() => {
    return analyzeSeo(
      focusKeyword,
      metaTitle || title,
      slug,
      metaDesc,
      content,
      null,
      entityType
    );
  }, [focusKeyword, metaTitle, title, slug, metaDesc, content, entityType]);

  return (
    <div className={`w-full p-4 sm:p-6 ${className}`}>
      {/* 3-Column Layout: Previews/Social | Core/Indexing | Health Advisor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Snippet & Social Card Previews */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground font-mono">
                Snippet Previews
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setPreviewMode("google")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    previewMode === "google"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Search className="size-3" />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("social")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    previewMode === "social"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Share2 className="size-3" />
                  <span>Social</span>
                </button>
              </div>
            </div>

            {previewMode === "google" ? (
              <GoogleSearchPreview
                title={metaTitle || title || "SEO Title Preview"}
                slug={slug}
                description={
                  metaDesc ||
                  "Write an engaging meta description that encourages visitors to click through from Google search results."
                }
                pathPrefix={slugPrefix}
              />
            ) : (
              <SocialSharePreview
                title={ogTitle || metaTitle || title || "Title on Social Platforms"}
                description={
                  ogDesc ||
                  metaDesc ||
                  "Engaging summary teaser shown when shared on Twitter/X, LinkedIn, WhatsApp, and Slack."
                }
                imageUrl={ogImage || featuredImage}
              />
            )}
          </div>

          {/* Social Sharing Overrides */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
                <Share2 className="size-3.5" />
                Social Card Overrides (OG)
              </h3>
              <span className="text-[10px] text-muted-foreground">Optional</span>
            </div>

            {/* OG Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-ogTitle" className="text-xs font-bold text-foreground">
                  Open Graph Title
                </Label>
                <span className={`text-[11px] font-mono ${charCountColor(ogTitle.length, 40, 70)}`}>
                  {ogTitle.length} / 70
                </span>
              </div>
              <Input
                id="seo-ogTitle"
                value={ogTitle}
                onChange={(e) => onChange("ogTitle", e.target.value)}
                placeholder="Overrides Meta Title on LinkedIn and Twitter"
                className="text-xs h-9"
              />
            </div>

            {/* OG Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-ogDesc" className="text-xs font-bold text-foreground">
                  Open Graph Description
                </Label>
                <span className={`text-[11px] font-mono ${charCountColor(ogDesc.length, 80, 200)}`}>
                  {ogDesc.length} / 200
                </span>
              </div>
              <textarea
                id="seo-ogDesc"
                rows={2}
                value={ogDesc}
                onChange={(e) => onChange("ogDesc", e.target.value)}
                placeholder="Overrides Meta Description for social previews"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* OG Image Upload */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground block">
                Social Share Image (1200 &times; 630)
              </Label>
              <ImageUploadBlock
                value={ogImage}
                onChange={(val) =>
                  onChange(
                    "ogImage",
                    typeof val === "object" ? val?.url || "" : val || ""
                  )
                }
              />
              <p className="text-[10px] text-muted-foreground">
                If omitted, the page/blog default cover image will be used automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: Core Search Engine Fields & Technical Indexing */}
        <div className="space-y-5">
          {/* Core Search Details */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
              Core Search Engine Details
            </h3>

            {/* URL Slug */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-slug" className="text-xs font-bold text-foreground">
                  URL Slug <span className="text-destructive">*</span>
                </Label>
                {errors.slug && (
                  <span className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {errors.slug}
                  </span>
                )}
              </div>
              <div className="flex rounded-md shadow-2xs border border-border focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                {slugPrefix && (
                  <span className="inline-flex items-center px-2.5 text-xs text-muted-foreground bg-muted border-r border-border shrink-0 select-none font-mono">
                    {slugPrefix}
                  </span>
                )}
                <Input
                  id="seo-slug"
                  value={slug}
                  onChange={(e) => onChange("slug", e.target.value)}
                  className="border-0 rounded-none focus-visible:ring-0 text-xs h-9 font-mono"
                  placeholder="custom-url-slug"
                />
              </div>
            </div>

            {/* Focus Target Keyword */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-focusKeyword" className="text-xs font-bold text-foreground">
                  Focus Target Keyword
                </Label>
                {analysis.hasKeyword && (
                  <span className="text-[11px] font-bold text-primary font-mono">
                    {analysis.keywordCount}x in content
                  </span>
                )}
              </div>
              <Input
                id="seo-focusKeyword"
                value={focusKeyword}
                onChange={(e) => onChange("focusKeyword", e.target.value)}
                placeholder="e.g. cloud migration services"
                className="text-xs h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Primary search phrase evaluated by the SEO Advisor across title, slug, and body.
              </p>
            </div>

            {/* Meta Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-metaTitle" className="text-xs font-bold text-foreground">
                  Meta Title
                </Label>
                <div className="flex items-center gap-2">
                  {errors.metaTitle && (
                    <span className="text-[11px] font-semibold text-destructive">
                      {errors.metaTitle}
                    </span>
                  )}
                  <span className={`text-[11px] font-mono ${charCountColor(metaTitle.length, 50, 60)}`}>
                    {metaTitle.length} / 60
                  </span>
                </div>
              </div>
              <Input
                id="seo-metaTitle"
                value={metaTitle}
                onChange={(e) => onChange("metaTitle", e.target.value)}
                placeholder="Clickable headline in Google Search (50–60 characters)"
                className={`text-xs h-9 ${errors.metaTitle ? "border-destructive" : ""}`}
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-metaDesc" className="text-xs font-bold text-foreground">
                  Meta Description
                </Label>
                <div className="flex items-center gap-2">
                  {errors.metaDesc && (
                    <span className="text-[11px] font-semibold text-destructive">
                      {errors.metaDesc}
                    </span>
                  )}
                  <span className={`text-[11px] font-mono ${charCountColor(metaDesc.length, 120, 160)}`}>
                    {metaDesc.length} / 160
                  </span>
                </div>
              </div>
              <textarea
                id="seo-metaDesc"
                rows={3}
                value={metaDesc}
                onChange={(e) => onChange("metaDesc", e.target.value)}
                placeholder="Compelling overview with target keyword and clear call-to-action (120–160 chars)"
                className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 ${
                  errors.metaDesc
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-input focus-visible:ring-ring"
                }`}
              />
            </div>
          </div>

          {/* Indexing & Schema.org Structured Data */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
              Indexing &amp; Technical SEO
            </h3>

            {/* Canonical URL */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-canonicalUrl" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Link2 className="size-3.5" />
                  Canonical URL
                </Label>
                {errors.canonicalUrl && (
                  <span className="text-[11px] font-semibold text-destructive">
                    {errors.canonicalUrl}
                  </span>
                )}
              </div>
              <Input
                id="seo-canonicalUrl"
                value={canonicalUrl}
                onChange={(e) => onChange("canonicalUrl", e.target.value)}
                placeholder="https://ysinnovations.com/canonical-source"
                className={`text-xs h-9 ${errors.canonicalUrl ? "border-destructive" : ""}`}
              />
              <p className="text-[10px] text-muted-foreground">
                Specifies the authoritative URL to avoid duplicate content penalties.
              </p>
            </div>

            {/* noIndex Switch */}
            <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-1.5">
                  <EyeOff className="size-3.5 text-muted-foreground" />
                  <Label htmlFor="seo-noIndex" className="text-xs font-bold text-foreground cursor-pointer">
                    Hide from Search Engines (<code className="text-[10px] px-1 py-0.5 bg-muted rounded font-mono">noindex</code>)
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Instruct search crawlers not to index this URL in public search results.
                </p>
              </div>
              <Switch
                id="seo-noIndex"
                checked={noIndex}
                onCheckedChange={(checked) => onChange("noIndex", checked)}
              />
            </div>

            {/* Structured Data Builder */}
            <SchemaOrgBuilder
              value={structuredData}
              onChange={(newVal) => onChange("structuredData", newVal)}
              entityType={entityType}
              title={metaTitle || title}
              description={metaDesc}
              url={slugPrefix ? `${slugPrefix}${slug}` : slug}
              imageUrl={ogImage || featuredImage}
            />
          </div>
        </div>

        {/* Column 3: Real-Time SEO Health Advisor (Sticky & Full Height) */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:h-[calc(100vh-104px)] min-h-[560px] flex flex-col">
          <SeoHealthAdvisor analysis={analysis} className="h-full flex-1" />
        </div>
      </div>
    </div>
  );
}
