export interface Section {
  id: string;
  type: string;
  data: Record<string, string>;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  isTrashed?: boolean;
  content?: any;
  draftContent?: any;
  seo?: any;
  author?: { name?: string | null } | null;
  previewSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export type PageData = Page;
