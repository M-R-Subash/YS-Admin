"use client";

import React from "react";
import { Controller } from "react-hook-form";
import {
  Globe,
  Wand2,
  Search,
  Share2,
  AlertCircle,
  Link2,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GoogleSearchPreview } from "@/components/seo/GoogleSearchPreview";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { charCountColor } from "../blog-form-utils";
import { useBlogForm } from "../context/BlogFormContext";

export function BlogSeoTab() {
  const {
    control,
    errors,
    clearErrors,
    watch,
    editorTab,
    seoPreviewMode,
    setSeoPreviewMode,
    seoAnalysis,
    isSeoCalculating,
    readingTime,
    handleAutoFillMeta,
  } = useBlogForm();

  const title = watch("title") || "";
  const slug = watch("slug") || "";
  const excerpt = watch("excerpt") || "";
  const metaTitle = watch("metaTitle") || "";
  const metaDesc = watch("metaDesc") || "";
  const ogTitle = watch("ogTitle") || "";
  const ogDesc = watch("ogDesc") || "";
  const ogImage = watch("ogImage") || "";
  const featuredImage = watch("featuredImage") || "";

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-card rounded-xl border border-border ${
        editorTab === "seo" ? "block" : "hidden"
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        {/* SEO Tab Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Search Engine Optimization &amp; Social Metadata
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fine-tune search previews, focus keywords, Open Graph social share cards, and indexing controls.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoFillMeta}
            className="flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto cursor-pointer border-border hover:bg-accent"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-500" />
            Auto-fill from Article
          </Button>
        </div>

        {/* 3-Column Layout: Previews/Social | Core/Indexing | SEO Advisor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Column 1 (1/3 width): Previews & Social Card Overrides */}
          <div className="space-y-5">
            {/* Search / Social Preview Box */}
            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Snippet Preview
                </span>
                <div className="flex items-center gap-1 p-0.5 bg-muted/70 border border-border/60 rounded-md">
                  <button
                    type="button"
                    onClick={() => setSeoPreviewMode("google")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      seoPreviewMode === "google"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Search className="w-3 h-3" />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeoPreviewMode("social")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      seoPreviewMode === "social"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Share2 className="w-3 h-3" />
                    Social
                  </button>
                </div>
              </div>

              {seoPreviewMode === "google" ? (
                <GoogleSearchPreview
                  title={metaTitle || title || "SEO Title Preview"}
                  slug={slug || "slug"}
                  description={
                    metaDesc ||
                    excerpt ||
                    "Write an engaging meta description that encourages search clicks..."
                  }
                />
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
                  <div className="aspect-[1.91/1] w-full bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    {ogImage || featuredImage ? (
                      <img
                        src={(ogImage || featuredImage) || undefined}
                        alt={ogTitle || title || "Social Share Preview"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5 p-4 text-center">
                        <Share2 className="w-6 h-6 opacity-40" />
                        <span className="text-xs font-medium">No preview image</span>
                        <span className="text-[10px] text-gray-400">
                          Upload an OG image below or set Cover Image
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                      OG Card
                    </div>
                  </div>
                  <div className="p-3 space-y-1 bg-white border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      ysinnovations.com
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                      {ogTitle || metaTitle || title || "Article Headline on Social Platforms"}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {ogDesc ||
                        metaDesc ||
                        excerpt ||
                        "Summary teaser shown when readers share this blog on Twitter, LinkedIn, and messaging apps."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Sharing / Open Graph Card */}
            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  Social Sharing (OG)
                </h3>
                <span className="text-[10px] text-muted-foreground">Overrides</span>
              </div>

              {/* OG Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="seo-ogTitle" className="text-xs font-bold text-foreground">
                    Open Graph Title
                  </Label>
                  <span className={`text-[11px] font-bold ${charCountColor(ogTitle.length, 40, 70)}`}>
                    {ogTitle.length} / 70
                  </span>
                </div>
                <Controller
                  name="ogTitle"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="seo-ogTitle"
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Overrides Meta Title on Twitter/LinkedIn"
                      className="text-sm h-8.5"
                    />
                  )}
                />
              </div>

              {/* OG Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="seo-ogDesc" className="text-xs font-bold text-foreground">
                    Open Graph Description
                  </Label>
                  <span className={`text-[11px] font-bold ${charCountColor(ogDesc.length, 80, 200)}`}>
                    {ogDesc.length} / 200
                  </span>
                </div>
                <Controller
                  name="ogDesc"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      id="seo-ogDesc"
                      rows={2}
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Overrides Meta Description for social cards"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  )}
                />
              </div>

              {/* OG Image */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-1">
                  Social Share Image (1200 &times; 630)
                </Label>
                <Controller
                  name="ogImage"
                  control={control}
                  render={({ field }) => (
                    <ImageUploadBlock
                      value={field.value || ""}
                      onChange={(val) =>
                        field.onChange(
                          typeof val === "object" ? val?.url || "" : val || ""
                        )
                      }
                    />
                  )}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  If empty, Featured Cover Image is used automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Column 2 (1/3 width): Core Search Engine Details & Technical SEO */}
          <div className="space-y-5">
            {/* Core Metadata Card */}
            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Core Search Details
              </h3>

              {/* URL Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="seo-slug" className="text-xs font-bold text-foreground">
                    URL Slug <span className="text-destructive">*</span>
                  </Label>
                  {errors.slug && (
                    <span className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.slug.message}
                    </span>
                  )}
                </div>
                <Controller
                  name="slug"
                  control={control}
                  render={({ field }) => (
                    <div className="flex rounded-md shadow-xs border border-border focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                      <span className="inline-flex items-center px-2.5 text-xs text-muted-foreground bg-muted/60 border-r border-border shrink-0 select-none">
                        /blogs/
                      </span>
                      <Input
                        id="seo-slug"
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          if (errors.slug) clearErrors("slug");
                        }}
                        className="border-0 rounded-none focus-visible:ring-0 text-sm h-8.5"
                        placeholder="article-url-slug"
                      />
                    </div>
                  )}
                />
              </div>

              {/* Focus Keyword */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="seo-focusKeyword" className="text-xs font-bold text-foreground">
                    Focus Target Keyword
                  </Label>
                  {seoAnalysis.hasKeyword && (
                    <span className="text-[11px] font-semibold text-primary">
                      {seoAnalysis.keywordCount} in content
                    </span>
                  )}
                </div>
                <Controller
                  name="focusKeyword"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="seo-focusKeyword"
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="e.g. Next.js performance optimization"
                      className="text-sm h-8.5"
                    />
                  )}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Primary phrase evaluated by the SEO Advisor across your article.
                </p>
              </div>

              {/* Meta Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="seo-metaTitle" className="text-xs font-bold text-foreground">
                    Meta Title
                  </Label>
                  <div className="flex items-center gap-2">
                    {errors.metaTitle && (
                      <span className="text-[11px] font-semibold text-destructive">
                        {errors.metaTitle.message}
                      </span>
                    )}
                    <span className={`text-[11px] font-bold ${charCountColor(metaTitle.length, 50, 60)}`}>
                      {metaTitle.length} / 60
                    </span>
                  </div>
                </div>
                <Controller
                  name="metaTitle"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="seo-metaTitle"
                      value={field.value || ""}
                      onChange={(e) => {
                        field.onChange(e);
                        if (errors.metaTitle) clearErrors("metaTitle");
                      }}
                      placeholder="Clickable headline for Google (50–60 chars)"
                      className={`text-sm h-8.5 ${errors.metaTitle ? "border-destructive" : ""}`}
                    />
                  )}
                />
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="seo-metaDesc" className="text-xs font-bold text-foreground">
                    Meta Description
                  </Label>
                  <div className="flex items-center gap-2">
                    {errors.metaDesc && (
                      <span className="text-[11px] font-semibold text-destructive">
                        {errors.metaDesc.message}
                      </span>
                    )}
                    <span className={`text-[11px] font-bold ${charCountColor(metaDesc.length, 120, 155)}`}>
                      {metaDesc.length} / 155
                    </span>
                  </div>
                </div>
                <Controller
                  name="metaDesc"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      id="seo-metaDesc"
                      rows={3}
                      value={field.value || ""}
                      onChange={(e) => {
                        field.onChange(e);
                        if (errors.metaDesc) clearErrors("metaDesc");
                      }}
                      placeholder="Engaging summary with keyword and call to action (120–155 chars)"
                      className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 ${
                        errors.metaDesc
                          ? "border-destructive focus-visible:ring-destructive"
                          : "border-input focus-visible:ring-ring"
                      }`}
                    />
                  )}
                />
              </div>
            </div>

            {/* Indexing & Technical SEO Card */}
            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Indexing &amp; Technical SEO
              </h3>

              {/* Canonical URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="seo-canonicalUrl" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Canonical URL
                  </Label>
                  {errors.canonicalUrl && (
                    <span className="text-[11px] font-semibold text-destructive">
                      {errors.canonicalUrl.message}
                    </span>
                  )}
                </div>
                <Controller
                  name="canonicalUrl"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="seo-canonicalUrl"
                      value={field.value || ""}
                      onChange={(e) => {
                        field.onChange(e);
                        if (errors.canonicalUrl) clearErrors("canonicalUrl");
                      }}
                      placeholder="https://ysinnovations.com/blogs/original-post"
                      className={`text-sm h-8.5 ${errors.canonicalUrl ? "border-destructive" : ""}`}
                    />
                  )}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Original URL if cross-posted or syndicated.
                </p>
              </div>

              {/* noIndex Switch */}
              <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/70 rounded-lg">
                <div className="space-y-0.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    <Label htmlFor="seo-noIndex" className="text-xs font-bold text-foreground cursor-pointer">
                      Hide from Search (<code className="text-[10px] px-1 py-0.2 bg-muted rounded">noindex</code>)
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Instruct bots not to index this post.
                  </p>
                </div>
                <Controller
                  name="noIndex"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="seo-noIndex"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Column 3 (1/3 width): Real-Time SEO Health Advisor (Sticky) */}
          <div className="space-y-5 sticky top-0">
            <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-3.5 text-sm font-bold text-foreground border-b border-border bg-accent/20">
                <span className="flex items-center gap-2">
                  <Sparkles
                    className={`w-4 h-4 text-primary ${
                      isSeoCalculating ? "text-amber-500 animate-pulse" : ""
                    }`}
                  />
                  SEO Health Advisor
                </span>
                {isSeoCalculating ? (
                  <span className="text-[10px] font-semibold text-muted-foreground animate-pulse">
                    Evaluating...
                  </span>
                ) : seoAnalysis.hasKeyword ? (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      seoAnalysis.score >= 80
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : seoAnalysis.score >= 50
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : "bg-red-500/10 text-red-500 border border-red-500/20"
                    }`}
                  >
                    {seoAnalysis.score} / 100
                  </span>
                ) : null}
              </div>

              <div
                className={`p-4 transition-opacity duration-200 ${
                  isSeoCalculating ? "opacity-70" : "opacity-100"
                }`}
              >
                {!seoAnalysis.hasKeyword ? (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Real-Time Keyword Advisor</p>
                      <p className="mt-1 text-xs leading-relaxed">
                        Enter a Focus Target Keyword in the core settings to analyze search engine factors, keyword density, image alt text, and readability.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Score & Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Optimization Score
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            seoAnalysis.score >= 80
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : seoAnalysis.score >= 50
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}
                        >
                          {seoAnalysis.score} / 100 &bull;{" "}
                          {seoAnalysis.score >= 80
                            ? "Well Optimized"
                            : seoAnalysis.score >= 50
                            ? "Moderate"
                            : "Needs Attention"}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            seoAnalysis.score >= 80
                              ? "bg-emerald-500"
                              : seoAnalysis.score >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.max(5, seoAnalysis.score)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                          Density
                        </span>
                        <span
                          className={`text-sm font-extrabold flex items-center justify-center gap-1 mt-0.5 ${
                            seoAnalysis.densityStatus === "optimal"
                              ? "text-emerald-500"
                              : seoAnalysis.densityStatus === "high"
                              ? "text-red-500"
                              : "text-amber-500"
                          }`}
                        >
                          {seoAnalysis.density}%
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 block">
                          {seoAnalysis.keywordCount}x used
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                          Words
                        </span>
                        <span className="text-sm font-extrabold text-foreground mt-0.5 block">
                          {seoAnalysis.wordCount}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 block">
                          {readingTime} min read
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                          Readability
                        </span>
                        <span className="text-sm font-extrabold text-foreground mt-0.5 block">
                          {seoAnalysis.readability ? seoAnalysis.readability.grade : "Good"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 block">
                          {seoAnalysis.readability ? `Flesch ${seoAnalysis.readability.fleschScore}` : "Standard"}
                        </span>
                      </div>
                    </div>

                    {/* 11-Point Search Engine Checklist */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Action Checklist ({seoAnalysis.items.filter((i) => i.passed).length}/{seoAnalysis.items.length})
                      </span>
                      <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        {seoAnalysis.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-2 text-xs p-2 rounded-lg bg-card border border-border/60 shadow-2xs"
                          >
                            {item.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-bold ${
                                    item.passed ? "text-foreground" : "text-foreground/90"
                                  }`}
                                >
                                  {item.label}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground shrink-0 pl-1.5">
                                  {item.score}/{item.maxScore}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Readability Diagnostic Details */}
                    {seoAnalysis.readability && (
                      <div className="p-2.5 bg-muted/20 border border-border/60 rounded-xl space-y-1 text-xs">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block">
                          Readability Diagnostics
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                          <div>Avg sentence: <strong className="text-foreground">{seoAnalysis.readability.avgSentenceLength}</strong> w</div>
                          <div>Avg syllables: <strong className="text-foreground">{seoAnalysis.readability.avgSyllablesPerWord}</strong>/w</div>
                          <div>Long sentences: <strong className="text-foreground">{seoAnalysis.readability.longSentences}</strong></div>
                          <div>Long paragraphs: <strong className="text-foreground">{seoAnalysis.readability.longParagraphs}</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
