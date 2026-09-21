// Blog SEO Analyzer — standalone module extracted from BlogForm.tsx
// for independent testability, reuse across editors, and clean separation

// ─── Types ────────────────────────────────────────────────────────────

export interface ExtractedDoc {
  fullText: string;
  introText: string;
  headingTexts: string[];
  wordCount: number;
  imageNodes: ImageNodeInfo[];
  linkNodes: LinkNodeInfo[];
  sentences: string[];
  paragraphLengths: number[];
}

export interface ImageNodeInfo {
  src: string;
  alt: string;
  index: number; // position in the document (nth image)
}

export interface LinkNodeInfo {
  href: string;
  text: string;
  isInternal: boolean;
}

export interface SeoCheckItem {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
}

export interface SeoAnalysisResult {
  hasKeyword: boolean;
  score: number;
  items: SeoCheckItem[];
  keywordCount: number;
  density: number;
  densityStatus: "optimal" | "low" | "high" | "none";
  wordCount: number;
  readability: ReadabilityResult | null;
}

export interface ReadabilityResult {
  fleschScore: number;
  grade: string;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  longSentences: number;
  longParagraphs: number;
}

// ─── TipTap AST Extraction ───────────────────────────────────────────

export function extractTextFromTipTap(json: any): ExtractedDoc {
  if (!json) {
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

  if (typeof json === "string") {
    const plain = json.replace(/<[^>]+>/g, " ");
    const words = plain.trim().split(/\s+/).filter(Boolean);
    const sentences = plain.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    return {
      fullText: plain,
      introText: plain.slice(0, 500),
      headingTexts: [],
      wordCount: words.length,
      imageNodes: [],
      linkNodes: [],
      sentences,
      paragraphLengths: [words.length],
    };
  }

  const allWords: string[] = [];
  const headingTexts: string[] = [];
  const imageNodes: ImageNodeInfo[] = [];
  const linkNodes: LinkNodeInfo[] = [];
  const paragraphLengths: number[] = [];
  let firstParagraphText = "";
  let imageIndex = 0;

  function traverse(node: any) {
    if (!node) return;

    // Collect heading text
    if (node.type === "heading" && Array.isArray(node.content)) {
      const headingText = node.content
        .map((c: any) => c.text || "")
        .join(" ")
        .trim();
      if (headingText) headingTexts.push(headingText);
    }

    // Collect first paragraph text
    if (
      node.type === "paragraph" &&
      !firstParagraphText &&
      Array.isArray(node.content)
    ) {
      firstParagraphText = node.content
        .map((c: any) => c.text || "")
        .join(" ")
        .trim();
    }

    // Track paragraph word counts for readability
    if (node.type === "paragraph" && Array.isArray(node.content)) {
      const paraText = node.content
        .map((c: any) => c.text || "")
        .join(" ")
        .trim();
      const paraWords = paraText.split(/\s+/).filter(Boolean).length;
      if (paraWords > 0) paragraphLengths.push(paraWords);
    }

    // Collect image nodes
    if (node.type === "image") {
      imageNodes.push({
        src: node.attrs?.src || "",
        alt: node.attrs?.alt || "",
        index: imageIndex++,
      });
    }

    // Collect text and check for links
    if (node.text) {
      allWords.push(node.text);

      // Check if this text node has a link mark
      if (Array.isArray(node.marks)) {
        const linkMark = node.marks.find((m: any) => m.type === "link");
        if (linkMark && linkMark.attrs?.href) {
          const href = linkMark.attrs.href;
          linkNodes.push({
            href,
            text: node.text,
            isInternal: isInternalLink(href),
          });
        }
      }
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
  // Remove trailing silent e
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

  // Flesch Reading Ease: 206.835 - 1.015 × ASL - 84.6 × ASW
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

// ─── Main SEO Analyzer ──────────────────────────────────────────────

export function analyzeSeo(
  keyword: string,
  title: string,
  slug: string,
  metaDesc: string,
  contentOrDoc: any,
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
      readability: null,
    };
  }

  const doc: ExtractedDoc =
    contentOrDoc && typeof contentOrDoc.fullText === "string"
      ? (contentOrDoc as ExtractedDoc)
      : extractTextFromTipTap(contentOrDoc);

  const { fullText, introText, headingTexts, imageNodes, linkNodes } = doc;
  const wordCount =
    typeof overrideWordCount === "number" ? overrideWordCount : doc.wordCount;
  const lowerKeyword = trimmedKeyword.toLowerCase();
  const keywordOccurrences = countKeywordOccurrences(fullText, trimmedKeyword);
  const keywordWordCount = trimmedKeyword
    .split(/\s+/)
    .filter(Boolean).length;
  const density =
    wordCount > 0
      ? ((keywordOccurrences * keywordWordCount) / wordCount) * 100
      : 0;
  const roundedDensity = Math.round(density * 10) / 10;

  // ── 1. Keyword in Title (15 pts) ──
  const inTitle = title.toLowerCase().includes(lowerKeyword);
  const titleItem: SeoCheckItem = {
    id: "title",
    label: "Focus Keyword in Title",
    passed: inTitle,
    score: inTitle ? 15 : 0,
    maxScore: 15,
    message: inTitle
      ? "Keyword appears in the title"
      : "Add focus keyword to the blog title",
  };

  // ── 2. Keyword in Slug (10 pts) ──
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
    message: inSlug
      ? "Keyword appears in the URL slug"
      : "Include focus keyword in the URL slug",
  };

  // ── 3. Keyword in Meta Description (10 pts) ──
  const inMeta = metaDesc.toLowerCase().includes(lowerKeyword);
  const metaItem: SeoCheckItem = {
    id: "meta",
    label: "Focus Keyword in Meta Description",
    passed: inMeta,
    score: inMeta ? 10 : 0,
    maxScore: 10,
    message: inMeta
      ? "Keyword appears in the meta description"
      : "Add focus keyword to the meta description",
  };

  // ── 4. Keyword in Introduction (10 pts) ──
  const inIntro = countKeywordOccurrences(introText, trimmedKeyword) > 0;
  const introItem: SeoCheckItem = {
    id: "intro",
    label: "Focus Keyword in Introduction",
    passed: inIntro,
    score: inIntro ? 10 : 0,
    maxScore: 10,
    message: inIntro
      ? "Keyword appears in the first paragraph"
      : "Include focus keyword in the introductory paragraph",
  };

  // ── 5. Keyword in Subheadings (10 pts) ──
  const inHeadings = headingTexts.some(
    (h) => countKeywordOccurrences(h, trimmedKeyword) > 0
  );
  const headingsItem: SeoCheckItem = {
    id: "headings",
    label: "Focus Keyword in Subheadings",
    passed: inHeadings,
    score: inHeadings ? 10 : 0,
    maxScore: 10,
    message: inHeadings
      ? "Keyword found in at least one subheading (H2/H3)"
      : "Use focus keyword in at least one subheading",
  };

  // ── 6. Keyword Density (10 pts) ──
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

  // ── 7. Content Length (10 pts) ──
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

  // ── 8. Image Alt Text (10 pts) ──
  const imageAltItem = checkImageAltText(imageNodes);

  // ── 9. Readability (5 pts) ──
  const readability = analyzeReadability(doc);
  const readabilityItem = checkReadabilityScore(readability);

  // ── 10. Link Structure (5 pts) ──
  const linkItem = checkLinkStructure(linkNodes);

  // ── 11. Meta Description Quality (5 pts) ──
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

// ─── Image Alt Text Check (10 pts) ──────────────────────────────────

function checkImageAltText(imageNodes: ImageNodeInfo[]): SeoCheckItem {
  if (imageNodes.length === 0) {
    return {
      id: "imageAlt",
      label: "Image Alt Text",
      passed: true,
      score: 10,
      maxScore: 10,
      message: "No images in the article (check passes by default)",
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
      message: `All ${imageNodes.length} image(s) have alt text`,
    };
  }

  const partialScore = Math.round(
    (1 - missingAlt.length / imageNodes.length) * 10
  );
  return {
    id: "imageAlt",
    label: "Image Alt Text",
    passed: false,
    score: Math.max(0, partialScore),
    maxScore: 10,
    message: `${missingAlt.length} of ${imageNodes.length} image(s) missing alt text`,
  };
}

// ─── Readability Score Check (5 pts) ────────────────────────────────

function checkReadabilityScore(readability: ReadabilityResult): SeoCheckItem {
  const { fleschScore, grade, longSentences } = readability;

  if (fleschScore >= 60) {
    return {
      id: "readability",
      label: "Readability",
      passed: true,
      score: 5,
      maxScore: 5,
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
      message: `${grade} reading level (Flesch: ${fleschScore}). Try shorter sentences and simpler words`,
    };
  }

  return {
    id: "readability",
    label: "Readability",
    passed: false,
    score: 1,
    maxScore: 5,
    message: `${grade} reading level (Flesch: ${fleschScore}). Break up long sentences and use everyday language`,
  };
}

// ─── Link Structure Check (5 pts) ───────────────────────────────────

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
      message: hasInternal
        ? `${internalLinks.length} internal link(s) but no external links. Add a reference link`
        : `${externalLinks.length} external link(s) but no internal links. Link to related content`,
    };
  }

  return {
    id: "links",
    label: "Link Structure",
    passed: false,
    score: 0,
    maxScore: 5,
    message: "No links found. Add internal and external references",
  };
}

// ─── Meta Description Quality Check (5 pts) ─────────────────────────

function checkMetaDescriptionQuality(metaDesc: string): SeoCheckItem {
  const trimmed = metaDesc.trim();
  if (!trimmed) {
    return {
      id: "metaQuality",
      label: "Meta Description Quality",
      passed: false,
      score: 0,
      maxScore: 5,
      message: "No meta description provided",
    };
  }

  let qualityScore = 0;
  const issues: string[] = [];

  // Length check (optimal: 120-155 chars)
  if (trimmed.length >= 120 && trimmed.length <= 155) {
    qualityScore += 2;
  } else if (trimmed.length >= 50 && trimmed.length < 120) {
    qualityScore += 1;
    issues.push("too short (aim for 120-155 chars)");
  } else if (trimmed.length > 155) {
    qualityScore += 1;
    issues.push("too long (may get truncated in search)");
  } else {
    issues.push("very short (aim for 120-155 chars)");
  }

  // Generic opener check
  const genericOpeners = /^(this article|in this post|this blog|this is a|here we)/i;
  if (!genericOpeners.test(trimmed)) {
    qualityScore += 1;
  } else {
    issues.push("starts with generic opener");
  }

  // CTA / action words
  const ctaWords = /\b(learn|discover|guide|how to|tips|steps|best|ultimate|essential|complete|master|build|create|explore)\b/i;
  if (ctaWords.test(trimmed)) {
    qualityScore += 2;
  } else {
    qualityScore += 1;
    issues.push("add action words (Learn, Discover, Guide)");
  }

  return {
    id: "metaQuality",
    label: "Meta Description Quality",
    passed: qualityScore >= 4,
    score: Math.min(5, qualityScore),
    maxScore: 5,
    message:
      qualityScore >= 4
        ? `Well-crafted meta description (${trimmed.length} chars)`
        : `Meta could be improved: ${issues.join(", ")} (${trimmed.length} chars)`,
  };
}
