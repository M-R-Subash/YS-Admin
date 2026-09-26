import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { PageData } from "@/types";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

let client = globalForPrisma.prisma;

// Re-instantiate if cached instance does not have the scheduledAt field
if (!client || !(client as any).formSubmission || !(client as any)._runtimeDataModel?.models?.Blog?.fields?.some((f: any) => f.name === "scheduledAt")) {
  client = createPrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = client;
}

const prisma: PrismaClient = client;

export function mapDbToPageData(page: any): PageData {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    isTrashed: page.isTrashed,
    content: page.content || [],
    draftContent: page.draftContent ?? null,
    seo: page.seo,
    author: page.author,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

export default prisma;
