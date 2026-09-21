import type { FieldSchema } from "@/lib/schemas/global-schema";

export const blogGeneralLeftUiSchema: FieldSchema[] = [
  {
    name: "title",
    label: "Blog Title",
    type: "textarea",
    rows: 2,
    placeholder: "e.g. Next-Generation Cloud Architecture with Next.js 15...",
    description: "A catchy, clear headline. Also used to generate the default URL slug and SEO title.",
  },
  {
    name: "excerpt",
    label: "Short Summary / Excerpt",
    type: "textarea",
    rows: 3,
    placeholder: "Write a concise overview of what readers will learn in this post...",
    description: "A brief teaser shown on blog archive cards, search engine previews, and RSS feeds. Max 400 characters.",
  },
  {
    name: "categories",
    label: "Categories",
    type: "tags",
    placeholder: "Type category and press Enter...",
    description: "Group this post into broad topics (e.g. Engineering, AI, Cloud). Required to publish.",
  },
  {
    name: "tags",
    label: "Tags",
    type: "tags",
    placeholder: "Type tag and press Enter...",
    description: "Specific keywords or subjects (e.g. typescript, nextjs, devops).",
  },
  {
    name: "allowComments",
    label: "Reader Comments",
    type: "boolean",
    description: "Allow readers to post public comments and join discussions on this article.",
  },
];

export const blogGeneralRightUiSchema: FieldSchema[] = [
  {
    name: "featuredImage",
    label: "Featured Cover Image",
    type: "image",
    description: "This image appears at the top of the article, on blog listing cards, and when shared across social networks.",
  },
];

export const blogGeneralUiSchema: FieldSchema[] = [
  ...blogGeneralLeftUiSchema,
  ...blogGeneralRightUiSchema,
];
