"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import BlogEditor from "@/components/blog/BlogEditor";
import { EditorRenderer } from "@/components/EditorRenderer";
import { blogGeneralUiSchema } from "@/lib/schemas/blog/blog-ui-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Settings2,
} from "lucide-react";
import FaqManager, { FaqItem } from "@/components/faq/FaqManager";
import { TooltipProvider } from "@/components/ui/tooltip";
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

interface ExtractedDoc {
  fullText: string;
  introText: string;
  headingTexts: string[];
  wordCount: number;
}

function extractTextFromTipTap(json: any): ExtractedDoc {
  if (!json) {
    return { fullText: "", introText: "", headingTexts: [], wordCount: 0 };
  }

  if (typeof json === "string") {
    const plain = json.replace(/<[^>]+>/g, " ");
    const words = plain.trim().split(/\s+/).filter(Boolean);
    return {
      fullText: plain,
      introText: plain.slice(0, 500),
      headingTexts: [],
      wordCount: words.length,
    };
  }

  const allWords: string[] = [];
  const headingTexts: string[] = [];
  let firstParagraphText = "";

  function traverse(node: any) {
    if (!node) return;
    if (node.type === "heading" && Array.isArray(node.content)) {
      const headingText = node.content.map((c: any) => c.text || "").join(" ").trim();
      if (headingText) headingTexts.push(headingText);
    }
    if (node.type === "paragraph" && !firstParagraphText && Array.isArray(node.content)) {
      firstParagraphText = node.content.map((c: any) => c.text || "").join(" ").trim();
    }
    if (node.text) {
      allWords.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(json);

  const fullText = allWords.join(" ");
  const words = fullText.trim().split(/\s+/).filter(Boolean);

  return {
    fullText,
    introText: firstParagraphText || fullText.slice(0, 500),
    headingTexts,
    wordCount: words.length,
  };
}

function countKeywordOccurrences(text: string, keyword: string): number {
  if (!text || !keyword.trim()) return 0;
  const trimmed = keyword.trim().toLowerCase();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWord = /^\w/.test(trimmed);
  const endsWithWord = /\w$/.test(trimmed);
  const pattern = `${startsWithWord ? "(?:^|\\s|[.,!?;:\"'()\\[\\]{}])" : ""}(${escaped})${endsWithWord ? "(?:$|\\s|[.,!?;:\"'()\\[\\]{}])" : ""}`;
  try {
    const regex = new RegExp(pattern, "gi");
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  } catch {
    let count = 0;
    let pos = 0;
    const lowerText = text.toLowerCase();
    while ((pos = lowerText.indexOf(trimmed, pos)) !== -1) {
      count++;
      pos += trimmed.length;
    }
    return count;
  }
}

interface SeoCheckItem {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
}

interface SeoAnalysisResult {
  hasKeyword: boolean;
  score: number;
  items: SeoCheckItem[];
  keywordCount: number;
  density: number;
  densityStatus: "optimal" | "low" | "high" | "none";
  wordCount: number;
}

function analyzeSeo(
  keyword: string,
  title: string,
  slug: string,
  metaDesc: string,
  content: any,
  overrideWordCount?: number | null
): SeoAnalysisResult {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return {
      hasKeyword: false,
      score: 0,
      items: [],
      keywordCount: 0,
      density: 0,
      densityStatus: "none",
      wordCount: typeof overrideWordCount === "number" ? overrideWordCount : 0,
    };
  }

  const { fullText, introText, headingTexts, wordCount: extractedCount } = extractTextFromTipTap(content);
  const wordCount = typeof overrideWordCount === "number" ? overrideWordCount : extractedCount;
  const lowerKeyword = trimmedKeyword.toLowerCase();
  const keywordOccurrences = countKeywordOccurrences(fullText, trimmedKeyword);
  const keywordWordCount = trimmedKeyword.split(/\s+/).filter(Boolean).length;
  const density = wordCount > 0 ? (keywordOccurrences * keywordWordCount / wordCount) * 100 : 0;
  const roundedDensity = Math.round(density * 10) / 10;

  // 1. In Title (20 pts)
  const inTitle = title.toLowerCase().includes(lowerKeyword);
  const titleItem: SeoCheckItem = {
    id: "title",
    label: "Focus Keyword in Title",
    passed: inTitle,
    score: inTitle ? 20 : 0,
    maxScore: 20,
    message: inTitle ? "Keyword appears in the title" : "Add focus keyword to the blog title",
  };

  // 2. In Slug (15 pts)
  const slugifiedKeyword = lowerKeyword.replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
  const inSlug =
    (slug && slugifiedKeyword && slug.toLowerCase().includes(slugifiedKeyword)) ||
    (slug && slug.toLowerCase().includes(lowerKeyword.replace(/[^a-z0-9]/g, "")));
  const slugItem: SeoCheckItem = {
    id: "slug",
    label: "Focus Keyword in URL Slug",
    passed: Boolean(inSlug),
    score: inSlug ? 15 : 0,
    maxScore: 15,
    message: inSlug ? "Keyword appears in the URL slug" : "Include focus keyword in the URL slug",
  };

  // 3. In Meta Description (15 pts)
  const inMeta = metaDesc.toLowerCase().includes(lowerKeyword);
  const metaItem: SeoCheckItem = {
    id: "meta",
    label: "Focus Keyword in Meta Description",
    passed: inMeta,
    score: inMeta ? 15 : 0,
    maxScore: 15,
    message: inMeta ? "Keyword appears in the meta description" : "Add focus keyword to the meta description",
  };

  // 4. In Intro (15 pts)
  const inIntro = countKeywordOccurrences(introText, trimmedKeyword) > 0;
  const introItem: SeoCheckItem = {
    id: "intro",
    label: "Focus Keyword in Introduction",
    passed: inIntro,
    score: inIntro ? 15 : 0,
    maxScore: 15,
    message: inIntro ? "Keyword appears in the first paragraph" : "Include focus keyword in the introductory paragraph",
  };

  // 5. In Headings (15 pts)
  const inHeadings = headingTexts.some((h) => countKeywordOccurrences(h, trimmedKeyword) > 0);
  const headingsItem: SeoCheckItem = {
    id: "headings",
    label: "Focus Keyword in Subheadings",
    passed: inHeadings,
    score: inHeadings ? 15 : 0,
    maxScore: 15,
    message: inHeadings ? "Keyword found in at least one subheading (H2/H3)" : "Use focus keyword in at least one subheading",
  };

  // 6. Keyword Density (10 pts)
  let densityStatus: "optimal" | "low" | "high" | "none" = "none";
  let densityScore = 0;
  let densityMessage = "Keyword does not appear in the content";

  if (keywordOccurrences > 0) {
    if (roundedDensity >= 0.8 && roundedDensity <= 2.5) {
      densityStatus = "optimal";
      densityScore = 10;
      densityMessage = `Optimal density: ${roundedDensity}% (${keywordOccurrences}x)`;
    } else if (roundedDensity < 0.8) {
      densityStatus = "low";
      densityScore = 5;
      densityMessage = `Density is low: ${roundedDensity}% (${keywordOccurrences}x). Aim for 0.8% - 2.5%`;
    } else {
      densityStatus = "high";
      densityScore = 4;
      densityMessage = `High density: ${roundedDensity}% (${keywordOccurrences}x). Risk of keyword stuffing`;
    }
  }

  const densityItem: SeoCheckItem = {
    id: "density",
    label: "Keyword Density",
    passed: densityStatus === "optimal",
    score: densityScore,
    maxScore: 10,
    message: densityMessage,
  };

  // 7. Word Count (10 pts)
  let wordCountScore = 0;
  let wordCountPassed = false;
  let wordCountMessage = "Content is too short (< 100 words)";
  if (wordCount >= 300) {
    wordCountScore = 10;
    wordCountPassed = true;
    wordCountMessage = `Good content length (${wordCount} words)`;
  } else if (wordCount >= 100) {
    wordCountScore = 5;
    wordCountMessage = `Acceptable length (${wordCount} words). Recommended >= 300 words`;
  }

  const wordCountItem: SeoCheckItem = {
    id: "wordCount",
    label: "Content Length",
    passed: wordCountPassed,
    score: wordCountScore,
    maxScore: 10,
    message: wordCountMessage,
  };

  const items = [titleItem, slugItem, metaItem, introItem, headingsItem, densityItem, wordCountItem];
  const totalScore = items.reduce((acc, item) => acc + item.score, 0);

  return {
    hasKeyword: true,
    score: totalScore,
    items,
    keywordCount: keywordOccurrences,
    density: roundedDensity,
    densityStatus,
    wordCount,
  };
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

  // Tab & Editor Word Count
  const [editorTab, setEditorTab] = useState<"general" | "content" | "faqs">("content");
  const [editorWordCount, setEditorWordCount] = useState<number | null>(null);

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
  const content = watchedValues.content;
  const faqs = watchedValues.faqs ?? [];

  // Real-time SEO Analysis
  const seoAnalysis = useMemo(() => {
    return analyzeSeo(focusKeyword, title, slug, metaDesc, content, editorWordCount);
  }, [focusKeyword, title, slug, metaDesc, content, editorWordCount]);

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
        JSON.stringify(tags || []) !== JSON.stringify(initialData.tags || []) ||
        JSON.stringify(categories || []) !== JSON.stringify(initialData.categories || []) ||
        allowComments !== initialData.allowComments ||
        featuredImage !== initialData.featuredImage ||
        excerpt !== initialData.excerpt ||
        metaTitle !== initialData.metaTitle ||
        metaDesc !== initialData.metaDesc ||
        focusKeyword !== initialData.focusKeyword ||
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
    content,
    faqs,
  ]);

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
    if (!blogId) return;
    setDiscarding(true);
    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard-draft" }),
      });
      if (!response.ok) throw new Error("Failed to discard draft");

      clearBackup();
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
      }

      toast.add({
        title: publishStatus === "published" ? "Publish Validation Failed" : "Draft Validation Failed",
        description: firstIssue?.message || "Please fix the required fields.",
        type: "error",
      });
      return;
    }

    const isStatusChanged = isEditMode && publishStatus !== status;
    if (!isDirtyOrFilled && !isStatusChanged) {
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

  return (
    <TooltipProvider delay={200}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Draft Info Banner */}
        {(hasCloudDraft || loadedFromBackup) && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <p className="text-xs font-semibold text-amber-900">
                {loadedFromBackup
                  ? `You're editing an emergency backup from ${lastSavedAt}.`
                  : lastSavedAt
                  ? `You're editing a saved cloud draft from ${lastSavedAt}. Changes won't go live until you publish.`
                  : `You're editing a saved cloud draft. Changes won't go live until you publish.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loadedFromBackup && (
                <button
                  type="button"
                  onClick={() => {
                    clearBackup();
                    window.location.reload();
                  }}
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
                  Discard Backup
                </button>
              )}
              {hasCloudDraft && (
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
              )}
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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={isSubmitting || !isDirtyOrFilled}
              className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && status === "draft" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave("published")}
              disabled={
                isSubmitting ||
                (isEditMode
                  ? status === "published" && !hasCloudDraft && !isDirtyOrFilled
                  : !isDirtyOrFilled)
              }
              className="flex items-center gap-2 h-9 px-4 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] bg-black hover:bg-black/90 text-white disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && status === "published" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publish
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden w-full relative">
          <div className="mx-auto w-full h-full flex flex-col lg:flex-row max-w-full p-4 md:p-6 gap-6">
            {/* Main Content / Editor Column */}
            <div className="flex-1 h-full flex flex-col overflow-hidden min-h-125">
              {isLoading ? (
                <ScreenLoader
                  text="Loading Blog Post..."
                  subtitle="Fetching article content and SEO settings..."
                />
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  {/* Editor Top Navigation Tabs */}
                  <div className="flex items-center justify-between pb-3 shrink-0">
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
                    </div>
                  </div>

                  {/* General Info Tab Content */}
                  <div
                    className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-card rounded-xl border border-border ${
                      editorTab === "general" ? "block" : "hidden"
                    }`}
                  >
                    <div className="max-w-4xl mx-auto space-y-6">
                      <div>
                        <h2 className="text-base font-bold text-foreground">General Article Information</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configure the core details, featured cover image, taxonomy, and reader interaction settings for this post.
                        </p>
                      </div>

                      <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs">
                        <EditorRenderer schema={blogGeneralUiSchema} control={control} />
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
                </div>
              )}
            </div>

            {/* Sidebar Settings Column - Strictly Real-Time SEO */}
            <div className="shrink-0 h-full overflow-y-auto pb-8 pr-2 custom-scrollbar w-full lg:w-95">
              <div className="space-y-4">
                {/* SEO & Meta */}
                <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                  <div className="flex w-full items-center justify-between p-4 text-sm font-bold text-foreground border-b border-border bg-accent/20">
                    SEO &amp; Meta
                  </div>
                  <div className="p-4 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label
                          htmlFor="slug"
                          className="text-xs font-bold uppercase tracking-wider text-muted-foreground block"
                        >
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
                          <Input
                            id="slug"
                            value={field.value || ""}
                            onChange={(e) => {
                              field.onChange(e);
                              if (errors.slug) clearErrors("slug");
                            }}
                            className={`text-sm ${
                              errors.slug ? "border-destructive focus-visible:ring-destructive" : ""
                            }`}
                            placeholder="the-future-of-nextjs"
                          />
                        )}
                      />
                    </div>

                    {/* Google Search Preview */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm font-sans space-y-1 mb-2">
                      <div className="flex items-center gap-2 mb-1 text-[12px] text-gray-700">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <Search className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <div>
                          <span className="block font-medium">YS Innovations</span>
                          <span className="block text-gray-500 text-[11px] truncate w-60">
                            {process.env.NEXT_PUBLIC_APP_URL || "https://ysinnovations.com"}/blogs/
                            {slug || "slug"}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-[18px] text-[#1a0dab] hover:underline cursor-pointer truncate font-medium">
                        {metaTitle || title || "SEO Title Preview"}
                      </h3>
                      <p className="text-[13px] text-[#4d5156] line-clamp-2 leading-snug">
                        {metaDesc ||
                          excerpt ||
                          "Write an engaging meta description that encourages users to click through to your content from search engines."}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label
                          htmlFor="metaTitle"
                          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          Meta Title
                        </Label>
                        {errors.metaTitle && (
                          <span className="text-[11px] font-semibold text-destructive">
                            {errors.metaTitle.message}
                          </span>
                        )}
                      </div>
                      <Controller
                        name="metaTitle"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="metaTitle"
                            value={field.value || ""}
                            onChange={(e) => {
                              field.onChange(e);
                              if (errors.metaTitle) clearErrors("metaTitle");
                            }}
                            placeholder="SEO Title (50-60 chars)"
                            className={`mt-1 text-sm ${errors.metaTitle ? "border-destructive" : ""}`}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label
                          htmlFor="metaDesc"
                          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          Meta Description
                        </Label>
                        {errors.metaDesc && (
                          <span className="text-[11px] font-semibold text-destructive">
                            {errors.metaDesc.message}
                          </span>
                        )}
                      </div>
                      <Controller
                        name="metaDesc"
                        control={control}
                        render={({ field }) => (
                          <textarea
                            id="metaDesc"
                            className={`flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 mt-1 ${
                              errors.metaDesc
                                ? "border-destructive focus-visible:ring-destructive"
                                : "border-input focus-visible:ring-ring"
                            }`}
                            value={field.value || ""}
                            onChange={(e) => {
                              field.onChange(e);
                              if (errors.metaDesc) clearErrors("metaDesc");
                            }}
                            placeholder="SEO Description (150-160 chars)"
                          />
                        )}
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="focusKeyword"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Focus Keyword
                      </Label>
                      <Controller
                        name="focusKeyword"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="focusKeyword"
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="e.g. Next.js tutorial"
                            className="mt-2 text-sm"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Standalone SEO Health Advisor Card */}
                <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                  <div className="flex w-full items-center justify-between p-4 text-sm font-bold text-foreground border-b border-border bg-accent/20">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      SEO Health Advisor
                    </span>
                    {seoAnalysis.hasKeyword && (
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
                    )}
                  </div>

                  <div className="p-4">
                    {!seoAnalysis.hasKeyword ? (
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-foreground">Real-Time SEO Advisor</p>
                          <p className="mt-1 text-xs leading-relaxed">
                            Enter a focus keyword in the SEO &amp; Meta section above to analyze keyword density,
                            search ranking factors, and on-page optimization.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {/* Header with Score & Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              Overall Score
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                seoAnalysis.score >= 80
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : seoAnalysis.score >= 50
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-500 border border-red-500/20"
                              }`}
                            >
                              {seoAnalysis.score} / 100 &bull;{" "}
                              {seoAnalysis.score >= 80
                                ? "Good"
                                : seoAnalysis.score >= 50
                                ? "Fair"
                                : "Needs Work"}
                            </span>
                          </div>

                          {/* Animated Progress Bar */}
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

                        {/* Keyword Density & Stats Badge */}
                        <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                          <div>
                            <span className="block text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                              Density
                            </span>
                            <span
                              className={`text-base font-extrabold flex items-center justify-center gap-1 mt-0.5 ${
                                seoAnalysis.densityStatus === "optimal"
                                  ? "text-emerald-500"
                                  : seoAnalysis.densityStatus === "high"
                                  ? "text-red-500"
                                  : "text-amber-500"
                              }`}
                            >
                              {seoAnalysis.density}%
                              <span className="text-xs font-normal opacity-80">
                                ({seoAnalysis.keywordCount}x)
                              </span>
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                              Words
                            </span>
                            <span className="text-base font-extrabold text-foreground mt-0.5 block">
                              {seoAnalysis.wordCount}
                            </span>
                          </div>
                        </div>

                        {/* Checklist */}
                        <div className="space-y-2.5 pt-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                            Search Engine Checklist
                          </span>
                          <div className="space-y-2">
                            {seoAnalysis.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-2.5 text-xs sm:text-[13px] leading-snug py-0.5"
                              >
                                {item.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`font-semibold ${
                                      item.passed ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                  <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                                    {item.message}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-muted-foreground shrink-0 pl-1">
                                  {item.score}/{item.maxScore}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
