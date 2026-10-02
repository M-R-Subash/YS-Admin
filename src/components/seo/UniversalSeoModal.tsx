"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDirtyManager } from "@/hooks/useDirtyManager";
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
import { Loader2, Globe, Share2, Code2, Sparkles, UserCheck, Search, Building2, User, Pencil, Eye, ArrowLeft } from "lucide-react";
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
  const [mobileSubTab, setMobileSubTab] = useState<"edit" | "preview">("edit");
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

  // Pre-seed users with initialData.author if present so the active author is immediately available in dropdown
  useEffect(() => {
    if (initialData?.author && initialData.author.id) {
      setUsers((prev) => {
        if (prev.some((u) => u.id === initialData.author.id)) return prev;
        return [initialData.author, ...prev];
      });
    }
  }, [initialData?.author]);

  const defaultValues = useMemo<UniversalSeoFormData>(() => {
    const hasCustomAuthor = Boolean(initialData.seo?.authorName);
    const activeAuthorId =
      initialData.authorId ||
      initialData.author?.id ||
      initialData.seo?.authorId ||
      null;
    const authorSelection = hasCustomAuthor
      ? "custom"
      : activeAuthorId || "none";

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
      authorId: hasCustomAuthor ? null : activeAuthorId,
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
    formState: { errors, isDirty: formIsDirty },
  } = useForm<UniversalSeoFormData>({
    resolver: zodResolver(universalSeoFormSchema) as any,
    defaultValues,
  });

  const dirtyManager = useDirtyManager({
    isDirty: formIsDirty,
    onMarkClean: (data) => reset(data),
  });

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
      setActiveTab("search");
      setMobileSubTab("edit");
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
    if (!dirtyManager.isDirty) {
      return;
    }

    setIsSaving(true);
    try {
      const endpoint =
        entityType === "blog"
          ? `/api/blogs/${entityId}/seo`
          : `/api/pages/${entityId}/seo`;

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

      // Reset baseline to newly saved data so dirtyManager flips back to clean
      dirtyManager.markClean(data);
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
      <DialogContent className="fixed inset-0 top-0 left-0 right-0 bottom-0 translate-x-0 translate-y-0 w-full max-w-full h-dvh max-h-none duration-300 ease-in-out transition-transform data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right data-starting-style:translate-x-full data-ending-style:translate-x-full sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl sm:h-[88vh] sm:max-h-220 sm:min-h-150 sm:duration-150 sm:data-open:slide-in-from-right-0 sm:data-closed:slide-out-to-right-0 sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95 sm:data-starting-style:translate-x-[-50%] sm:data-ending-style:translate-x-[-50%] flex flex-col p-0 overflow-hidden bg-card border-0 sm:border border-border rounded-none sm:rounded-xl shadow-2xl">
        {/* Header - Fixed at Top */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 pr-12 sm:pr-14">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile Back Arrow Button */}
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer shrink-0"
                title="Go back"
              >
                <ArrowLeft className="size-4" />
              </button>

              <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 hidden sm:flex">
                <Globe className="size-4" />
              </div>
              <DialogTitle className="text-sm sm:text-base font-extrabold text-foreground tracking-tight truncate">
                SEO Quick Edit &bull; {entityType === "blog" ? "Blog Article" : "Webpage"}
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-xl font-medium sm:pl-0 pl-1">
              {watchedTitle || "Editing SEO metadata"}
            </p>
          </div>

          {/* Real-time Health Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-bold self-start sm:self-auto font-mono shrink-0 shadow-xs ${
              health.score >= 80
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : health.score >= 50
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            <Sparkles className="size-3 sm:size-3.5" />
            <span>SEO Score: {health.score}/100</span>
            <span className="opacity-80 font-normal hidden sm:inline">({health.label})</span>
          </div>
        </div>

        {/* Tab Navigation - Fixed Below Header */}
        <div className="shrink-0 flex border-b border-border bg-muted/40 px-3 sm:px-6 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab("search");
              setMobileSubTab("edit");
            }}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
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
            onClick={() => {
              setActiveTab("social");
              setMobileSubTab("edit");
            }}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
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
            onClick={() => {
              setActiveTab("indexing");
            }}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
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
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
            {/* TAB 1: Search */}
            {activeTab === "search" && (
              <div>
                {/* Mobile Sub-Toggle for Edit vs Preview (Visible on < lg screens) */}
                <div className="lg:hidden flex items-center p-1 bg-muted/60 rounded-lg mb-4 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setMobileSubTab("edit")}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileSubTab === "edit"
                        ? "bg-card text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Pencil className="size-3.5" />
                    <span>Edit Fields</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileSubTab("preview")}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileSubTab === "preview"
                        ? "bg-card text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="size-3.5" />
                    <span>Live Preview</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  {/* Left Column: Live Google SERP Snippet Preview */}
                  <div
                    className={`lg:col-span-6 space-y-4 ${
                      mobileSubTab === "preview" ? "block" : "hidden lg:block"
                    }`}
                  >
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

                    <div className="lg:hidden pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMobileSubTab("edit")}
                        className="w-full text-xs font-bold flex items-center justify-center gap-1.5 h-9"
                      >
                        <Pencil className="size-3.5" />
                        <span>Back to Edit Fields</span>
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Search Inputs */}
                  <div
                    className={`lg:col-span-6 space-y-4 ${
                      mobileSubTab === "edit" ? "block" : "hidden lg:block"
                    }`}
                  >
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

                    <div className="lg:hidden pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMobileSubTab("preview")}
                        className="w-full text-xs font-bold flex items-center justify-center gap-1.5 h-9"
                      >
                        <Eye className="size-3.5" />
                        <span>Check Live Google Preview</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Social */}
            {activeTab === "social" && (
              <div>
                {/* Mobile Sub-Toggle for Edit vs Preview (Visible on < lg screens) */}
                <div className="lg:hidden flex items-center p-1 bg-muted/60 rounded-lg mb-4 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setMobileSubTab("edit")}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileSubTab === "edit"
                        ? "bg-card text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Pencil className="size-3.5" />
                    <span>Edit Fields</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileSubTab("preview")}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileSubTab === "preview"
                        ? "bg-card text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="size-3.5" />
                    <span>Live Preview</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  {/* Left Column: Social Share Preview Card */}
                  <div
                    className={`lg:col-span-6 space-y-4 ${
                      mobileSubTab === "preview" ? "block" : "hidden lg:block"
                    }`}
                  >
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

                    <div className="lg:hidden pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMobileSubTab("edit")}
                        className="w-full text-xs font-bold flex items-center justify-center gap-1.5 h-9"
                      >
                        <Pencil className="size-3.5" />
                        <span>Back to Edit Fields</span>
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Social Controls */}
                  <div
                    className={`lg:col-span-6 space-y-4 ${
                      mobileSubTab === "edit" ? "block" : "hidden lg:block"
                    }`}
                  >
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

                    <div className="lg:hidden pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMobileSubTab("preview")}
                        className="w-full text-xs font-bold flex items-center justify-center gap-1.5 h-9"
                      >
                        <Eye className="size-3.5" />
                        <span>Check Social Card Preview</span>
                      </Button>
                    </div>
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

                </div>

                {/* Right Column: Author & E-E-A-T Signals (Blog Only) + Schema.org Builder */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Author & E-E-A-T Signals (Blog Only) */}
                  {entityType === "blog" && (
                    <div className="space-y-3.5 pb-6 border-b border-border/70">
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
                              <SelectTrigger className="w-full text-xs h-11 bg-card px-3.5 cursor-pointer hover:border-primary/50 transition-colors shadow-2xs rounded-lg">
                                <SelectValue placeholder="Select author">
                                  {(val: any) => {
                                    if (!val || val === "none") {
                                      return (
                                        <div className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                                          <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                                            <Building2 className="w-3.5 h-3.5" />
                                          </div>
                                          <span className="truncate">No specific author (Company default)</span>
                                        </div>
                                      );
                                    }
                                    if (val === "custom") {
                                      return (
                                        <div className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                                          <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                                            <User className="w-3.5 h-3.5" />
                                          </div>
                                          <span className="truncate">Custom Guest / External Author</span>
                                        </div>
                                      );
                                    }
                                    const foundUser =
                                      users.find((u) => u.id === val) ||
                                      (initialData.author?.id === val ? initialData.author : null);
                                    if (foundUser) {
                                      const authorName = foundUser.name || foundUser.email || "Author";
                                      return (
                                        <div className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                                          {foundUser.profilePicture ? (
                                            <img
                                              src={foundUser.profilePicture}
                                              alt={authorName}
                                              className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/20 shrink-0">
                                              {(authorName[0] || "A").toUpperCase()}
                                            </div>
                                          )}
                                          <span className="truncate font-semibold text-foreground">
                                            {authorName}
                                            {foundUser.authorRole && (
                                              <span className="text-muted-foreground font-normal ml-1.5 text-[11px]">
                                                ({foundUser.authorRole})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      );
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
                                className="w-(--anchor-width) min-w-[320px] max-h-72"
                              >
                                <SelectItem value="none" label="No specific author (Company default)" className="text-xs py-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                                      <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                      <span className="font-semibold text-foreground">No specific author</span>
                                      <span className="text-[10px] text-muted-foreground">Company default</span>
                                    </div>
                                  </div>
                                </SelectItem>
                                {users.map((u) => {
                                  const authorName = u.name || u.email || "Author";
                                  const authorLabel = `${authorName}${u.authorRole ? ` (${u.authorRole})` : ""}`;
                                  return (
                                    <SelectItem key={u.id} value={u.id} label={authorLabel} className="text-xs py-2">
                                      <div className="flex items-center gap-2.5">
                                        {u.profilePicture ? (
                                          <img
                                            src={u.profilePicture}
                                            alt={authorName}
                                            className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/20 shrink-0">
                                            {(authorName[0] || "A").toUpperCase()}
                                          </div>
                                        )}
                                        <div className="flex flex-col text-left min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-foreground truncate">{authorName}</span>
                                            {u.role === "ADMIN" && (
                                              <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[9px] font-bold rounded-xs uppercase">
                                                Admin
                                              </span>
                                            )}
                                          </div>
                                          {u.authorRole ? (
                                            <span className="text-[10px] text-muted-foreground truncate">{u.authorRole}</span>
                                          ) : u.name && u.email ? (
                                            <span className="text-[10px] text-muted-foreground truncate font-mono">{u.email}</span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                                <SelectItem value="custom" label="Custom Guest / External Author" className="text-xs py-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                                      <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                      <span className="font-semibold text-foreground">Custom Guest / External Author</span>
                                      <span className="text-[10px] text-muted-foreground">Specify custom name, role &amp; credentials</span>
                                    </div>
                                  </div>
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

                  {/* Schema.org Builder */}
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
                        authorName={
                          watchedAuthorSelection === "custom"
                            ? watch("authorName")
                            : users.find((u) => u.id === watchedAuthorSelection)?.name ||
                              initialData.author?.name ||
                              ""
                        }
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions - Docked at Bottom, Never shifts height */}
          <DialogFooter className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 border-t border-border bg-card/95 backdrop-blur-xs flex flex-row items-center justify-between gap-3 m-0 rounded-none sm:rounded-b-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2 text-xs min-w-0">
              {dirtyManager.isDirty ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium truncate">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="truncate">Unsaved changes</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                  <span className="size-2 rounded-full bg-emerald-500/60 shrink-0" />
                  <span className="truncate">No changes made</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="h-9 sm:h-10 px-3.5 sm:px-5 text-xs font-semibold cursor-pointer rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={dirtyManager.isSaveDisabled(isSaving)}
                className={`h-9 sm:h-10 px-4 sm:px-6 text-xs font-bold cursor-pointer rounded-lg flex items-center gap-1.5 sm:gap-2 transition-all ${
                  dirtyManager.isSaveDisabled(isSaving)
                    ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-3.5 sm:size-4 animate-spin" />
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
