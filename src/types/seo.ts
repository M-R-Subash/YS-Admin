// Canonical SEO Types for YS CMS

export interface SeoMetadata {
  id?: string;
  metaTitle?: string | null;
  metaDesc?: string | null;
  focusKeyword?: string | null;
  ogImage?: string | null;
  ogTitle?: string | null;
  ogDesc?: string | null;
  canonicalUrl?: string | null;
  structuredData?: any; // JSON-LD object or null
  noIndex?: boolean;
  authorName?: string | null;
  authorRole?: string | null;
  authorDescription?: string | null;

  // Future-ready Python Semrush-grade audit fields
  auditScore?: number | null;
  auditReport?: any | null;
  lastAuditedAt?: string | null;

  pageId?: string | null;
  blogId?: string | null;
}

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
  index: number;
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
  severity: "critical" | "warning" | "good" | "info";
  recommendation?: string;
}

export interface ReadabilityResult {
  fleschScore: number;
  grade: string;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  longSentences: number;
  longParagraphs: number;
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

export type SeoEntityType = "page" | "blog";

export interface NormalizedDocExtractor {
  (content: any): ExtractedDoc;
}
