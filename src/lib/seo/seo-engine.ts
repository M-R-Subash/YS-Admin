import type {
  ExtractedDoc,
  ImageNodeInfo,
  LinkNodeInfo,
  ReadabilityResult,
  SeoAnalysisResult,
  SeoCheckItem,
  SeoEntityType,
  SeoMetadata,
} from "@/types/seo";
import { extractTextFromTipTap } from "./adapters/tiptap-adapter";
import { extractTextFromPageBlocks } from "./adapters/page-adapter";

export { extractTextFromTipTap, extractTextFromPageBlocks };

// ─── Keyword Counting ────────────────────────────────────────────────

export function countKeywordOccurrences(
  text: string,
  keyword: string
): number {
  if (!text || !keyword.trim()) return 0;
  const trimmed = keyword.trim().toLowerCase();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWord = /^\w/.test(trimmed);
  const endsWithWord = /\w$/.test(trimmed);
  const pattern = `${
    startsWithWord ? '(?:^|\\s|[.,!?;:\\"\'()\\[\\]{}])' : ""
  }(${escaped})${
    endsWithWord ? '(?:$|\\s|[.,!?;:\\"\'()\\[\\]{}])' : ""
  }`;
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

// ─── Readability Analysis (Flesch-Kincaid) ───────────────────────────

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^leas]e)$/, "");
  word = word.replace(/^re/, "re");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function analyzeReadability(doc: ExtractedDoc): ReadabilityResult {
  const { sentences, paragraphLengths, fullText } = doc;
  const words = fullText.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const totalSentences = Math.max(1, sentences.length);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLength = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / Math.max(1, totalWords);

  // Flesch Reading Ease
  const fleschScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord)
    )
  );

  let grade: string;
  if (fleschScore >= 80) grade = "Easy";
  else if (fleschScore >= 60) grade = "Standard";
  else if (fleschScore >= 40) grade = "Difficult";
  else grade = "Very Difficult";

  const longSentences = sentences.filter(
    (s) => s.split(/\s+/).filter(Boolean).length > 30
  ).length;
  const longParagraphs = paragraphLengths.filter((len) => len > 150).length;

  return {
    fleschScore,
    grade,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
    longSentences,
    longParagraphs,
  };
}

// ─── Universal SEO Analyzer ──────────────────────────────────────────

export function analyzeSeo(
  keyword: string,
  title: string,
  slug: string,
  metaDesc: string,
  contentOrDoc: any,
  overrideWordCount?: number | null,
  entityType: SeoEntityType = "blog"
): SeoAnalysisResult {
  const trimmedKeyword = keyword ? keyword.trim() : "";
  if (!trimmedKeyword) {
    return {
      hasKeyword: false,
      score: 0,
      items: [],
      keywordCount: 0,
      density: 0,
      densityStatus: "none",
      wordCount: typeof overrideWordCount === "number" ? overrideWordCount : 0,
      readability: null,
    };
  }

  // Resolve extracted document depending on input type
  let doc: ExtractedDoc;
  if (contentOrDoc && typeof contentOrDoc.fullText === "string") {
    doc = contentOrDoc as ExtractedDoc;
  } else if (entityType === "page") {
    doc = extractTextFromPageBlocks(contentOrDoc);
  } else {
    doc = extractTextFromTipTap(contentOrDoc);
  }

  const { fullText, introText, headingTexts, imageNodes, linkNodes } = doc;
  const wordCount =
    typeof overrideWordCount === "number" ? overrideWordCount : doc.wordCount;
  const lowerKeyword = trimmedKeyword.toLowerCase();
  const keywordOccurrences = countKeywordOccurrences(fullText, trimmedKeyword);
  const keywordWordCount = trimmedKeyword.split(/\s+/).filter(Boolean).length;
  const density =
    wordCount > 0
      ? ((keywordOccurrences * keywordWordCount) / wordCount) * 100
      : 0;
  const roundedDensity = Math.round(density * 10) / 10;

  // 1. Keyword in Title (15 pts)
  const inTitle = (title || "").toLowerCase().includes(lowerKeyword);
  const titleItem: SeoCheckItem = {
    id: "title",
    label: "Focus Keyword in Title",
    passed: inTitle,
    score: inTitle ? 15 : 0,
    maxScore: 15,
    severity: inTitle ? "good" : "critical",
    message: inTitle
      ? "Keyword appears in the title"
      : "Add focus keyword to the page/blog title",
  };

  // 2. Keyword in Slug (10 pts)
  const slugifiedKeyword = lowerKeyword
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
  const inSlug =
    (slug &&
      slugifiedKeyword &&
      slug.toLowerCase().includes(slugifiedKeyword)) ||
    (slug &&
      slug.toLowerCase().includes(lowerKeyword.replace(/[^a-z0-9]/g, "")));
  const slugItem: SeoCheckItem = {
    id: "slug",
    label: "Focus Keyword in URL Slug",
    passed: Boolean(inSlug),
    score: inSlug ? 10 : 0,
    maxScore: 10,
    severity: inSlug ? "good" : "warning",
    message: inSlug
      ? "Keyword appears in the URL slug"
      : "Include focus keyword in the URL slug",
  };

  // 3. Keyword in Meta Description (10 pts)
  const inMeta = (metaDesc || "").toLowerCase().includes(lowerKeyword);
  const metaItem: SeoCheckItem = {
    id: "meta",
    label: "Focus Keyword in Meta Description",
    passed: inMeta,
    score: inMeta ? 10 : 0,
    maxScore: 10,
    severity: inMeta ? "good" : "critical",
    message: inMeta
      ? "Keyword appears in the meta description"
      : "Add focus keyword to the meta description",
  };

  // 4. Keyword in Introduction (10 pts)
  const inIntro = countKeywordOccurrences(introText, trimmedKeyword) > 0;
  const introItem: SeoCheckItem = {
    id: "intro",
    label: "Focus Keyword in Introduction",
    passed: inIntro,
    score: inIntro ? 10 : 0,
    maxScore: 10,
    severity: inIntro ? "good" : "warning",
    message: inIntro
      ? "Keyword appears in the first paragraph"
      : "Include focus keyword in the introductory copy",
  };

  // 5. Keyword in Subheadings (10 pts)
  const inHeadings = headingTexts.some(
    (h) => countKeywordOccurrences(h, trimmedKeyword) > 0
  );
  const headingsItem: SeoCheckItem = {
    id: "headings",
    label: "Focus Keyword in Subheadings",
    passed: inHeadings,
    score: inHeadings ? 10 : 0,
    maxScore: 10,
    severity: inHeadings ? "good" : "warning",
    message: inHeadings
      ? "Keyword found in at least one subheading (H2/H3)"
      : "Use focus keyword in at least one subheading",
  };

  // 6. Keyword Density (10 pts)
  let densityStatus: "optimal" | "low" | "high" | "none" = "none";
  let densityScore = 0;
  let densitySeverity: SeoCheckItem["severity"] = "warning";
  let densityMessage = "Keyword does not appear in the content";
  if (keywordOccurrences > 0) {
    if (roundedDensity >= 0.8 && roundedDensity <= 2.5) {
      densityStatus = "optimal";
      densityScore = 10;
      densitySeverity = "good";
      densityMessage = `Optimal density: ${roundedDensity}% (${keywordOccurrences}x)`;
    } else if (roundedDensity < 0.8) {
      densityStatus = "low";
      densityScore = 5;
      densitySeverity = "warning";
      densityMessage = `Density is low: ${roundedDensity}% (${keywordOccurrences}x). Aim for 0.8% - 2.5%`;
    } else {
      densityStatus = "high";
      densityScore = 4;
      densitySeverity = "critical";
      densityMessage = `High density: ${roundedDensity}% (${keywordOccurrences}x). Risk of keyword stuffing`;
    }
  }
  const densityItem: SeoCheckItem = {
    id: "density",
    label: "Keyword Density",
    passed: densityStatus === "optimal",
    score: densityScore,
    maxScore: 10,
    severity: densitySeverity,
    message: densityMessage,
  };

  // 7. Content Length (10 pts)
  const targetMinWords = entityType === "page" ? 150 : 300;
  let wordCountScore = 0;
  let wordCountPassed = false;
  let wordCountMessage = `Content is short (< ${targetMinWords} words)`;
  if (wordCount >= targetMinWords) {
    wordCountScore = 10;
    wordCountPassed = true;
    wordCountMessage = `Good content length (${wordCount} words)`;
  } else if (wordCount >= 60) {
    wordCountScore = 5;
    wordCountMessage = `Moderate length (${wordCount} words). Recommended >= ${targetMinWords} words`;
  }
  const wordCountItem: SeoCheckItem = {
    id: "wordCount",
    label: "Content Length",
    passed: wordCountPassed,
    score: wordCountScore,
    maxScore: 10,
    severity: wordCountPassed ? "good" : "warning",
    message: wordCountMessage,
  };

  // 8. Image Alt Text (10 pts)
  const imageAltItem = checkImageAltText(imageNodes);

  // 9. Readability (5 pts)
  const readability = analyzeReadability(doc);
  const readabilityItem = checkReadabilityScore(readability);

  // 10. Link Structure (5 pts)
  const linkItem = checkLinkStructure(linkNodes);

  // 11. Meta Description Quality (5 pts)
  const metaQualityItem = checkMetaDescriptionQuality(metaDesc);

  const items = [
    titleItem,
    slugItem,
    metaItem,
    introItem,
    headingsItem,
    densityItem,
    wordCountItem,
    imageAltItem,
    readabilityItem,
    linkItem,
    metaQualityItem,
  ];
  const totalScore = items.reduce((acc, item) => acc + item.score, 0);

  return {
    hasKeyword: true,
    score: totalScore,
    items,
    keywordCount: keywordOccurrences,
    density: roundedDensity,
    densityStatus,
    wordCount,
    readability,
  };
}

function checkImageAltText(imageNodes: ImageNodeInfo[]): SeoCheckItem {
  if (imageNodes.length === 0) {
    return {
      id: "imageAlt",
      label: "Image Alt Text",
      passed: true,
      score: 10,
      maxScore: 10,
      severity: "info",
      message: "No images found (check passes by default)",
    };
  }

  const missingAlt = imageNodes.filter((img) => !img.alt || !img.alt.trim());
  if (missingAlt.length === 0) {
    return {
      id: "imageAlt",
      label: "Image Alt Text",
      passed: true,
      score: 10,
      maxScore: 10,
      severity: "good",
      message: `All ${imageNodes.length} image(s) have alt text`,
    };
  }

  const partialScore = Math.round((1 - missingAlt.length / imageNodes.length) * 10);
  return {
    id: "imageAlt",
    label: "Image Alt Text",
    passed: false,
    score: Math.max(0, partialScore),
    maxScore: 10,
    severity: "warning",
    message: `${missingAlt.length} of ${imageNodes.length} image(s) missing alt text`,
  };
}

function checkReadabilityScore(readability: ReadabilityResult): SeoCheckItem {
  const { fleschScore, grade, longSentences } = readability;

  if (fleschScore >= 60) {
    return {
      id: "readability",
      label: "Readability",
      passed: true,
      score: 5,
      maxScore: 5,
      severity: "good",
      message: `${grade} reading level (Flesch: ${fleschScore})${longSentences > 0 ? `. ${longSentences} long sentence(s) found` : ""}`,
    };
  }

  if (fleschScore >= 40) {
    return {
      id: "readability",
      label: "Readability",
      passed: false,
      score: 3,
      maxScore: 5,
      severity: "warning",
      message: `${grade} reading level (Flesch: ${fleschScore}). Try shorter sentences and simpler words`,
    };
  }

  return {
    id: "readability",
    label: "Readability",
    passed: false,
    score: 1,
    maxScore: 5,
    severity: "warning",
    message: `${grade} reading level (Flesch: ${fleschScore}). Break up long sentences and use everyday language`,
  };
}

function checkLinkStructure(linkNodes: LinkNodeInfo[]): SeoCheckItem {
  const internalLinks = linkNodes.filter((l) => l.isInternal);
  const externalLinks = linkNodes.filter((l) => !l.isInternal);

  const hasInternal = internalLinks.length >= 1;
  const hasExternal = externalLinks.length >= 1;

  if (hasInternal && hasExternal) {
    return {
      id: "links",
      label: "Link Structure",
      passed: true,
      score: 5,
      maxScore: 5,
      severity: "good",
      message: `${internalLinks.length} internal, ${externalLinks.length} external link(s)`,
    };
  }

  if (hasInternal || hasExternal) {
    return {
      id: "links",
      label: "Link Structure",
      passed: false,
      score: 3,
      maxScore: 5,
      severity: "info",
      message: hasInternal
        ? `${internalLinks.length} internal link(s) but no external references`
        : `${externalLinks.length} external link(s) but no internal site links`,
    };
  }

  return {
    id: "links",
    label: "Link Structure",
    passed: false,
    score: 0,
    maxScore: 5,
    severity: "info",
    message: "No links found. Add internal and external references",
  };
}

function checkMetaDescriptionQuality(metaDesc: string): SeoCheckItem {
  const trimmed = (metaDesc || "").trim();
  if (!trimmed) {
    return {
      id: "metaQuality",
      label: "Meta Description Quality",
      passed: false,
      score: 0,
      maxScore: 5,
      severity: "critical",
      message: "No meta description provided",
    };
  }

  let qualityScore = 0;
  const issues: string[] = [];

  if (trimmed.length >= 120 && trimmed.length <= 165) {
    qualityScore += 2;
  } else if (trimmed.length >= 50 && trimmed.length < 120) {
    qualityScore += 1;
    issues.push("too short (aim for 120-165 chars)");
  } else if (trimmed.length > 165) {
    qualityScore += 1;
    issues.push("too long (may get truncated in search)");
  } else {
    issues.push("very short");
  }

  const genericOpeners = /^(this article|in this post|this blog|this page|this is a|here we)/i;
  if (!genericOpeners.test(trimmed)) {
    qualityScore += 1;
  } else {
    issues.push("starts with generic opener");
  }

  const ctaWords = /\b(learn|discover|guide|how to|tips|steps|best|ultimate|essential|complete|master|build|create|explore|services|solutions)\b/i;
  if (ctaWords.test(trimmed)) {
    qualityScore += 2;
  } else {
    qualityScore += 1;
    issues.push("add action/benefit words");
  }

  return {
    id: "metaQuality",
    label: "Meta Description Quality",
    passed: qualityScore >= 4,
    score: Math.min(5, qualityScore),
    maxScore: 5,
    severity: qualityScore >= 4 ? "good" : "warning",
    message:
      qualityScore >= 4
        ? `Well-crafted meta description (${trimmed.length} chars)`
        : `Meta could be improved: ${issues.join(", ")} (${trimmed.length} chars)`,
  };
}

/**
 * Calculates a reliable 0-100 SEO health score for listing tables & badges.
 * Can be run with just metadata or with content if available.
 */
export function calculateQuickSeoScore(
  seo: SeoMetadata | null | undefined,
  fallbackTitle?: string,
  fallbackImage?: string | null
): {
  score: number;
  label: "Excellent" | "Good" | "Needs Attention" | "Critical";
  variant: "success" | "warning" | "destructive" | "default";
} {
  if (!seo) {
    return { score: 0, label: "Critical", variant: "destructive" };
  }

  // If already audited (e.g. by Python or previous deep analyze)
  if (typeof seo.auditScore === "number") {
    const s = seo.auditScore;
    if (s >= 80) return { score: s, label: "Excellent", variant: "success" };
    if (s >= 65) return { score: s, label: "Good", variant: "success" };
    if (s >= 45) return { score: s, label: "Needs Attention", variant: "warning" };
    return { score: s, label: "Critical", variant: "destructive" };
  }

  let points = 0;

  // 1. Meta Title presence & length (30 pts)
  const title = seo.metaTitle || fallbackTitle || "";
  const titleLen = title.length;
  if (titleLen >= 40 && titleLen <= 65) {
    points += 30;
  } else if (titleLen >= 20 && titleLen <= 75) {
    points += 18;
  } else if (titleLen > 0) {
    points += 10;
  }

  // 2. Meta Description presence & length (30 pts)
  const desc = seo.metaDesc || "";
  const descLen = desc.length;
  if (descLen >= 120 && descLen <= 165) {
    points += 30;
  } else if (descLen >= 60 && descLen <= 180) {
    points += 18;
  } else if (descLen > 0) {
    points += 10;
  }

  // 3. Focus Target Keyword (15 pts)
  if (seo.focusKeyword && seo.focusKeyword.trim().length > 1) {
    points += 15;
    // Extra bonus if keyword is in title
    if (title.toLowerCase().includes(seo.focusKeyword.toLowerCase().trim())) {
      points += 5;
    }
  }

  // 4. Social Card Image (10 pts)
  if (seo.ogImage || fallbackImage) {
    points += 10;
  }

  // 5. Canonical URL & Structured Data (10 pts)
  if (seo.canonicalUrl) points += 5;
  if (seo.structuredData) points += 5;

  const score = Math.min(100, points);

  if (score >= 80) return { score, label: "Excellent", variant: "success" };
  if (score >= 60) return { score, label: "Good", variant: "success" };
  if (score >= 40) return { score, label: "Needs Attention", variant: "warning" };
  return { score, label: "Critical", variant: "destructive" };
}
