import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { PageData } from "@/types";

import { serverConfig } from "@/lib/config/server";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: serverConfig.database.url,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

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
