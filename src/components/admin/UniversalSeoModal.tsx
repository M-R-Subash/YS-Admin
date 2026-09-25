"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoogleSearchPreview } from "@/components/seo/GoogleSearchPreview";
import { SocialSharePreview } from "@/components/seo/SocialSharePreview";
import { SchemaOrgBuilder } from "@/components/seo/SchemaOrgBuilder";
import {
  universalSeoFormSchema,
  UniversalSeoFormData,
} from "@/lib/schemas/seo-validation";
import { calculateQuickSeoScore } from "@/lib/seo/seo-engine";
import { toast } from "@/components/ui/toast";
import { Loader2, Globe, Share2, Code2, Sparkles, UserCheck, Search } from "lucide-react";
import type { SeoEntityType } from "@/types/seo";

interface UniversalSeoModalProps {
  entityId: string;
  entityType: SeoEntityType;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialData: any; // { title, slug, allowComments?, authorId?, seo?: SeoMetadata }
}

export function UniversalSeoModal({
  entityId,
  entityType,
  isOpen,
  onClose,
  onSaved,
  initialData,
}: UniversalSeoModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "social" | "indexing">("search");
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Fetch users list for blog author selection if needed
  useEffect(() => {
    if (isOpen && entityType === "blog") {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.users)) {
            setUsers(data.users);
          }
        })
        .catch((err) => console.error("Failed to load users:", err));
    }
  }, [isOpen, entityType]);

  const defaultValues = useMemo<UniversalSeoFormData>(() => {
    const hasCustomAuthor = Boolean(initialData.seo?.authorName);
    const authorSelection = hasCustomAuthor
      ? "custom"
      : initialData.authorId || "none";

    return {
      title: initialData.title || "",
      slug: initialData.slug || "",
      allowComments: initialData.allowComments ?? true,
      metaTitle: initialData.seo?.metaTitle || "",
      metaDesc: initialData.seo?.metaDesc || "",
      focusKeyword: initialData.seo?.focusKeyword || "",
      ogImage: initialData.seo?.ogImage || "",
      ogTitle: initialData.seo?.ogTitle || "",
      ogDesc: initialData.seo?.ogDesc || "",
      canonicalUrl: initialData.seo?.canonicalUrl || "",
      structuredData: initialData.seo?.structuredData
        ? typeof initialData.seo.structuredData === "object"
          ? JSON.stringify(initialData.seo.structuredData, null, 2)
          : initialData.seo.structuredData
        : "",
      noIndex: Boolean(initialData.seo?.noIndex),
      authorSelection,
      authorId: initialData.authorId || null,
      authorName: initialData.seo?.authorName || "",
      authorRole: initialData.seo?.authorRole || "",
      authorDescription: initialData.seo?.authorDescription || "",
    };
  }, [initialData]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UniversalSeoFormData>({
    resolver: zodResolver(universalSeoFormSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
      setActiveTab("search");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entityId]);

  const watchedTitle = watch("title") || "";
  const watchedSlug = watch("slug") || "";
  const watchedMetaTitle = watch("metaTitle") || "";
  const watchedMetaDesc = watch("metaDesc") || "";
  const watchedFocusKeyword = watch("focusKeyword") || "";
  const watchedOgTitle = watch("ogTitle") || "";
  const watchedOgDesc = watch("ogDesc") || "";
  const watchedOgImage = watch("ogImage") || "";
  const watchedCanonicalUrl = watch("canonicalUrl") || "";
  const watchedAuthorSelection = watch("authorSelection") || "none";

  // Calculate live health score
  const health = useMemo(() => {
    return calculateQuickSeoScore(
      {
        metaTitle: watchedMetaTitle,
        metaDesc: watchedMetaDesc,
        focusKeyword: watchedFocusKeyword,
        ogImage: watchedOgImage,
        canonicalUrl: watchedCanonicalUrl,
        structuredData: watch("structuredData") || "",
      },
      watchedTitle,
      initialData.featuredImage
    );
  }, [
    watchedMetaTitle,
    watchedMetaDesc,
    watchedFocusKeyword,
    watchedOgImage,
    watchedCanonicalUrl,
    watch,
    watchedTitle,
    initialData.featuredImage,
  ]);

  const onSubmit = async (data: UniversalSeoFormData) => {
    if (!isDirty) {
      return;
    }

    setIsSaving(true);
    try {
      const endpoint =
        entityType === "blog"
          ? `/api/blogs/${entityId}/seo`
          : `/api/webpages/${entityId}/seo`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to save SEO metadata.");
      }

      toast.add({
        title: "SEO Updated",
        description: `Successfully updated SEO settings for "${data.title}".`,
        type: "success",
      });

      // Reset baseline to newly saved data so isDirty flips back to false
      reset(data);
      onSaved?.();
    } catch (err: any) {
      toast.add({
        title: "Failed to Save",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const pathPrefix = entityType === "blog" ? "/blogs/" : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[88vh] max-h-[880px] min-h-[600px] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
        {/* Header - Fixed at Top */}
        <div className="shrink-0 px-6 py-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Globe className="size-4" />
              </div>
              <DialogTitle className="text-base font-extrabold text-foreground tracking-tight">
                SEO Quick Edit &bull; {entityType === "blog" ? "Blog Article" : "Webpage"}
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-xl font-medium">
              {watchedTitle || "Editing SEO metadata"}
            </p>
          </div>

          {/* Real-time Health Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold self-start sm:self-auto font-mono shadow-xs ${
              health.score >= 80
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : health.score >= 50
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            <Sparkles className="size-3.5" />
            <span>SEO Score: {health.score}/100</span>
            <span className="opacity-80 font-normal">({health.label})</span>
          </div>
        </div>

        {/* Tab Navigation - Fixed Below Header */}
        <div className="shrink-0 flex border-b border-border bg-muted/40 px-6 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "search"
                ? "border-primary text-foreground font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="size-3.5" />
            <span>Google Search</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("social")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "social"
                ? "border-primary text-foreground font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="size-3.5" />
            <span>Social Card (OG)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("indexing")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "indexing"
                ? "border-primary text-foreground font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="size-3.5" />
            <span>Indexing &amp; Schema</span>
          </button>
        </div>

        {/* Form Container - Fixed Height with Independent Scrollable Body and Docked Footer */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            {/* TAB 1: Search */}
            {activeTab === "search" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Live Google SERP Snippet Preview */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Search className="size-3.5 text-primary" />
                      Live Google SERP Snippet
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      How this {entityType === "blog" ? "article" : "page"} appears in Google search engine result pages.
                    </p>
                  </div>

                  <GoogleSearchPreview
                    title={watchedMetaTitle || watchedTitle}
                    slug={watchedSlug}
                    description={
                      watchedMetaDesc ||
                      "Write an engaging meta description that encourages clicks from Google."
                    }
                    pathPrefix={pathPrefix}
                  />

                  <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs text-muted-foreground">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-500" />
                      Snippet Optimization Tips
                    </p>
                    <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
                      <li>Keep Meta Title between <strong>50–60 characters</strong> to prevent truncation.</li>
                      <li>Place your <strong>Focus Keyword</strong> near the beginning of the title.</li>
                      <li>Meta Descriptions between <strong>120–160 characters</strong> earn the highest click-through rates.</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column: Search Inputs */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="quick-title" className="text-xs font-bold text-foreground">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="quick-title"
                            value={field.value}
                            onChange={field.onChange}
                            className="text-xs h-9"
                          />
                        )}
                      />
                      {errors.title && (
                        <span className="text-[11px] text-destructive font-semibold">
                          {errors.title.message}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="quick-slug" className="text-xs font-bold text-foreground">
                        URL Slug <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex rounded-md border border-border overflow-hidden">
                        {pathPrefix && (
                          <span className="inline-flex items-center px-2.5 text-xs text-muted-foreground bg-muted border-r border-border select-none font-mono">
                            {pathPrefix}
                          </span>
                        )}
                        <Controller
                          name="slug"
                          control={control}
                          render={({ field }) => (
                            <Input
                              id="quick-slug"
                              value={field.value}
                              onChange={field.onChange}
                              className="border-0 rounded-none text-xs h-9 font-mono focus-visible:ring-0"
                            />
                          )}
                        />
                      </div>
                      {errors.slug && (
                        <span className="text-[11px] text-destructive font-semibold">
                          {errors.slug.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quick-focusKeyword" className="text-xs font-bold text-foreground">
                      Focus Target Keyword
                    </Label>
                    <Controller
                      name="focusKeyword"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="quick-focusKeyword"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="e.g. Next.js consulting"
                          className="text-xs h-9"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="quick-metaTitle" className="text-xs font-bold text-foreground">
                        Meta Title
                      </Label>
                      <span
                        className={`text-[11px] font-mono ${
                          watchedMetaTitle.length > 70
                            ? "text-destructive font-bold"
                            : watchedMetaTitle.length >= 50
                            ? "text-emerald-500 font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {watchedMetaTitle.length} / 70
                      </span>
                    </div>
                    <Controller
                      name="metaTitle"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="quick-metaTitle"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="SEO Title (50–60 characters recommended)"
                          className="text-xs h-9"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="quick-metaDesc" className="text-xs font-bold text-foreground">
                        Meta Description
                      </Label>
                      <span
                        className={`text-[11px] font-mono ${
                          watchedMetaDesc.length > 170
                            ? "text-destructive font-bold"
                            : watchedMetaDesc.length >= 120
                            ? "text-emerald-500 font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {watchedMetaDesc.length} / 170
                      </span>
                    </div>
                    <Controller
                      name="metaDesc"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          id="quick-metaDesc"
                          rows={4}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Compelling overview for search engines (120–160 characters)"
                          className="w-full rounded-md border border-input bg-card p-2.5 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Social */}
            {activeTab === "social" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Social Share Preview Card */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Share2 className="size-3.5 text-primary" />
                      Social Media Card Preview
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      How your link appears when shared on Facebook, LinkedIn, Twitter, and Slack.
                    </p>
                  </div>

                  <SocialSharePreview
                    title={watchedOgTitle || watchedMetaTitle || watchedTitle}
                    description={watchedOgDesc || watchedMetaDesc}
                    imageUrl={watchedOgImage || initialData.featuredImage}
                  />
                </div>

                {/* Right Column: Social Controls */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-ogTitle" className="text-xs font-bold text-foreground">
                      Open Graph Title
                    </Label>
                    <Controller
                      name="ogTitle"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="quick-ogTitle"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Defaults to Meta Title if blank"
                          className="text-xs h-9"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quick-ogDesc" className="text-xs font-bold text-foreground">
                      Open Graph Description
                    </Label>
                    <Controller
                      name="ogDesc"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          id="quick-ogDesc"
                          rows={3}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Defaults to Meta Description if blank"
                          className="w-full rounded-md border border-input bg-card p-2.5 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground block">
                      Social Share Image (1200 &times; 630 recommended)
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
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Indexing & Schema */}
            {activeTab === "indexing" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Indexing Controls & Canonical */}
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Code2 className="size-3.5 text-primary" />
                      Indexing &amp; Directives
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage search crawler visibility, canonicalization, and commenting rules.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quick-canonicalUrl" className="text-xs font-bold text-foreground">
                      Canonical URL Override
                    </Label>
                    <Controller
                      name="canonicalUrl"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="quick-canonicalUrl"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="https://example.com/canonical-url"
                          className="text-xs h-9"
                        />
                      )}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Leave blank to use the default URL as canonical.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-lg">
                    <div className="space-y-0.5 pr-2">
                      <Label htmlFor="quick-noIndex" className="text-xs font-bold text-foreground cursor-pointer">
                        Hide from Search Engines (<code className="text-[10px] px-1 py-0.5 bg-muted rounded font-mono">noindex</code>)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Directs Google and Bing crawlers not to index this page.
                      </p>
                    </div>
                    <Controller
                      name="noIndex"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="quick-noIndex"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  {entityType === "blog" && (
                    <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-lg">
                      <div className="space-y-0.5 pr-2">
                        <Label htmlFor="quick-allowComments" className="text-xs font-bold text-foreground cursor-pointer">
                          Reader Comments
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Allow visitors to post comments on this article.
                        </p>
                      </div>
                      <Controller
                        name="allowComments"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="quick-allowComments"
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  )}

                  {/* Author & E-E-A-T Signals (Blog Only) */}
                  {entityType === "blog" && (
                    <div className="pt-3 border-t border-border/70 space-y-3.5">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-primary" />
                          Author &amp; E-E-A-T Signals
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Search engines prioritize content authored by verified domain experts.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                          Author Selection
                        </Label>
                        <Controller
                          name="authorSelection"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || "none"}
                              onValueChange={(val) => {
                                field.onChange(val);
                                if (val !== "custom") {
                                  setValue("authorId", val === "none" ? null : val, { shouldDirty: true });
                                  setValue("authorName", "", { shouldDirty: true });
                                  setValue("authorRole", "", { shouldDirty: true });
                                  setValue("authorDescription", "", { shouldDirty: true });
                                } else {
                                  setValue("authorId", null, { shouldDirty: true });
                                }
                              }}
                            >
                              <SelectTrigger className="w-full text-xs h-9 bg-card">
                                <SelectValue placeholder="Select author">
                                  {(val: any) => {
                                    if (!val || val === "none") return "No specific author (Company default)";
                                    if (val === "custom") return "Custom Guest / External Author";
                                    const foundUser = users.find((u) => u.id === val);
                                    if (foundUser) {
                                      return `${foundUser.name || foundUser.email}${foundUser.authorRole ? ` (${foundUser.authorRole})` : ""}`;
                                    }
                                    return val;
                                  }}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent
                                side="bottom"
                                align="start"
                                sideOffset={6}
                                alignItemWithTrigger={false}
                                className="w-[var(--anchor-width)] min-w-[280px]"
                              >
                                <SelectItem value="none" label="No specific author (Company default)" className="text-xs">
                                  No specific author (Company default)
                                </SelectItem>
                                {users.map((u) => {
                                  const authorLabel = `${u.name || u.email}${u.authorRole ? ` (${u.authorRole})` : ""}`;
                                  return (
                                    <SelectItem key={u.id} value={u.id} label={authorLabel} className="text-xs">
                                      {authorLabel}
                                    </SelectItem>
                                  );
                                })}
                                <SelectItem value="custom" label="Custom Guest / External Author" className="text-xs">
                                  Custom Guest / External Author
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {watchedAuthorSelection === "custom" && (
                        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3.5 animate-in fade-in-50 duration-200">
                          <h4 className="text-xs font-bold text-foreground">Custom Guest Author Details</h4>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Guest Author Name</Label>
                            <Controller
                              name="authorName"
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="e.g. Dr. Jane Doe"
                                  className="text-xs h-9"
                                />
                              )}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Author Role / Title</Label>
                            <Controller
                              name="authorRole"
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="e.g. Senior Tech Lead"
                                  className="text-xs h-9"
                                />
                              )}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Author Bio</Label>
                            <Controller
                              name="authorDescription"
                              control={control}
                              render={({ field }) => (
                                <textarea
                                  {...field}
                                  value={field.value || ""}
                                  rows={2}
                                  placeholder="Brief background or credentials..."
                                  className="w-full rounded-md border border-input bg-card p-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Schema.org Builder */}
                <div className="lg:col-span-7 space-y-4">
                  <Controller
                    name="structuredData"
                    control={control}
                    render={({ field }) => (
                      <SchemaOrgBuilder
                        value={field.value}
                        onChange={field.onChange}
                        entityType={entityType}
                        title={watchedMetaTitle || watchedTitle}
                        description={watchedMetaDesc}
                        url={watchedSlug}
                        imageUrl={watchedOgImage || initialData.featuredImage}
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions - Docked at Bottom, Never shifts height */}
          <DialogFooter className="shrink-0 px-6 sm:px-8 py-4 border-t border-border bg-card/95 backdrop-blur-xs flex items-center justify-between gap-3 m-0">
            <div className="flex items-center gap-2 text-xs">
              {isDirty ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500/60" />
                  No changes made
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="h-10 px-5 text-xs font-semibold cursor-pointer rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || isSaving}
                className={`h-10 px-6 text-xs font-bold cursor-pointer rounded-lg flex items-center gap-2 transition-all ${
                  !isDirty || isSaving
                    ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
