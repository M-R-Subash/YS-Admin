"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Globe } from "lucide-react";
import { Page } from "@/types";
import { UniversalSeoModal } from "@/components/seo/UniversalSeoModal";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { SeoStatusBadge } from "@/components/seo/SeoStatusBadge";
import { ContentActionCell } from "@/components/table/ContentActionCell";
import {
  createSelectColumn,
  createStatusColumn,
  createDateColumn,
  createActionColumn,
} from "@/components/table/column-helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { clientConfig } from "@/lib/config/client";

export const ActionCell = ({ page, onDataChange }: { page: Page; onDataChange: () => void }) => {
  const baseUrl = clientConfig.app.frontendUrl;
  const pageSlug = page.slug === "/" ? "" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`;

  return (
    <ContentActionCell
      item={page}
      itemType="webpage"
      apiEndpoint="/api/pages"
      editUrl={`/editor/${page.id}`}
      previewUrl={`/webpages/preview/${page.id}`}
      publicUrl={baseUrl ? `${baseUrl}${pageSlug}` : undefined}
      publicUrlLabel="View Live"
      quickEditLabel="Quick Edit (SEO)"
      renderQuickEditModal={({ isOpen, onClose, onSaved }) => (
        <UniversalSeoModal
          entityId={page.id}
          entityType="page"
          isOpen={isOpen}
          onClose={onClose}
          onSaved={onSaved}
          initialData={page}
        />
      )}
      onDataChange={onDataChange}
    />
  );
};

export const getWebpagesColumns = (onDataChange: () => void): ColumnDef<Page>[] => [
  createSelectColumn<Page>({
    isRowDisabled: (page) => ({
      disabled: page.slug === "/",
      reason: "The Homepage is a protected core system page and cannot be bulk modified.",
    }),
  }),
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Page & Title" />,
    meta: {
      className: "w-[240px] md:w-[260px] max-w-[260px]",
    },
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as string || "").toLowerCase();
      const valB = (rowB.getValue(columnId) as string || "").toLowerCase();
      return valA.localeCompare(valB);
    },
    cell: ({ row }) => {
      const page = row.original;
      const pageSlug = page.slug === "/" ? "/" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      return (
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:max-w-60 md:max-w-65 min-w-0">
          <div className="hidden sm:flex w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 items-center justify-center shrink-0 text-primary">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="font-bold text-foreground truncate block text-xs select-text">
                    {page.title}
                  </span>
                }
              />
              <TooltipContent side="top" className="text-xs max-w-sm font-medium">
                {page.title}
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 mt-0.5 min-w-0 w-full overflow-hidden">
              <span className="text-[11px] text-muted-foreground truncate font-mono min-w-0 flex-1">
                {pageSlug}
              </span>
              {page.slug === "/" && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  Protected
                </span>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  createStatusColumn<Page>(),
  {
    id: "seoStatus",
    header: "SEO Score",
    cell: ({ row }) => {
      const page = row.original as any;
      return <SeoStatusBadge seo={page.seo} />;
    },
  },
  {
    id: "author",
    header: "Last Edited By",
    cell: ({ row }) => {
      const page = row.original as any;
      const authorName = page.author?.name || "Admin";
      return (
        <div className="flex items-center gap-2">
          {page.author?.profilePicture ? (
            <img
              src={page.author.profilePicture}
              alt={authorName}
              className="w-6 h-6 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/20">
              {(authorName[0] || "A").toUpperCase()}
            </div>
          )}
          <div className="text-xs">
            <p className="font-medium text-foreground">{authorName}</p>
          </div>
        </div>
      );
    },
  },
  createDateColumn<Page>("createdAt", "Created Date"),
  createDateColumn<Page>("updatedAt", "Last Updated"),
  createActionColumn<Page>((page) => <ActionCell page={page} onDataChange={onDataChange} />),
];
