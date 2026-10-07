import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("Starting taxonomy sync...");

  const blogs = await prisma.blog.findMany({
    select: {
      id: true,
      categories: true,
      tags: true,
    },
  });

  console.log(`Found ${blogs.length} blogs to inspect.`);

  const allCategories = new Set<string>();
  const allTags = new Set<string>();

  blogs.forEach((b) => {
    (b.categories || []).forEach((c) => {
      const clean = c.trim();
      if (clean) allCategories.add(clean);
    });
    (b.tags || []).forEach((t) => {
      const clean = t.trim();
      if (clean) allTags.add(clean);
    });
  });

  // Curated metadata dictionary for known categories
  const categoryMetadata: Record<string, { description: string; metaTitle: string; metaDesc: string; focusKeyword: string; canonicalUrl: string }> = {
    "AI Tools": {
      description: "Explore top Artificial Intelligence tools, machine learning frameworks, and productivity automations.",
      metaTitle: "AI Tools & Automation Articles | YS Innovations",
      metaDesc: "Discover the best AI tools for content creation, marketing, and business efficiency curated by YS Innovations.",
      focusKeyword: "AI Tools",
      canonicalUrl: "https://ysinnovations.com/category/ai-tools/",
    },
    "Digital Marketing": {
      description: "Actionable digital marketing strategies, campaign playbooks, and conversion optimization insights.",
      metaTitle: "Digital Marketing Strategies & Insights | YS Innovations",
      metaDesc: "Proven marketing tactics, customer acquisition strategies, and growth insights to scale your brand.",
      focusKeyword: "Digital Marketing",
      canonicalUrl: "https://ysinnovations.com/category/digital-marketing/",
    },
    "SEO": {
      description: "Search engine optimization strategies, Google ranking tactics, and organic traffic acceleration guides.",
      metaTitle: "SEO Guides & Google Ranking Strategies | YS Innovations",
      metaDesc: "Master on-page and off-page SEO, algorithm updates, and sustainable organic growth techniques.",
      focusKeyword: "SEO",
      canonicalUrl: "https://ysinnovations.com/category/seo/",
    },
    "Search Engine Optimization": {
      description: "In-depth search engine optimization techniques to improve search performance and SERP prominence.",
      metaTitle: "Search Engine Optimization (SEO) Guides | YS Innovations",
      metaDesc: "Master search engine optimization with technical audits, keyword research, and rank tracking.",
      focusKeyword: "Search Engine Optimization",
      canonicalUrl: "https://ysinnovations.com/category/search-engine-optimization/",
    },
    "Lead Generation": {
      description: "B2B and B2C lead generation frameworks, high-converting funnels, and outbound playbooks.",
      metaTitle: "Lead Generation Strategies & Tactics | YS Innovations",
      metaDesc: "Discover actionable lead generation methods to attract high-intent prospects and increase sales pipeline.",
      focusKeyword: "Lead Generation",
      canonicalUrl: "https://ysinnovations.com/category/lead-generation/",
    },
    "Local Business": {
      description: "Local search marketing, Google Maps optimization, and customer acquisition for brick-and-mortar brands.",
      metaTitle: "Local Business Marketing & Local SEO | YS Innovations",
      metaDesc: "Dominate local search results and attract nearby customers with local SEO best practices.",
      focusKeyword: "Local Business",
      canonicalUrl: "https://ysinnovations.com/category/local-business/",
    },
    "Blog": {
      description: "Industry news, actionable guides, and digital transformation insights from YS Innovations.",
      metaTitle: "Blog & Insights | YS Innovations",
      metaDesc: "Read the latest articles on AI, digital marketing, SEO, and business technology from YS Innovations.",
      focusKeyword: "Blog",
      canonicalUrl: "https://ysinnovations.com/category/blog/",
    },
  };

  const tagDescriptions: Record<string, string> = {
    "AI": "Artificial intelligence technologies, models, and industry applications.",
    "Content Creation": "Writing, graphic design, and video production strategies for digital media.",
    "Productivity": "Software tools and frameworks to streamline workflows and maximize efficiency.",
    "Google": "Google algorithm updates, search features, and indexing strategies.",
    "Search Rankings": "Tactics and methods to climb and maintain top SERP positions.",
    "Lead Generation": "Customer acquisition systems and outbound sales frameworks.",
    "B2B": "Business-to-business growth models, marketing, and sales funnels.",
    "Sales": "Conversion optimization, sales pipeline management, and closing strategies.",
    "Local SEO": "Targeting geo-specific searches and local map pack rankings.",
    "Google My Business": "Optimizing and managing your Google Business Profile for local visibility.",
    "Rankings": "SERP position tracking, keyword movements, and search benchmarking.",
    "SEO": "Search engine optimization practices for organic search traffic.",
  };

  // Upsert Categories
  for (const name of allCategories) {
    const slug = slugify(name) || "category";
    const meta = categoryMetadata[name] || {
      description: `${name} articles and resources.`,
      metaTitle: `${name} Articles | YS Innovations`,
      metaDesc: `Explore articles, guides, and insights about ${name} on YS Innovations.`,
      focusKeyword: name,
      canonicalUrl: `https://ysinnovations.com/category/${slug}/`,
    };

    await prisma.category.upsert({
      where: { name },
      update: {
        slug,
        description: meta.description,
        metaTitle: meta.metaTitle,
        metaDesc: meta.metaDesc,
        focusKeyword: meta.focusKeyword,
        canonicalUrl: meta.canonicalUrl,
      },
      create: {
        name,
        slug,
        description: meta.description,
        metaTitle: meta.metaTitle,
        metaDesc: meta.metaDesc,
        focusKeyword: meta.focusKeyword,
        canonicalUrl: meta.canonicalUrl,
      },
    });
  }
  console.log(`Synced ${allCategories.size} categories.`);

  // Upsert Tags
  for (const name of allTags) {
    const slug = slugify(name) || "tag";
    const desc = tagDescriptions[name] || `${name} topics and related posts.`;
    await prisma.tag.upsert({
      where: { name },
      update: {
        slug,
        description: desc,
      },
      create: {
        name,
        slug,
        description: desc,
      },
    });
  }
  console.log(`Synced ${allTags.size} tags.`);

  // Connect relationships
  for (const b of blogs) {
    const validCats = (b.categories || []).map((c) => c.trim()).filter(Boolean);
    const validTags = (b.tags || []).map((t) => t.trim()).filter(Boolean);

    await prisma.blog.update({
      where: { id: b.id },
      data: {
        categoryItems: {
          connect: validCats.map((name) => ({ name })),
        },
        tagItems: {
          connect: validTags.map((name) => ({ name })),
        },
      },
    });
  }

  console.log("Taxonomy relationship sync completed successfully!");
}

main()
  .catch((err) => {
    console.error("Taxonomy sync failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
