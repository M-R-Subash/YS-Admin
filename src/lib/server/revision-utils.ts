import prisma from "@/lib/prisma";
import { BlogSnapshotData } from "@/types/revision";

/**
 * Extracts plain text from a TipTap JSON node tree.
 */
export function extractTextFromTipTap(node: any): string {
  if (!node) return "";
  if (typeof node === "string") {
    try {
      node = JSON.parse(node);
    } catch {
      return node;
    }
  }
  let text = "";
  if (node.text) {
    text += " " + node.text;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      text += " " + extractTextFromTipTap(child);
    }
  }
  return text.trim();
}

/**
 * Calculates word count from a TipTap document.
 */
export function calculateWordCount(content: any): number {
  const plainText = extractTextFromTipTap(content);
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates reading time in minutes (assuming 200 WPM).
 */
export function calculateReadingTime(content: any): number {
  const words = calculateWordCount(content);
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Compares two array of strings for shallow equality.
 */
function areStringArraysEqual(a?: string[] | null, b?: string[] | null): boolean {
  const listA = a || [];
  const listB = b || [];
  if (listA.length !== listB.length) return false;
  const sortedA = [...listA].sort();
  const sortedB = [...listB].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Compares two FAQ arrays for semantic equality.
 */
function areFaqsEqual(a?: any[] | null, b?: any[] | null): boolean {
  const listA = a || [];
  const listB = b || [];
  if (listA.length !== listB.length) return false;
  const normA = listA.map((f) => ({ q: (f?.question || "").trim(), a: (f?.answer || "").trim() }));
  const normB = listB.map((f) => ({ q: (f?.question || "").trim(), a: (f?.answer || "").trim() }));
  return JSON.stringify(normA) === JSON.stringify(normB);
}

/**
 * Normalizes and compares TipTap content objects.
 */
function isContentEqual(a: any, b: any): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const parseIfString = (val: any) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };

  const parsedA = parseIfString(a);
  const parsedB = parseIfString(b);

  const cleanDoc = (doc: any): any => {
    if (!doc || typeof doc !== "object") return doc;
    const clone = { ...doc };
    delete clone.faqs;
    return clone;
  };

  return JSON.stringify(cleanDoc(parsedA)) === JSON.stringify(cleanDoc(parsedB));
}

/**
 * Checks whether the incoming publish payload is identical to the most recent snapshot.
 * If identical, we avoid creating a duplicate revision.
 */
export function isRevisionDuplicate(
  previousSnapshot: BlogSnapshotData | null,
  currentPayload: {
    title?: string;
    content?: any;
    excerpt?: string | null;
    featuredImage?: string | null;
    tags?: string[];
    categories?: string[];
    faqs?: any[];
    metaTitle?: string | null;
    metaDesc?: string | null;
    focusKeyword?: string | null;
    ogImage?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean;
    authorName?: string | null;
  }
): boolean {
  if (!previousSnapshot) return false;

  const titleEqual = (previousSnapshot.title || "").trim() === (currentPayload.title || "").trim();
  const excerptEqual = (previousSnapshot.excerpt || "").trim() === (currentPayload.excerpt || "").trim();
  const imageEqual = (previousSnapshot.featuredImage || null) === (currentPayload.featuredImage || null);
  const tagsEqual = areStringArraysEqual(previousSnapshot.tags, currentPayload.tags);
  const categoriesEqual = areStringArraysEqual(previousSnapshot.categories, currentPayload.categories);
  const faqsEqual = areFaqsEqual(previousSnapshot.faqs, currentPayload.faqs);
  const contentEqual = isContentEqual(previousSnapshot.content, currentPayload.content);

  // Compare core SEO fields if present
  const prevSeo = previousSnapshot.seo;
  const seoEqual =
    (prevSeo?.metaTitle || null) === (currentPayload.metaTitle || null) &&
    (prevSeo?.metaDesc || null) === (currentPayload.metaDesc || null) &&
    (prevSeo?.focusKeyword || null) === (currentPayload.focusKeyword || null) &&
    (prevSeo?.ogImage || null) === (currentPayload.ogImage || null) &&
    (prevSeo?.canonicalUrl || null) === (currentPayload.canonicalUrl || null) &&
    Boolean(prevSeo?.noIndex) === Boolean(currentPayload.noIndex);

  return (
    titleEqual &&
    excerptEqual &&
    imageEqual &&
    tagsEqual &&
    categoriesEqual &&
    faqsEqual &&
    contentEqual &&
    seoEqual
  );
}

/**
 * Prunes historical revisions to enforce the max limit (e.g. 5 revisions).
 * Deletes oldest revisions by versionNumber ascending.
 */
export async function pruneRevisions(blogId: string, maxAllowed = 5): Promise<number> {
  const count = await prisma.blogRevision.count({ where: { blogId } });
  if (count <= maxAllowed) return 0;

  const toDelete = await prisma.blogRevision.findMany({
    where: { blogId },
    orderBy: { versionNumber: "asc" },
    take: count - maxAllowed,
    select: { id: true },
  });

  if (toDelete.length > 0) {
    const result = await prisma.blogRevision.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });
    return result.count;
  }
  return 0;
}

/**
 * Creates a blog snapshot revision if substantive changes exist.
 * Automatically computes version number, word count, reading time, and prunes old revisions.
 */
export async function createBlogRevisionSnapshot(params: {
  blogId: string;
  payload: {
    title: string;
    slug: string;
    content: any;
    excerpt?: string | null;
    featuredImage?: string | null;
    allowComments?: boolean;
    readingTime?: number | null;
    tags?: string[];
    categories?: string[];
    faqs?: any[];
    seo?: any;
    metaTitle?: string | null;
    metaDesc?: string | null;
    focusKeyword?: string | null;
    ogImage?: string | null;
    ogTitle?: string | null;
    ogDesc?: string | null;
    canonicalUrl?: string | null;
    structuredData?: any;
    noIndex?: boolean;
    authorName?: string | null;
    authorRole?: string | null;
    authorDescription?: string | null;
  };
  action: "published" | "updated" | "scheduled-publish" | "restored" | string;
  savedById?: string | null;
  force?: boolean; // If true, bypasses duplicate check (e.g. on explicit restore)
}) {
  const { blogId, payload, action, savedById, force } = params;

  // 1. Fetch latest revision to check for deduplication
  const latestRevision = await prisma.blogRevision.findFirst({
    where: { blogId },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      snapshotData: true,
    },
  });

  // 2. Perform smart deduplication
  if (!force && latestRevision?.snapshotData) {
    const isDuplicate = isRevisionDuplicate(
      latestRevision.snapshotData as unknown as BlogSnapshotData,
      payload
    );
    if (isDuplicate) {
      // Content has not changed since last publish; avoid duplicate revision
      return null;
    }
  }

  // 3. Compute version number
  const nextVersionNumber = (latestRevision?.versionNumber ?? 0) + 1;

  // 4. Calculate word count and reading time
  const wordCount = calculateWordCount(payload.content);
  const readingTime = payload.readingTime || calculateReadingTime(payload.content);

  // 5. Assemble snapshotData
  const snapshotData: BlogSnapshotData = {
    title: payload.title,
    slug: payload.slug,
    featuredImage: payload.featuredImage || null,
    allowComments: payload.allowComments ?? true,
    content: payload.content,
    excerpt: payload.excerpt || null,
    readingTime,
    wordCount,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    faqs: Array.isArray(payload.faqs) ? payload.faqs : [],
    seo: {
      metaTitle: payload.metaTitle ?? payload.seo?.metaTitle ?? null,
      metaDesc: payload.metaDesc ?? payload.seo?.metaDesc ?? null,
      focusKeyword: payload.focusKeyword ?? payload.seo?.focusKeyword ?? null,
      ogImage: payload.ogImage ?? payload.seo?.ogImage ?? null,
      ogTitle: payload.ogTitle ?? payload.seo?.ogTitle ?? null,
      ogDesc: payload.ogDesc ?? payload.seo?.ogDesc ?? null,
      canonicalUrl: payload.canonicalUrl ?? payload.seo?.canonicalUrl ?? null,
      structuredData: payload.structuredData ?? payload.seo?.structuredData ?? null,
      noIndex: Boolean(payload.noIndex ?? payload.seo?.noIndex ?? false),
      authorName: payload.authorName ?? payload.seo?.authorName ?? null,
      authorRole: payload.authorRole ?? payload.seo?.authorRole ?? null,
      authorDescription: payload.authorDescription ?? payload.seo?.authorDescription ?? null,
    },
    publishedAt: new Date().toISOString(),
  };

  // 6. Create revision record
  const revision = await prisma.blogRevision.create({
    data: {
      blogId,
      versionNumber: nextVersionNumber,
      snapshotData: snapshotData as any,
      action,
      wordCount,
      readingTime,
      savedById: savedById || null,
    },
  });

  // 7. Auto-prune to maintain maximum 5 revisions
  await pruneRevisions(blogId, 5);

  return revision;
}
