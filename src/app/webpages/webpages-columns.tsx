"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Page } from "@/types";
import { UniversalSeoModal } from "@/components/admin/UniversalSeoModal";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SeoStatusBadge } from "@/components/admin/SeoStatusBadge";
import { ContentActionCell } from "@/components/admin/ContentActionCell";
import { formatDate } from "@/lib/utils";

// Action Component
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
      publicUrlLabel="View Page"
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as string || "").toLowerCase();
      const valB = (rowB.getValue(columnId) as string || "").toLowerCase();
      return valA.localeCompare(valB);
    },
    cell: ({ row }) => {
      const title: string = row.getValue("title");
      return (
        <div className="font-bold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {title}
        </div>
      );
    },
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => <div className="text-muted-foreground font-mono">{row.getValue("slug")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    id: "seoStatus",
    header: "SEO Status",
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
      return <div className="text-muted-foreground">{page.author?.name || "Default - Admin"}</div>;
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
      <div className="text-right">
        <ActionCell page={row.original} onDataChange={onDataChange} />
      </div>
    ),
  },
];
