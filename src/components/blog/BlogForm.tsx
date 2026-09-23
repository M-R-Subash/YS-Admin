"use client";

import React, { useState, useEffect, useMemo, useRef, useDeferredValue, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { useEmergencyDraft, getEmergencyBackup } from "@/hooks/useEmergencyDraft";
import {
  blogDraftSchema,
  blogPublishSchema,
  BlogFormData,
} from "@/lib/schemas/blog/blog-validation";
import {
  analyzeSeo,
  extractTextFromTipTap,
} from "@/lib/seo/blog-seo-analyzer";
import { FaqItem } from "@/components/faq/FaqManager";
import {
  extractTocFromTipTap,
  calculateReadingTime,
  isContentEqual,
  areFaqsEqual,
  arraysEqual,
  TocItem,
  TocIssue,
} from "./blog-form-utils";
import {
  BlogFormProvider,
  BlogFormContextValue,
  BlogEditorTab,
} from "./context/BlogFormContext";

import { ExitConfirmDialog } from "./dialogs/ExitConfirmDialog";
import { DiscardDraftDialog } from "./dialogs/DiscardDraftDialog";
import { BlogDraftBanner } from "./header/BlogDraftBanner";
import { BlogFormHeader } from "./header/BlogFormHeader";
import { BlogFullscreenToolbar } from "./header/BlogFullscreenToolbar";
import { BlogTabNav } from "./header/BlogTabNav";
import { BlogGeneralTab } from "./tabs/BlogGeneralTab";
import { BlogContentTab } from "./tabs/BlogContentTab";
import { BlogFaqsTab } from "./tabs/BlogFaqsTab";
import { BlogSeoTab } from "./tabs/BlogSeoTab";
import { BlogSidebar } from "./sidebar/BlogSidebar";

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

  // Tabs & Fullscreen state
  const [editorTab, setEditorTab] = useState<BlogEditorTab>("general");
  const [seoPreviewMode, setSeoPreviewMode] = useState<"google" | "social">("google");
  const [editorWordCount, setEditorWordCount] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreviewSaving, setIsPreviewSaving] = useState(false);

  const {
    control,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    watch,
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
  const rawTags = watchedValues.tags;
  const tags = useMemo(() => rawTags ?? [], [rawTags]);
  const rawCategories = watchedValues.categories;
  const categories = useMemo(() => rawCategories ?? [], [rawCategories]);
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
  const rawFaqs = watchedValues.faqs;
  const faqs = useMemo(() => rawFaqs ?? [], [rawFaqs]);

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
    const issues: TocIssue[] = [];
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
  const handleSaveRef = useRef<(status: "draft" | "published", shouldExit?: boolean) => Promise<boolean>>(null!);

  useEffect(() => {
    isDirtyOrFilledRef.current = isDirtyOrFilled;
  }, [isDirtyOrFilled]);

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

  const handleSave = async (publishStatus: "draft" | "published", shouldExit: boolean = false): Promise<boolean> => {
    clearErrors();

    const currentValues = getValues();
    const schema = publishStatus === "published" ? blogPublishSchema : blogDraftSchema;

    const calcReadingTime = (json: any): number => {
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

    const calculatedTime = calcReadingTime(currentValues.content);
    const cleanFaqs = (currentValues.faqs || []).filter((f) => f.question?.trim() || f.answer?.trim());

    const validationPayload = {
      ...currentValues,
      readingTime: calculatedTime,
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
      return false;
    }

    const isPublishingStagedDraft = publishStatus === "published" && (hasCloudDraft || loadedFromBackup);
    const isStatusChanged = isEditMode && publishStatus !== status;
    if (!isDirtyOrFilled && !isStatusChanged && !isPublishingStagedDraft) {
      toast.add({ title: "No Changes", description: "No changes detected to save.", type: "info" });
      return true;
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
      readingTime: calculatedTime,
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

      // Cross-tab auto-sync for open preview tabs
      const activeId = blogId || responseData?.id;
      if (activeId) {
        try {
          const channel = new BroadcastChannel(`blog_preview_${activeId}`);
          channel.postMessage({
            type: "BLOG_DRAFT_UPDATED",
            id: activeId,
            slug: currentValues.slug,
          });
          channel.close();
        } catch (err) {
          console.warn("[live-preview] Could not broadcast draft update", err);
        }
      }

      if (shouldExit) {
        router.push("/blogs");
      } else if (!isEditMode && responseData && responseData.id) {
        router.replace(`/blogs/${responseData.id}`);
      }
      return true;
    } catch (error: any) {
      toast.add({ title: "Error", description: error.message, type: "error" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    handleSaveRef.current = handleSave;
  });

  // Auto-Save and Open/Focus Live Preview tab
  const handlePreview = async () => {
    const currentSlug = (getValues("slug") || "").trim();
    if (!currentSlug) {
      toast.add({
        title: "Slug Required",
        description: "Please enter a URL slug in the SEO tab to preview this post.",
        type: "warning",
      });
      setEditorTab("seo");
      return;
    }

    let activeId = blogId;

    // Auto-save latest draft if dirty or not yet created
    if (isDirtyOrFilled || !isEditMode) {
      setIsPreviewSaving(true);
      toast.add({
        title: "Preparing Live Preview",
        description: "Saving latest draft for preview...",
        type: "info",
      });
      const saveOk = await handleSave("draft", false);
      setIsPreviewSaving(false);
      if (!saveOk) return;
      activeId = blogId || activeId;
    }

    if (!activeId) {
      toast.add({
        title: "Preview Error",
        description: "Please save the blog draft once to initialize the preview.",
        type: "error",
      });
      return;
    }

    const previewUrl = `/blogs/preview/${activeId}`;
    const targetWindowName = `blog_preview_${activeId}`;
    const win = window.open(previewUrl, targetWindowName);
    if (win) {
      win.focus();
    }
  };

  const contextValue: BlogFormContextValue = {
    control,
    errors,
    setValue,
    getValues,
    clearErrors,
    watch,

    blogId,
    isEditMode,
    isSubmitting,
    isLoading,

    editorTab,
    setEditorTab,
    isFullscreen,
    setIsFullscreen,

    isDirtyOrFilled,
    hasCloudDraft,
    loadedFromBackup,
    lastSavedAt,

    seoPreviewMode,
    setSeoPreviewMode,
    editorWordCount,
    setEditorWordCount,
    isSeoCalculating,
    seoAnalysis,
    extractedDoc,
    readingTime,
    handleAutoFillMeta,

    tocItems,
    tocIssues,
    handleTocClick,

    handleSave,
    handlePreview,
    isPreviewSaving,
    handleDiscardDraft,
    discarding,

    showExitConfirm,
    setShowExitConfirm,
    showDiscardConfirm,
    setShowDiscardConfirm,
  };

  return (
    <TooltipProvider delay={200}>
      <BlogFormProvider value={contextValue}>
        <div
          className={`flex flex-col bg-background overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isFullscreen ? "fixed inset-0 z-40" : "h-screen"
          }`}
        >
          {/* Unsaved Changes & Discard Draft Confirmation Dialogs */}
          <ExitConfirmDialog />
          <DiscardDraftDialog />

          {/* Normal Top Header & Banner Wrapper (smooth collapse on fullscreen) */}
          <div
            className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 ${
              isFullscreen
                ? "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                : "max-h-40 opacity-100 translate-y-0"
            }`}
          >
            <BlogDraftBanner />
            <BlogFormHeader />
          </div>

          {/* Compact Fullscreen Toolbar (smooth slide down & fade in on fullscreen) */}
          <BlogFullscreenToolbar />

          {/* Main Content Area */}
          <div
            className={`flex-1 min-h-0 overflow-hidden w-full relative flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isFullscreen ? "p-3 md:p-4 gap-2.5" : "p-4 md:p-6 gap-3.5"
            }`}
          >
            {/* Editor Top Navigation Tabs (smooth collapse in fullscreen) */}
            <BlogTabNav />

            {/* Workspace Row: Form Tabs + Sidebar */}
            <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <BlogGeneralTab />
                  <BlogContentTab />
                  <BlogFaqsTab />
                  <BlogSeoTab />
                  <BlogSidebar />
                </>
              )}
            </div>
          </div>
        </div>
      </BlogFormProvider>
    </TooltipProvider>
  );
}
