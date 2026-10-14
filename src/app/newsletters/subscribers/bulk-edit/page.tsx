"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UniversalSpreadsheetEditor,
  SpreadsheetColumnConfig,
} from "@/components/spreadsheet/UniversalSpreadsheetEditor";

export interface BulkSubscriberItem {
  id: string;
  title: string;
  email: string;
  status: "active" | "unsubscribed";
  source?: string | null;
  createdAt?: string | Date;
}

const SUBSCRIBER_COLUMNS: SpreadsheetColumnConfig[] = [
  {
    key: "email",
    label: "Email Address",
    defaultWidth: 260,
    minWidth: 180,
    type: "text",
    category: "General",
    placeholder: "reader@example.com",
  },
  {
    key: "status",
    label: "Status",
    defaultWidth: 140,
    minWidth: 110,
    type: "status",
    category: "Publishing",
  },
  {
    key: "source",
    label: "Source",
    defaultWidth: 200,
    minWidth: 130,
    type: "text",
    category: "General",
    placeholder: "website / admin-bulk",
  },
];

function SubscriberBulkEditContent() {
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
      ? `/api/newsletters/subscribers/bulk?ids=${resolvedIds.join(",")}`
      : null;

  const { data: bulkData, isLoading, error, mutate } = useSWR<{
    subscribers: {
      id: string;
      email: string;
      status: "active" | "unsubscribed";
      source?: string | null;
      createdAt?: string | Date;
    }[];
  }>(queryKey);

  const mappedSubscribers = useMemo<BulkSubscriberItem[]>(() => {
    return (bulkData?.subscribers || []).map((sub) => ({
      ...sub,
      title: sub.email,
    }));
  }, [bulkData]);

  if (resolvedIds.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          No Subscribers Selected
        </h2>
        <p className="text-xs text-muted-foreground">
          Select one or more newsletter subscribers from the table and click &quot;Bulk Edit&quot; to open them here in the spreadsheet editor.
        </p>
        <Link href="/newsletters">
          <Button size="sm" className="mt-2 text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Subscribers
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

  if (error || mappedSubscribers.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          Failed to Load Selected Subscribers
        </h2>
        <p className="text-xs text-muted-foreground">
          {error?.message || "The selected subscribers could not be found or have been removed."}
        </p>
        <Link href="/newsletters">
          <Button variant="outline" size="sm" className="text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Return to Subscribers Table
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background p-3 sm:p-5">
      <UniversalSpreadsheetEditor
        entityLabel="Subscriber"
        primaryColumnLabel="Subscriber Email"
        backHref="/newsletters"
        initialItems={mappedSubscribers}
        columns={SUBSCRIBER_COLUMNS}
        apiEndpoint="/api/newsletters/subscribers/bulk"
        onSaved={async () => {
          await mutate();
        }}
      />
    </div>
  );
}

export default function SubscriberBulkEditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <SubscriberBulkEditContent />
    </Suspense>
  );
}
