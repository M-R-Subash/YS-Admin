import type { ExtractedDoc, ImageNodeInfo, LinkNodeInfo } from "@/types/seo";

function isInternalLink(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    const url = new URL(href);
    return url.hostname.includes("ysinnovations.com");
  } catch {
    return false;
  }
}

const HEADING_KEYS = new Set([
  "title",
  "heading",
  "headline",
  "subheading",
  "subtitle",
  "secTitle",
  "sectionTitle",
  "heroTitle",
  "tagline",
]);


/**
 * Extracts searchable text, headings, and images from CMS Page schema blocks JSON.
 */
export function extractTextFromPageBlocks(data: any): ExtractedDoc {
  if (!data) {
    return {
      fullText: "",
      introText: "",
      headingTexts: [],
      wordCount: 0,
      imageNodes: [],
      linkNodes: [],
      sentences: [],
      paragraphLengths: [],
    };
  }

  const allWords: string[] = [];
  const headingTexts: string[] = [];
  const imageNodes: ImageNodeInfo[] = [];
  const linkNodes: LinkNodeInfo[] = [];
  const paragraphLengths: number[] = [];
  let firstParagraphText = "";
  let imageIndex = 0;

  function walk(val: any, keyName?: string) {
    if (val === null || val === undefined) return;

    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return;

      const lowerKey = (keyName || "").toLowerCase();

      // Heading detection
      if (HEADING_KEYS.has(lowerKey)) {
        headingTexts.push(trimmed);
        allWords.push(trimmed);
        return;
      }

      // Image detection
      if (
        lowerKey.includes("image") ||
        lowerKey.includes("icon") ||
        lowerKey.includes("avatar") ||
        lowerKey.includes("photo") ||
        /\.(jpg|jpeg|png|webp|svg|gif)($|\?)/i.test(trimmed)
      ) {
        imageNodes.push({
          src: trimmed,
          alt: keyName || `Page element ${imageIndex + 1}`,
          index: imageIndex++,
        });
        return;
      }

      // Link / URL detection
      if (lowerKey.includes("url") || lowerKey.includes("link") || lowerKey.includes("href")) {
        if (trimmed.startsWith("http") || trimmed.startsWith("/")) {
          linkNodes.push({
            href: trimmed,
            text: keyName || trimmed,
            isInternal: isInternalLink(trimmed),
          });
        }
      }

      // Body text detection
      allWords.push(trimmed);
      const wordLen = trimmed.split(/\s+/).filter(Boolean).length;
      if (wordLen > 0) {
        paragraphLengths.push(wordLen);
      }
      if (!firstParagraphText && wordLen >= 5) {
        firstParagraphText = trimmed;
      }
      return;
    }

    if (Array.isArray(val)) {
      for (const item of val) {
        walk(item, keyName);
      }
      return;
    }

    if (typeof val === "object") {
      // Check for structured Image object e.g. { url, alt }
      if (val.url && typeof val.url === "string") {
        imageNodes.push({
          src: val.url,
          alt: val.alt || val.title || keyName || "",
          index: imageIndex++,
        });
      }

      for (const [k, v] of Object.entries(val)) {
        walk(v, k);
      }
    }
  }

  walk(data);

  const fullText = allWords.join(" ");
  const words = fullText.trim().split(/\s+/).filter(Boolean);
  const sentences = fullText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    fullText,
    introText: firstParagraphText || fullText.slice(0, 500),
    headingTexts,
    wordCount: words.length,
    imageNodes,
    linkNodes,
    sentences,
    paragraphLengths,
  };
}

export const pageAdapter = extractTextFromPageBlocks;
