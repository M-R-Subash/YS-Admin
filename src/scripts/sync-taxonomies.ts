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

  // Upsert Categories
  for (const name of allCategories) {
    const slug = slugify(name) || "category";
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug,
        description: `${name} articles and resources.`,
      },
    });
  }
  console.log(`Synced ${allCategories.size} categories.`);

  // Upsert Tags
  for (const name of allTags) {
    const slug = slugify(name) || "tag";
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug,
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
