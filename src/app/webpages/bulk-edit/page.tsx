"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UniversalSpreadsheetEditor,
  SpreadsheetColumnConfig,
} from "@/components/spreadsheet/UniversalSpreadsheetEditor";

export interface BulkPageItem {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  seo?: {
    metaTitle?: string | null;
    metaDesc?: string | null;
    focusKeyword?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean | null;
  } | null;
}

const WEBPAGE_COLUMNS: SpreadsheetColumnConfig[] = [
  {
    key: "slug",
    label: "Slug",
    defaultWidth: 220,
    minWidth: 130,
    type: "text",
    category: "General",
    placeholder: "page-slug",
  },
  {
    key: "status",
    label: "Status",
    defaultWidth: 120,
    minWidth: 100,
    type: "status",
    category: "Publishing",
  },
  {
    key: "metaTitle",
    label: "Meta Title",
    defaultWidth: 240,
    minWidth: 140,
    type: "text",
    category: "SEO",
    placeholder: "SEO title...",
    fieldPath: "seo.metaTitle",
  },
  {
    key: "metaDesc",
    label: "Meta Description",
    defaultWidth: 280,
    minWidth: 160,
    type: "text",
    category: "SEO",
    placeholder: "Meta description...",
    fieldPath: "seo.metaDesc",
  },
  {
    key: "focusKeyword",
    label: "Focus Keyword",
    defaultWidth: 180,
    minWidth: 120,
    type: "text",
    category: "SEO",
    placeholder: "Focus keyword...",
    fieldPath: "seo.focusKeyword",
  },
  {
    key: "canonicalUrl",
    label: "Canonical URL",
    defaultWidth: 220,
    minWidth: 140,
    type: "text",
    category: "SEO",
    placeholder: "https://...",
    fieldPath: "seo.canonicalUrl",
  },
  {
    key: "noIndex",
    label: "No Index",
    defaultWidth: 90,
    minWidth: 80,
    type: "switch",
    category: "SEO",
    fieldPath: "seo.noIndex",
  },
];

function WebpageBulkEditContent() {
  const searchParams = useSearchParams();
  const urlIds = searchParams.get("ids");

  const [resolvedIds] = useState<string[]>(() => {
    if (urlIds) {
      return urlIds.split(",").map((id) => id.trim()).filter(Boolean);
    }
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("ys_bulk_edit_ids");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  });

  const queryKey =
    resolvedIds.length > 0
      ? `/api/pages/bulk?ids=${resolvedIds.join(",")}`
      : null;

  const { data: bulkData, isLoading, error, mutate } = useSWR<{ pages: BulkPageItem[] }>(queryKey);
  const pages = bulkData?.pages || [];

  if (resolvedIds.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          No Webpages Selected
        </h2>
        <p className="text-xs text-muted-foreground">
          Select one or more webpages from the webpages table and click &quot;Bulk Edit&quot; to open them here in the spreadsheet.
        </p>
        <Link href="/webpages">
          <Button size="sm" className="mt-2 text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Webpages
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          Failed to Load Selected Webpages
        </h2>
        <p className="text-xs text-muted-foreground">
          {error?.message || "The selected webpages could not be found or have been deleted."}
        </p>
        <Link href="/webpages">
          <Button variant="outline" size="sm" className="text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Return to Webpages Table
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background p-3 sm:p-5">
      <UniversalSpreadsheetEditor
        entityLabel="Webpage"
        backHref="/webpages"
        initialItems={pages}
        columns={WEBPAGE_COLUMNS}
        apiEndpoint="/api/pages/bulk"
        onSaved={async () => {
          await mutate();
        }}
      />
    </div>
  );
}

export default function WebpageBulkEditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <WebpageBulkEditContent />
    </Suspense>
  );
}
