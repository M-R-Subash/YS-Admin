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
  seo?: any;
  createdAt: string;
  updatedAt: string;
}

export type PageData = Page;
