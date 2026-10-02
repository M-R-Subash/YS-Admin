// ─── Revision History Type Definitions ──────────────────────────────────────────

export interface BlogSnapshotSeo {
  metaTitle: string | null;
  metaDesc: string | null;
  focusKeyword: string | null;
  ogImage: string | null;
  ogTitle: string | null;
  ogDesc: string | null;
  canonicalUrl: string | null;
  structuredData: any;
  noIndex: boolean;
  authorName: string | null;
  authorRole: string | null;
  authorDescription: string | null;
}

export interface BlogSnapshotFaq {
  question: string;
  answer: string;
}

export interface BlogSnapshotData {
  title: string;
  slug: string;
  featuredImage: string | null;
  allowComments: boolean;
  content: any; // Full TipTap JSON structure
  excerpt: string | null;
  readingTime: number;
  wordCount: number;
  tags: string[];
  categories: string[];
  faqs?: BlogSnapshotFaq[];
  seo?: BlogSnapshotSeo | null;
  publishedAt: string; // ISO string
}

export interface RevisionAuthor {
  id: string;
  name: string | null;
  email: string;
  profilePicture: string | null;
}

export interface RevisionSummaryItem {
  id: string;
  blogId: string;
  versionNumber: number;
  action: string;
  wordCount: number;
  readingTime: number;
  createdAt: string;
  savedBy: RevisionAuthor | null;
}

export interface RevisionDetail extends RevisionSummaryItem {
  snapshotData: BlogSnapshotData;
}

export interface RevisionsListResponse {
  revisions: RevisionSummaryItem[];
  total: number;
}

export interface RevisionDetailResponse {
  revision: RevisionDetail;
}
