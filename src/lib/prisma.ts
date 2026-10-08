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

let client = globalForPrisma.prisma;

// Re-instantiate if cached instance does not have the scheduledAt, blogRevision, Category SEO, Tag description, or Subscriber fields
if (
  !client ||
  !(client as any).formSubmission ||
  !(client as any).blogRevision ||
  !(client as any).subscriber ||
  !(client as any).newsletterCampaign ||
  !(client as any)._runtimeDataModel?.models?.Blog?.fields?.some((f: any) => f.name === "scheduledAt") ||
  !(client as any)._runtimeDataModel?.models?.Category?.fields?.some((f: any) => f.name === "metaTitle") ||
  !(client as any)._runtimeDataModel?.models?.Tag?.fields?.some((f: any) => f.name === "description")
) {
  client = createPrismaClient();
}

if (!serverConfig.isProduction) {
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
