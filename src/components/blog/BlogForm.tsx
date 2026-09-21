"use client";

import React, { useState, useEffect, useMemo, useRef, useDeferredValue, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import BlogEditor from "@/components/blog/BlogEditor";
import { EditorRenderer } from "@/components/EditorRenderer";
import {
  blogGeneralUiSchema,
  blogGeneralLeftUiSchema,
  blogGeneralRightUiSchema,
} from "@/lib/schemas/blog/blog-ui-schema";
import { GoogleSearchPreview } from "@/components/seo/GoogleSearchPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  FileText,
  Settings2,
  Search,
  Eye,
  ListTree,
  Wand2,
  ExternalLink,
  Link2,
  EyeOff,
  Share2,
  Globe,
  ChevronRight,
  ChevronDown,
  Clock,
  Maximize2,
  Minimize2,
} from "lucide-react";
import FaqManager, { FaqItem } from "@/components/faq/FaqManager";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { ScreenLoader } from "@/components/ui/screen-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmergencyDraft, getEmergencyBackup } from "@/hooks/useEmergencyDraft";
import {
  blogDraftSchema,
  blogPublishSchema,
  BlogFormData,
} from "@/lib/schemas/blog/blog-validation";
import {
  analyzeSeo,
  extractTextFromTipTap,
  type ExtractedDoc,
  type SeoAnalysisResult,
} from "@/lib/seo/blog-seo-analyzer";

// ─── Utility Helpers ──────────────────────────────────────────────────

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractTocFromTipTap(json: any): TocItem[] {
  if (!json || typeof json !== "object") return [];
  const items: TocItem[] = [];
  let headingIndex = 0;

  function traverse(node: any) {
    if (!node) return;
    if (node.type === "heading" && Array.isArray(node.content)) {
      const text = node.content.map((c: any) => c.text || "").join(" ").trim();
      if (text) {
        const level = node.attrs?.level || 2;
        const id = `heading-${headingIndex++}`;
        items.push({ id, text, level });
      }
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) traverse(child);
    }
  }

  traverse(json);
  return items;
}

function calculateReadingTime(json: any): number {
  if (!json) return 1;
  let text = "";
  const extractText = (node: any) => {
    if (!node) return;
    if (node.text) text += " " + node.text;
    if (Array.isArray(node.content)) {
      node.content.forEach(extractText);
    }
  };
  extractText(json);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Character counter color helper
function charCountColor(current: number, optimal: number, max: number): string {
  if (current > max) return "text-red-500";
  if (current >= optimal) return "text-emerald-500";
  if (current > 0) return "text-amber-500";
  return "text-muted-foreground";
}

interface BlogFormProps {
  blogId?: string;
}

export default function BlogForm({ blogId }: BlogFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(blogId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Initial Form Snapshot for dirty checking
  const [initialData, setInitialData] = useState<BlogFormData | null>(null);
  const [loadedFromBackup, setLoadedFromBackup] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasCloudDraft, setHasCloudDraft] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewSecret, setPreviewSecret] = useState<string>("");
  const [seoPreviewMode, setSeoPreviewMode] = useState<"google" | "social">("google");

  // Tab & Editor Word Count
  const [editorTab, setEditorTab] = useState<"general" | "content" | "faqs" | "seo">("content");
  const [editorWordCount, setEditorWordCount] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // React Hook Form
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<BlogFormData>({
    defaultValues: {
      title: "",
      slug: "",
      featuredImage: null,
      allowComments: true,
      status: "draft",
      content: null,
      excerpt: "",
      tags: [],
      categories: [],
      metaTitle: "",
      metaDesc: "",
      focusKeyword: "",
      ogImage: "",
      ogTitle: "",
      ogDesc: "",
      canonicalUrl: "",
      noIndex: false,
      faqs: [],
    },
    mode: "onChange",
  });

  // Real-time watched form values
  const watchedValues = useWatch({ control });
  const title = watchedValues.title ?? "";
  const slug = watchedValues.slug ?? "";
  const featuredImage = watchedValues.featuredImage ?? null;
  const allowComments = watchedValues.allowComments ?? true;
  const status = watchedValues.status ?? "draft";
  const tags = watchedValues.tags ?? [];
  const categories = watchedValues.categories ?? [];
  const excerpt = watchedValues.excerpt ?? "";
  const metaTitle = watchedValues.metaTitle ?? "";
  const metaDesc = watchedValues.metaDesc ?? "";
  const focusKeyword = watchedValues.focusKeyword ?? "";
  const ogImage = watchedValues.ogImage ?? "";
  const ogTitle = watchedValues.ogTitle ?? "";
  const ogDesc = watchedValues.ogDesc ?? "";
  const canonicalUrl = watchedValues.canonicalUrl ?? "";
  const noIndex = watchedValues.noIndex ?? false;
  const content = watchedValues.content;
  const faqs = watchedValues.faqs ?? [];

  // Deferred values for non-blocking background SEO calculation
  const deferredContent = useDeferredValue(content);
  const deferredWordCount = useDeferredValue(editorWordCount);
  const deferredKeyword = useDeferredValue(focusKeyword);
  const deferredTitle = useDeferredValue(title);
  const deferredSlug = useDeferredValue(slug);
  const deferredMetaDesc = useDeferredValue(metaDesc);

  const isSeoCalculating =
    content !== deferredContent ||
    focusKeyword !== deferredKeyword ||
    title !== deferredTitle ||
    slug !== deferredSlug ||
    metaDesc !== deferredMetaDesc;

  // Memoize TipTap AST traversal so changing keywords/meta doesn't re-parse the document
  const extractedDoc = useMemo(() => {
    return extractTextFromTipTap(deferredContent);
  }, [deferredContent]);

  // Real-time SEO Analysis using deferred values
  const seoAnalysis = useMemo(() => {
    return analyzeSeo(
      deferredKeyword,
      deferredTitle,
      deferredSlug,
      deferredMetaDesc,
      extractedDoc,
      deferredWordCount
    );
  }, [
    deferredKeyword,
    deferredTitle,
    deferredSlug,
    deferredMetaDesc,
    extractedDoc,
    deferredWordCount,
  ]);

  // Table of Contents from content
  const tocItems = useMemo(() => {
    return extractTocFromTipTap(deferredContent);
  }, [deferredContent]);

  // Heading hierarchy issue detection
  const tocIssues = useMemo(() => {
    const issues: { index: number; message: string }[] = [];
    const h1Count = tocItems.filter((i) => i.level === 1).length;
    if (h1Count > 1) {
      tocItems.forEach((item, idx) => {
        if (item.level === 1 && tocItems.findIndex((i) => i.level === 1) !== idx) {
          issues.push({ index: idx, message: "Multiple H1s detected — only one H1 should exist per article" });
        }
      });
    }
    for (let i = 1; i < tocItems.length; i++) {
      const prev = tocItems[i - 1];
      const curr = tocItems[i];
      if (curr.level > prev.level + 1) {
        const skipped = Array.from(
          { length: curr.level - prev.level - 1 },
          (_, k) => `H${prev.level + 1 + k}`
        ).join(", ");
        issues.push({
          index: i,
          message: `H${curr.level} appears after H${prev.level} — missing ${skipped}`,
        });
      }
    }
    return issues;
  }, [tocItems]);

  // Reading time
  const readingTime = useMemo(() => {
    return calculateReadingTime(deferredContent);
  }, [deferredContent]);

  // Scroll to heading in editor on TOC item click
  const handleTocClick = useCallback(
    (item: TocItem) => {
      if (editorTab !== "content") {
        setEditorTab("content");
      }
      setTimeout(() => {
        const headings = Array.from(
          document.querySelectorAll(
            ".tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4"
          )
        );
        const target = headings.find((el) => {
          const text = el.textContent?.trim() || "";
          return text.includes(item.text.trim()) || item.text.trim().includes(text);
        });
        if (target) {
          const scrollContainer = target.closest(".overflow-y-auto");
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const targetTop = targetRect.top - containerRect.top + scrollContainer.scrollTop - 20;
            scrollContainer.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
          } else {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          target.classList.add("ring-2", "ring-primary", "rounded-md", "transition-all", "duration-500");
          setTimeout(() => {
            target.classList.remove("ring-2", "ring-primary", "rounded-md");
          }, 1500);
        }
      }, 150);
    },
    [editorTab]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S → Save Draft
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        if (!isSubmitting && isDirtyOrFilledRef.current) {
          handleSaveRef.current("draft");
        }
      }
      // Ctrl+Shift+P → Publish
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        if (!isSubmitting) {
          handleSaveRef.current("published");
        }
      }
      // Escape → Exit fullscreen (only if no menus/dialogs are open)
      if (e.key === "Escape" && isFullscreen) {
        const hasOpenMenu = document.querySelector('[data-slot="dropdown-menu-content"], [role="menu"], [role="dialog"]');
        if (!hasOpenMenu) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, isFullscreen]);

  // Helpers to normalize content and faqs comparison
  const isContentEqual = (a: any, b: any) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const cleanDoc = (doc: any) => {
      if (!doc) return null;
      if (typeof doc === "string") {
        try {
          doc = JSON.parse(doc);
        } catch {
          return doc;
        }
      }
      if (typeof doc !== "object") return doc;
      const clone = { ...doc };
      delete clone.faqs;
      return clone;
    };
    return JSON.stringify(cleanDoc(a)) === JSON.stringify(cleanDoc(b));
  };

  const areFaqsEqual = (a: any[], b: any[]) => {
    const listA = a || [];
    const listB = b || [];
    if (listA.length !== listB.length) return false;
    return (
      JSON.stringify(listA.map((f) => ({ q: (f?.question || "").trim(), a: (f?.answer || "").trim() }))) ===
      JSON.stringify(listB.map((f) => ({ q: (f?.question || "").trim(), a: (f?.answer || "").trim() })))
    );
  };

  // Check if form is modified compared to initial snapshot
  const isDirtyOrFilled = useMemo(() => {
    if (isEditMode) {
      if (!initialData) return false;
      return (
        title !== initialData.title ||
        slug !== initialData.slug ||
        !arraysEqual(tags || [], initialData.tags || []) ||
        !arraysEqual(categories || [], initialData.categories || []) ||
        allowComments !== initialData.allowComments ||
        featuredImage !== initialData.featuredImage ||
        excerpt !== initialData.excerpt ||
        metaTitle !== initialData.metaTitle ||
        metaDesc !== initialData.metaDesc ||
        focusKeyword !== initialData.focusKeyword ||
        ogImage !== (initialData.ogImage || "") ||
        ogTitle !== (initialData.ogTitle || "") ||
        ogDesc !== (initialData.ogDesc || "") ||
        canonicalUrl !== (initialData.canonicalUrl || "") ||
        noIndex !== (initialData.noIndex || false) ||
        !areFaqsEqual(faqs, initialData.faqs || []) ||
        !isContentEqual(content, initialData.content)
      );
    } else {
      // Create Mode
      return (
        title.trim() !== "" ||
        slug.trim() !== "" ||
        (content &&
          JSON.stringify(content) !== '""' &&
          JSON.stringify(content) !== "null" &&
          JSON.stringify(content) !== '{"type":"doc","content":[]}') ||
        featuredImage !== null ||
        excerpt.trim() !== "" ||
        tags.length > 0 ||
        categories.length > 0 ||
        metaTitle.trim() !== "" ||
        metaDesc.trim() !== "" ||
        focusKeyword.trim() !== "" ||
        ogImage.trim() !== "" ||
        ogTitle.trim() !== "" ||
        ogDesc.trim() !== "" ||
        canonicalUrl.trim() !== "" ||
        noIndex !== false ||
        faqs.some((f) => f && (f.question?.trim() || f.answer?.trim()))
      );
    }
  }, [
    isEditMode,
    initialData,
    title,
    slug,
    tags,
    categories,
    allowComments,
    featuredImage,
    excerpt,
    metaTitle,
    metaDesc,
    focusKeyword,
    ogImage,
    ogTitle,
    ogDesc,
    canonicalUrl,
    noIndex,
    content,
    faqs,
  ]);

  // Refs for keyboard shortcuts (to avoid stale closures)
  const isDirtyOrFilledRef = useRef(isDirtyOrFilled);
  isDirtyOrFilledRef.current = isDirtyOrFilled;
  const handleSaveRef = useRef<(status: "draft" | "published", shouldExit?: boolean) => Promise<void>>(null!);

  // Auto-fill SEO meta from article content
  const handleAutoFillMeta = useCallback(() => {
    const currentTitle = getValues("title");
    const currentContent = getValues("content");
    const doc = extractTextFromTipTap(currentContent);

    if (currentTitle && !getValues("metaTitle")) {
      setValue("metaTitle", currentTitle.slice(0, 60), { shouldDirty: true });
    }
    if (doc.introText && !getValues("metaDesc")) {
      setValue("metaDesc", doc.introText.slice(0, 155), { shouldDirty: true });
    }
    if (doc.introText && !getValues("excerpt")) {
      setValue("excerpt", doc.introText.slice(0, 200), { shouldDirty: true });
    }
    toast.add({ title: "Auto-filled", description: "SEO meta fields populated from your article content.", type: "success" });
  }, [getValues, setValue]);



  // Fetch blog data if in edit mode
  useEffect(() => {
    if (!isEditMode || !blogId) return;

    async function fetchBlog() {
      try {
        const res = await fetch(`/api/blogs/${blogId}`);
        if (!res.ok) throw new Error("Failed to fetch blog");
        const data = await res.json();

        const dbTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
        const initialPayload = data.draftContent
          ? typeof data.draftContent === "string"
            ? JSON.parse(data.draftContent)
            : data.draftContent
          : data;

        setHasCloudDraft(Boolean(data.draftContent));
        if (data.previewSecret) {
          setPreviewSecret(data.previewSecret);
        }

        const blogTags = Array.isArray(initialPayload.tags)
          ? initialPayload.tags
          : initialPayload.tags
          ? String(initialPayload.tags)
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

        const blogCategories = Array.isArray(initialPayload.categories)
          ? initialPayload.categories
          : initialPayload.categories
          ? String(initialPayload.categories)
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

        const rawContent = initialPayload.content;
        let dbEditorContent = rawContent;
        let dbFaqs: FaqItem[] = [];
        if (rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)) {
          if (Array.isArray((rawContent as any).faqs)) {
            dbFaqs = (rawContent as any).faqs;
          }
          const clone = { ...(rawContent as any) };
          delete clone.faqs;
          dbEditorContent = clone;
        }
        if (dbFaqs.length === 0 && Array.isArray(initialPayload.faqs)) {
          dbFaqs = initialPayload.faqs;
        }

        const dbSnapshot: BlogFormData = {
          title: initialPayload.title || "",
          slug: initialPayload.slug || "",
          tags: blogTags,
          categories: blogCategories,
          allowComments: initialPayload.allowComments ?? true,
          status: initialPayload.status || "draft",
          content: dbEditorContent,
          featuredImage: initialPayload.featuredImage || null,
          excerpt: initialPayload.excerpt || "",
          metaTitle: initialPayload.metaTitle || initialPayload.seo?.metaTitle || "",
          metaDesc: initialPayload.metaDesc || initialPayload.seo?.metaDesc || "",
          focusKeyword: initialPayload.focusKeyword || initialPayload.seo?.focusKeyword || "",
          ogImage: initialPayload.ogImage || initialPayload.seo?.ogImage || "",
          ogTitle: initialPayload.ogTitle || initialPayload.seo?.ogTitle || "",
          ogDesc: initialPayload.ogDesc || initialPayload.seo?.ogDesc || "",
          canonicalUrl: initialPayload.canonicalUrl || initialPayload.seo?.canonicalUrl || "",
          noIndex: initialPayload.noIndex ?? initialPayload.seo?.noIndex ?? false,
          faqs: dbFaqs,
        };

        let effectiveData = { ...dbSnapshot };
        let isBackup = false;

        const backupKey = `emergency_blog_draft_${blogId || "new"}`;
        const backup = getEmergencyBackup<any>(backupKey, dbTime);

        if (backup && backup.data) {
          const bData = backup.data;
          const bFaqs = bData.faqs || bData.content?.faqs || [];
          const hasRealChanges =
            (bData.title !== undefined && bData.title !== dbSnapshot.title) ||
            (bData.slug !== undefined && bData.slug !== dbSnapshot.slug) ||
            (bData.excerpt !== undefined && bData.excerpt !== dbSnapshot.excerpt) ||
            (bData.featuredImage !== undefined && bData.featuredImage !== dbSnapshot.featuredImage) ||
            !isContentEqual(bData.content, dbSnapshot.content) ||
            !areFaqsEqual(bFaqs, dbSnapshot.faqs);

          if (hasRealChanges) {
            effectiveData = {
              ...dbSnapshot,
              ...bData,
              tags: Array.isArray(bData.tags) ? bData.tags : dbSnapshot.tags,
              categories: Array.isArray(bData.categories) ? bData.categories : dbSnapshot.categories,
              faqs: bFaqs,
            };
            isBackup = true;
            setLoadedFromBackup(true);
            setLastSavedAt(
              new Date(backup.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            );
          } else {
            try {
              localStorage.removeItem(backupKey);
            } catch {}
          }
        }

        // Initialize React Hook Form state
        reset(effectiveData);
        setInitialData(dbSnapshot);

        if (!isBackup && data.updatedAt) {
          try {
            setLastSavedAt(
              new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            );
          } catch {}
        }
      } catch {
        toast.add({ title: "Error", description: "Could not load blog post.", type: "error" });
        router.push("/blogs");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBlog();
  }, [blogId, isEditMode, reset, router]);

  // Emergency load for Create mode
  useEffect(() => {
    if (isEditMode) return;
    const backup = getEmergencyBackup<any>("emergency_blog_draft_new", 0);
    if (backup && backup.data) {
      setTimeout(() => {
        const bData = backup.data;
        const restored: BlogFormData = {
          title: bData.title || "",
          slug: bData.slug || "",
          tags: Array.isArray(bData.tags) ? bData.tags : [],
          categories: Array.isArray(bData.categories) ? bData.categories : [],
          allowComments: bData.allowComments ?? true,
          status: bData.status || "draft",
          content: bData.content || null,
          featuredImage: bData.featuredImage || null,
          excerpt: bData.excerpt || "",
          metaTitle: bData.metaTitle || "",
          metaDesc: bData.metaDesc || "",
          focusKeyword: bData.focusKeyword || "",
          ogImage: bData.ogImage || "",
          ogTitle: bData.ogTitle || "",
          ogDesc: bData.ogDesc || "",
          canonicalUrl: bData.canonicalUrl || "",
          noIndex: bData.noIndex ?? false,
          faqs: bData.faqs || bData.content?.faqs || [],
        };
        reset(restored);
        setLoadedFromBackup(true);
        setLastSavedAt(
          new Date(backup.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      }, 0);
    }
  }, [isEditMode, reset]);

  // Auto-generate slug from title
  const previousTitleRef = useRef<string>(title);
  useEffect(() => {
    if (!isEditMode || !getValues("slug")) {
      if (title && title !== previousTitleRef.current) {
        const autoSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        setValue("slug", autoSlug, { shouldDirty: true });
        if (errors.slug) clearErrors("slug");
      }
    }
    previousTitleRef.current = title;
  }, [title, isEditMode, getValues, setValue, errors.slug, clearErrors]);

  // Auto-save emergency draft hook
  const { clearBackup } = useEmergencyDraft({
    key: `emergency_blog_draft_${blogId || "new"}`,
    isDirty: isDirtyOrFilled,
    getPayload: () => getValues(),
  });

  const handleDiscardDraft = async () => {
    setDiscarding(true);
    try {
      if (hasCloudDraft && blogId) {
        const response = await fetch(`/api/blogs/${blogId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "discard-draft" }),
        });
        if (!response.ok) throw new Error("Failed to discard draft");
      }

      clearBackup();
      try {
        const backupKey = `emergency_blog_draft_${blogId || "new"}`;
        localStorage.removeItem(backupKey);
      } catch {}

      window.location.reload();
    } catch (err: any) {
      toast.add({ title: "Error", description: err.message, type: "error" });
      setDiscarding(false);
    }
  };

  const handleSave = async (publishStatus: "draft" | "published", shouldExit: boolean = false) => {
    clearErrors();

    const currentValues = getValues();
    const schema = publishStatus === "published" ? blogPublishSchema : blogDraftSchema;

    const calculateReadingTime = (json: any): number => {
      if (!json) return 1;
      let text = "";
      const extractText = (node: any) => {
        if (!node) return;
        if (node.text) text += " " + node.text;
        if (Array.isArray(node.content)) {
          node.content.forEach(extractText);
        }
      };
      extractText(json);
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(1, Math.ceil(words / 200));
    };

    const readingTime = calculateReadingTime(currentValues.content);
    const cleanFaqs = (currentValues.faqs || []).filter((f) => f.question?.trim() || f.answer?.trim());

    const validationPayload = {
      ...currentValues,
      readingTime,
      faqs: cleanFaqs,
      status: publishStatus,
      action: publishStatus === "draft" ? "save-draft" : "publish",
    };

    const validationResult = schema.safeParse(validationPayload);

    if (!validationResult.success) {
      const issues = validationResult.error.issues;

      issues.forEach((issue) => {
        const fieldPath = issue.path[0] as keyof BlogFormData;
        if (fieldPath) {
          setError(fieldPath, { type: "manual", message: issue.message });
        }
      });

      const firstIssue = issues[0];
      const firstField = firstIssue?.path[0] as string;

      // Smart tab navigation to locate the error
      if (["title", "featuredImage", "categories", "tags", "excerpt"].includes(firstField)) {
        setEditorTab("general");
      } else if (firstField === "content") {
        setEditorTab("content");
      } else if (firstField === "faqs") {
        setEditorTab("faqs");
      } else if (
        [
          "slug",
          "metaTitle",
          "metaDesc",
          "focusKeyword",
          "canonicalUrl",
          "ogTitle",
          "ogDesc",
          "ogImage",
        ].includes(firstField)
      ) {
        setEditorTab("seo");
      }

      toast.add({
        title: publishStatus === "published" ? "Publish Validation Failed" : "Draft Validation Failed",
        description: firstIssue?.message || "Please fix the required fields.",
        type: "error",
      });
      return;
    }

    const isPublishingStagedDraft = publishStatus === "published" && (hasCloudDraft || loadedFromBackup);
    const isStatusChanged = isEditMode && publishStatus !== status;
    if (!isDirtyOrFilled && !isStatusChanged && !isPublishingStagedDraft) {
      toast.add({ title: "No Changes", description: "No changes detected to save.", type: "info" });
      return;
    }

    setIsSubmitting(true);
    setValue("status", publishStatus);

    const contentPayload = {
      ...(currentValues.content || { type: "doc", content: [] }),
      faqs: cleanFaqs,
    };

    const payload = {
      title: currentValues.title,
      slug: currentValues.slug,
      featuredImage: currentValues.featuredImage,
      content: contentPayload,
      allowComments: currentValues.allowComments,
      status: publishStatus,
      tags: (currentValues.tags || []).map((t) => t.trim()).filter(Boolean),
      categories: (currentValues.categories || []).map((c) => c.trim()).filter(Boolean),
      excerpt: currentValues.excerpt,
      metaTitle: currentValues.metaTitle,
      metaDesc: currentValues.metaDesc,
      focusKeyword: currentValues.focusKeyword,
      ogImage: currentValues.ogImage || "",
      ogTitle: currentValues.ogTitle || "",
      ogDesc: currentValues.ogDesc || "",
      canonicalUrl: currentValues.canonicalUrl || "",
      noIndex: Boolean(currentValues.noIndex),
      readingTime,
      action: publishStatus === "draft" ? "save-draft" : "publish",
    };

    try {
      const endpoint = isEditMode ? `/api/blogs/${blogId}` : "/api/blogs";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save blog");
      }

      const responseData = await response.json();

      if (publishStatus === "published") {
        setValue("status", "published");
        setHasCloudDraft(false);
      } else {
        if (status !== "published") {
          setValue("status", "draft");
        }
        setHasCloudDraft(true);
      }
      setLoadedFromBackup(false);

      const newSnapshot: BlogFormData = {
        title: currentValues.title,
        slug: currentValues.slug,
        tags: [...(currentValues.tags || [])],
        categories: [...(currentValues.categories || [])],
        allowComments: currentValues.allowComments,
        status: publishStatus === "published" ? "published" : status,
        content: currentValues.content,
        featuredImage: currentValues.featuredImage,
        excerpt: currentValues.excerpt,
        metaTitle: currentValues.metaTitle,
        metaDesc: currentValues.metaDesc,
        focusKeyword: currentValues.focusKeyword,
        ogImage: currentValues.ogImage || "",
        ogTitle: currentValues.ogTitle || "",
        ogDesc: currentValues.ogDesc || "",
        canonicalUrl: currentValues.canonicalUrl || "",
        noIndex: Boolean(currentValues.noIndex),
        faqs: [...(currentValues.faqs || [])],
      };

      setInitialData(newSnapshot);
      reset(newSnapshot);

      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

      toast.add({
        title: "Success",
        description: `Blog ${publishStatus === "published" ? "published" : "saved as draft"} successfully.`,
        type: "success",
      });
      clearBackup();
      try {
        const backupKey = `emergency_blog_draft_${blogId || responseData?.id || "new"}`;
        localStorage.removeItem(backupKey);
      } catch {}

      if (shouldExit) {
        router.push("/blogs");
      } else if (!isEditMode && responseData && responseData.id) {
        router.replace(`/blogs/${responseData.id}`);
      }
    } catch (error: any) {
      toast.add({ title: "Error", description: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  handleSaveRef.current = handleSave;

  return (
    <TooltipProvider delay={200}>
      <div
        className={`flex flex-col bg-background overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFullscreen ? "fixed inset-0 z-40" : "h-screen"
        }`}
      >
        {/* Normal Top Header & Banner Wrapper (smooth collapse on fullscreen) */}
        <div
          className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 ${
            isFullscreen
              ? "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
              : "max-h-40 opacity-100 translate-y-0"
          }`}
        >
          {/* Draft Info Banner */}
          {(hasCloudDraft || loadedFromBackup) && (
            <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <p className="text-xs font-semibold text-amber-900">
                  {lastSavedAt
                    ? `You're editing an unpublished draft from ${lastSavedAt}. Changes won't go live until you publish.`
                    : `You're editing an unpublished draft. Changes won't go live until you publish.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold bg-amber-100 hover:bg-red-100 text-amber-900 hover:text-red-700 border border-amber-300 hover:border-red-300 transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  Discard Draft
                </button>
              </div>
            </div>
          )}

          {/* Top Header Bar */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 shadow-sm z-50 relative">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (isDirtyOrFilled) {
                  setShowExitConfirm(true);
                } else {
                  router.push("/blogs");
                }
              }}
              className="p-2 rounded-sm bg-black border border-black hover:bg-zinc-800 transition-all text-white shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-bold text-black tracking-tight">
                  {isEditMode ? "Edit Blog Post" : "Create Blog Post"}
                </h1>
                {isEditMode && status === "draft" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${isDirtyOrFilled ? "animate-pulse" : ""}`}
                    />
                    {isDirtyOrFilled ? "Unsaved Edits" : lastSavedAt ? `Draft · Saved ${lastSavedAt}` : "Draft Saved"}
                  </span>
                ) : isEditMode && status === "published" ? (
                  hasCloudDraft ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                      <span
                        className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${isDirtyOrFilled ? "animate-pulse" : ""}`}
                      />
                      {isDirtyOrFilled ? "Live · Unsaved Edits" : "Live · Draft Staged"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                      <span
                        className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isDirtyOrFilled ? "animate-pulse" : ""}`}
                      />
                      {isDirtyOrFilled ? "Unsaved Changes" : "Live Published"}
                    </span>
                  )
                ) : null}
              </div>
              <p className="text-xs text-black font-medium mt-1">
                {isEditMode ? "Make changes to your article." : "Write and publish a new article."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Autosave Status Indicator */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium mr-1">
              {isSubmitting ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              ) : isDirtyOrFilled ? (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </span>
              ) : lastSavedAt ? (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved {lastSavedAt}
                </span>
              ) : null}
            </div>

            {/* Preview Button (Icon-Only with Tooltip) */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (!slug) {
                      toast.add({
                        title: "Slug Required",
                        description: "Please enter a URL slug in the SEO tab to preview this post.",
                        type: "warning",
                      });
                      return;
                    }
                    const frontendUrl =
                      process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";
                    const previewUrl = previewSecret
                      ? `${frontendUrl}/api/draft?secret=${previewSecret}&slug=/blogs/${slug}`
                      : `${frontendUrl}/blogs/${slug}`;
                    window.open(previewUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="h-9 w-9 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Preview draft (opens new tab)</p>
              </TooltipContent>
            </Tooltip>

            {/* Fullscreen Toggle Button (Icon-Only, lg+ only) */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  className="hidden lg:flex h-9 w-9 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer items-center justify-center"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Split Publish Button with Save Draft Dropdown */}
            <div className="flex items-center">
              <Button
                onClick={() => handleSave("published")}
                disabled={
                  isSubmitting ||
                  (isEditMode
                    ? status === "published" && !hasCloudDraft && !loadedFromBackup && !isDirtyOrFilled
                    : !isDirtyOrFilled)
                }
                className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm rounded-r-none shadow-md transition-all hover:scale-[1.02] bg-black hover:bg-black/90 text-white disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isEditMode && status === "published" ? (hasCloudDraft || loadedFromBackup ? "Publish" : "Update") : "Publish"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      className="h-9 w-8 p-0 rounded-sm rounded-l-none border-l border-white/20 bg-black hover:bg-black/90 text-white shadow-md cursor-pointer flex items-center justify-center"
                    />
                  }
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-44">
                  <DropdownMenuItem
                    onClick={() => handleSave("draft")}
                    disabled={isSubmitting || !isDirtyOrFilled}
                    className="cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2 text-muted-foreground" />
                    Save Draft
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        </div>

        {/* Compact Fullscreen Toolbar (smooth slide down & fade in on fullscreen) */}
        <div
          className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 ${
            isFullscreen
              ? "max-h-16 opacity-100 translate-y-0 border-b border-border"
              : "max-h-0 opacity-0 -translate-y-2 border-b-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-card shrink-0 shadow-sm z-50">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-lg">
              <button
                type="button"
                onClick={() => setEditorTab("general")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  editorTab === "general"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                General
              </button>
              <button
                type="button"
                onClick={() => setEditorTab("content")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  editorTab === "content"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Article
              </button>
              <button
                type="button"
                onClick={() => setEditorTab("faqs")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  editorTab === "faqs"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                FAQs
              </button>
              <button
                type="button"
                onClick={() => setEditorTab("seo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  editorTab === "seo"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                SEO
              </button>
            </div>

            {/* Right side: autosave + preview + exit fullscreen + publish */}
            <div className="flex items-center gap-2">
              {/* Autosave indicator */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium mr-1">
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                ) : isDirtyOrFilled ? (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved
                  </span>
                ) : lastSavedAt ? (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved
                  </span>
                ) : null}
              </div>

              {/* Preview */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      if (!slug) {
                        toast.add({ title: "Slug Required", description: "Enter a URL slug in SEO tab to preview.", type: "warning" });
                        return;
                      }
                      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";
                      const previewUrl = previewSecret
                        ? `${frontendUrl}/api/draft?secret=${previewSecret}&slug=/blogs/${slug}`
                        : `${frontendUrl}/blogs/${slug}`;
                      window.open(previewUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="h-8 w-8 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Preview draft</p>
                </TooltipContent>
              </Tooltip>

              {/* Exit Fullscreen */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="h-8 w-8 p-0 rounded-sm border border-border shadow-xs hover:bg-muted transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Exit fullscreen (Esc)</p>
                </TooltipContent>
              </Tooltip>

              {/* Split Publish */}
              <div className="flex items-center">
                <Button
                  onClick={() => handleSave("published")}
                  disabled={
                    isSubmitting ||
                    (isEditMode
                      ? status === "published" && !hasCloudDraft && !loadedFromBackup && !isDirtyOrFilled
                      : !isDirtyOrFilled)
                  }
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-sm rounded-r-none shadow-md bg-black hover:bg-black/90 text-white disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isEditMode && status === "published" ? (hasCloudDraft || loadedFromBackup ? "Publish" : "Update") : "Publish"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        className="h-8 w-7 p-0 rounded-sm rounded-l-none border-l border-white/20 bg-black hover:bg-black/90 text-white shadow-md cursor-pointer flex items-center justify-center"
                      />
                    }
                  >
                    <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-44">
                    <DropdownMenuItem onClick={() => handleSave("draft")} disabled={isSubmitting || !isDirtyOrFilled} className="cursor-pointer">
                      <Save className="w-4 h-4 mr-2 text-muted-foreground" />
                      Save Draft
                      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          className={`flex-1 min-h-0 overflow-hidden w-full relative flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isFullscreen ? "p-3 md:p-4 gap-2.5" : "p-4 md:p-6 gap-3.5"
          }`}
        >
          {/* Editor Top Navigation Tabs (smooth collapse in fullscreen) */}
          <div
            className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 ${
              isFullscreen
                ? "max-h-0 opacity-0 -mb-2.5 pointer-events-none"
                : "max-h-16 opacity-100 mb-0"
            }`}
          >
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEditorTab("general")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    editorTab === "general"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  General Info
                  {(errors.title || errors.featuredImage || errors.categories || errors.excerpt) && (
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("content")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    editorTab === "content"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Article Content
                  {errors.content && (
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("faqs")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    editorTab === "faqs"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-primary" />
                  FAQ Section
                  {errors.faqs && (
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                  {faqs.length > 0 && !errors.faqs && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {faqs.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("seo")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    editorTab === "seo"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  SEO &amp; Meta
                  {(errors.slug ||
                    errors.metaTitle ||
                    errors.metaDesc ||
                    errors.canonicalUrl) && (
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                  {seoAnalysis.hasKeyword ? (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        seoAnalysis.score >= 80
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          : seoAnalysis.score >= 50
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          : "bg-red-500/15 text-red-600 border border-red-500/30"
                      }`}
                    >
                      {seoAnalysis.score}/100
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>

          {/* Workspace Row: Editor & Sidebar (or full-width tab content) */}
          <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row gap-5 overflow-hidden">
            {/* Main Content / Tab Column */}
            <div className="flex-1 h-full flex flex-col overflow-hidden min-h-0">
              {isLoading ? (
                <ScreenLoader
                  text="Loading Blog Post..."
                  subtitle="Fetching article content and SEO settings..."
                />
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden h-full min-h-0">

                  {/* General Info Tab Content (2-column layout to eliminate scrolling) */}
                  <div
                    className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-card rounded-xl border border-border ${
                      editorTab === "general" ? "block" : "hidden"
                    }`}
                  >
                    <div className="w-full max-w-7xl mx-auto space-y-5">
                      <div>
                        <h2 className="text-base font-bold text-foreground">General Article Information</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configure the core details, featured cover image, taxonomy, and reader interaction settings for this post.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Left Column: Title, Excerpt, Categories, Tags, Comments */}
                        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs">
                          <EditorRenderer schema={blogGeneralLeftUiSchema} control={control} />
                        </div>

                        {/* Right Column: Featured Cover Image & Guidelines */}
                        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
                          <EditorRenderer schema={blogGeneralRightUiSchema} control={control} />
                          <div className="rounded-lg bg-muted/30 border border-border/60 p-4 text-xs text-muted-foreground space-y-1.5">
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Cover Image Guidelines
                            </p>
                            <p className="text-[11px] leading-relaxed">
                              Recommended dimensions: <strong>1200 &times; 630 px</strong> (1.91:1 ratio). This visual serves as your article&apos;s header banner and defaults as the social share preview card on Twitter, LinkedIn, and messaging apps.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Article Content TipTap Editor */}
                  <div
                    className={`flex-1 overflow-hidden h-full ${
                      editorTab === "content" ? "flex flex-col" : "hidden"
                    }`}
                  >
                    {errors.content && (
                      <div className="mb-3 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2 shrink-0">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{typeof errors.content?.message === "string" ? errors.content.message : "Article content cannot be empty"}</span>
                      </div>
                    )}
                    <Controller
                      name="content"
                      control={control}
                      render={({ field }) => (
                        <BlogEditor
                          initialContent={field.value}
                          onChange={(val) => {
                            field.onChange(val);
                            if (errors.content) clearErrors("content");
                          }}
                          onWordCountChange={setEditorWordCount}
                        />
                      )}
                    />
                  </div>

                  {/* FAQ Manager Area */}
                  <div
                    className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-card rounded-xl border border-border ${
                      editorTab === "faqs" ? "block" : "hidden"
                    }`}
                  >
                    {errors.faqs && (
                      <div className="mb-4 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{typeof errors.faqs?.message === "string" ? errors.faqs.message : "Both Question and Answer are required for each FAQ item"}</span>
                      </div>
                    )}
                    <Controller
                      name="faqs"
                      control={control}
                      render={({ field }) => (
                        <FaqManager
                          value={field.value || []}
                          onChange={(val) => {
                            field.onChange(val);
                            if (errors.faqs) clearErrors("faqs");
                          }}
                          title="Blog Post Frequently Asked Questions"
                          description="Add FAQ items to appear at the end of this blog post. If empty, the FAQ section will not render on the public blog."
                        />
                      )}
                    />
                  </div>

                  {/* SEO & Meta Tab Content */}
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
                                description={metaDesc || excerpt || "Write an engaging meta description that encourages search clicks..."}
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
                                    {ogDesc || metaDesc || excerpt || "Summary teaser shown when readers share this blog on Twitter, LinkedIn, and messaging apps."}
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
                </div>
              )}
            </div>

            {/* Sidebar Column - Table of Contents & Article Insights (only shown when Article Content is active) */}
            {editorTab === "content" && (
              <div className="shrink-0 h-full w-full lg:w-72 xl:w-80 flex flex-col gap-4 min-h-0">
                {/* Table of Contents Card (flex-1 to fill available space down to overview card) */}
                <div className="flex-1 min-h-0 border border-border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
                  <div className="flex w-full items-center justify-between p-3.5 text-xs font-bold uppercase tracking-wider text-foreground border-b border-border bg-accent/20 shrink-0">
                    <span className="flex items-center gap-2">
                      <ListTree className="w-4 h-4 text-primary" />
                      Table of Contents
                    </span>
                    <div className="flex items-center gap-1.5">
                      {tocIssues.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                        {tocItems.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
                    {tocItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-6 px-3 text-center space-y-2 text-muted-foreground">
                        <ListTree className="w-8 h-8 mx-auto opacity-30" />
                        <p className="text-xs font-semibold text-foreground">No Headings Yet</p>
                        <p className="text-[11px] leading-relaxed">
                          Add H2, H3, or H4 subheadings in the Article Content tab to automatically build your outline.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Heading Hierarchy Warning Banner */}
                        {tocIssues.length > 0 && (
                          <div className="flex items-start gap-2 p-2.5 mb-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                            <div>
                              <p className="text-[11px] font-bold">
                                {tocIssues.length} heading hierarchy {tocIssues.length === 1 ? "issue" : "issues"}
                              </p>
                              <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                                Proper heading order (H2 → H3 → H4) improves SEO and accessibility.
                              </p>
                            </div>
                          </div>
                        )}
                        {tocItems.map((item, idx) => {
                          const paddingLeft =
                            item.level === 1
                              ? "pl-1"
                              : item.level === 2
                              ? "pl-3"
                              : item.level === 3
                              ? "pl-6"
                              : "pl-9";

                          const issue = tocIssues.find((i) => i.index === idx);

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleTocClick(item)}
                              className={`w-full text-left py-1.5 px-2 rounded-md text-xs transition-all flex items-center gap-2 group hover:bg-muted/70 cursor-pointer ${paddingLeft} ${
                                issue ? "bg-amber-50/60 border border-amber-200/50" : ""
                              }`}
                              title={issue ? issue.message : item.text}
                            >
                              <span className={`text-[10px] font-bold px-1 py-0.2 rounded shrink-0 select-none ${
                                issue
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted/80 text-muted-foreground group-hover:text-foreground"
                              }`}>
                                H{item.level}
                              </span>
                              <span className="truncate flex-1 text-foreground/90 group-hover:text-foreground">
                                {item.text}
                              </span>
                              {issue && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="shrink-0">
                                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[200px]">
                                    <p className="text-xs">{issue.message}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Article Insights & Quick Health Card (pinned to bottom of column) */}
                <div className="shrink-0 border border-border rounded-xl bg-card shadow-sm overflow-hidden p-4 space-y-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Article Overview
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Reading Time
                      </span>
                      <span className="text-sm font-extrabold text-foreground mt-0.5 block">
                        {readingTime} min
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Word Count
                      </span>
                      <span className="text-sm font-extrabold text-foreground mt-0.5 block">
                        {editorWordCount ?? seoAnalysis.wordCount}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/60">
                    <div className="flex items-center justify-between py-0.5">
                      <span>Subheadings:</span>
                      <strong className="text-foreground">{tocItems.length}</strong>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span>Document Images:</span>
                      <strong className="text-foreground">{extractedDoc.imageNodes.length}</strong>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span>Internal/External Links:</span>
                      <strong className="text-foreground">{extractedDoc.linkNodes.length}</strong>
                    </div>
                  </div>

                  {/* Mini SEO Shortcut */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground">SEO Health</span>
                      {seoAnalysis.hasKeyword ? (
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
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No Keyword</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditorTab("seo")}
                      className="w-full text-center py-1.5 px-3 rounded-md text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Open SEO &amp; Meta Tab</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exit Confirmation Dialog */}
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have modifications that haven&apos;t been saved to your draft yet. What would you like to do before leaving?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
              <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Stay Here</AlertDialogCancel>
              <button
                type="button"
                onClick={() => router.push("/blogs")}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md transition-all cursor-pointer"
              >
                Exit Without Saving
              </button>
              <AlertDialogAction
                onClick={() => handleSave("draft", true)}
                disabled={isSubmitting}
                className="bg-black hover:bg-zinc-800 text-white"
              >
                Save Draft &amp; Exit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Discard Draft Confirmation Dialog */}
        <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard Draft Changes?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the current cloud draft and restore the editor to the live published version. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDiscardDraft}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {discarding ? "Discarding..." : "Discard Draft"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
