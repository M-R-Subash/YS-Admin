"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Globe } from "lucide-react";
import { Page } from "@/types";
import { UniversalSeoModal } from "@/components/admin/UniversalSeoModal";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SeoStatusBadge } from "@/components/admin/SeoStatusBadge";
import { ContentActionCell } from "@/components/admin/ContentActionCell";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
export const ActionCell = ({ page, onDataChange }: { page: Page; onDataChange: () => void }) => {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";
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
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Page & Title" />,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as string || "").toLowerCase();
      const valB = (rowB.getValue(columnId) as string || "").toLowerCase();
      return valA.localeCompare(valB);
    },
    cell: ({ row }) => {
      const page = row.original;
      const pageSlug = page.slug === "/" ? "/" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      return (
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1 w-full">
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
            <div className="flex items-center gap-2 mt-0.5 min-w-0 w-full">
              <span className="text-[11px] text-muted-foreground truncate font-mono min-w-0 flex-1">
                {pageSlug}
              </span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
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
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created Date" />,
    sortingFn: (rowA, rowB, columnId) => {
      const timeA = rowA.getValue(columnId) ? new Date(rowA.getValue(columnId) as string).getTime() : 0;
      const timeB = rowB.getValue(columnId) ? new Date(rowB.getValue(columnId) as string).getTime() : 0;
      return timeA - timeB;
    },
    cell: ({ row }) => <div className="text-muted-foreground text-xs">{formatDate(row.getValue("createdAt"))}</div>,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
    sortingFn: (rowA, rowB, columnId) => {
      const timeA = rowA.getValue(columnId) ? new Date(rowA.getValue(columnId) as string).getTime() : 0;
      const timeB = rowB.getValue(columnId) ? new Date(rowB.getValue(columnId) as string).getTime() : 0;
      return timeA - timeB;
    },
    cell: ({ row }) => <div className="text-muted-foreground text-xs">{formatDate(row.getValue("updatedAt"))}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right flex justify-end">
        <ActionCell page={row.original} onDataChange={onDataChange} />
      </div>
    ),
  },
];
