import { executeBulkAction } from "@/lib/server/bulk-actions";

/**
 * Universal Bulk Action Endpoint
 * POST /api/bulk-action
 * Body: { entity: "blogs" | "pages" | "redirection" | "subscribers" | "categories" | "tags", action: string, ids: string[], status?: string }
 */
export async function POST(request: Request) {
  return executeBulkAction(request);
}
