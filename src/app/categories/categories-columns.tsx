"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { FolderTree, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { createActionColumn } from "@/components/table/column-helpers";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  focusKeyword: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  postCount: number;
  createdAt: string;
}

interface CategoriesColumnsProps {
  onEdit: (cat: CategoryItem) => void;
  onDelete: (cat: CategoryItem) => void;
}

export function getCategoriesColumns({
  onEdit,
  onDelete,
}: CategoriesColumnsProps): ColumnDef<CategoryItem>[] {
  return [
    {
      accessorKey: "name",
      id: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category Name" />
      ),
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <FolderTree className="size-3.5 text-primary shrink-0" />
            <span>{cat.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "slug",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Slug" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {row.original.slug}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const desc = row.original.description;
        return desc ? (
          <span className="text-muted-foreground max-w-xs truncate block text-xs">
            {desc}
          </span>
        ) : (
          <span className="italic text-muted-foreground/60 text-xs">—</span>
        );
      },
    },
    {
      id: "seo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SEO Status" />
      ),
      cell: ({ row }) => {
        const cat = row.original;
        const hasCustomSeo = Boolean(cat.metaTitle || cat.metaDesc || cat.focusKeyword);
        return hasCustomSeo ? (
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 inline-flex items-center gap-1 rounded-sm"
          >
            <CheckCircle2 className="size-2.5" />
            Custom SEO
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[10px] text-muted-foreground inline-flex items-center gap-1 rounded-sm"
          >
            Default
          </Badge>
        );
      },
    },
    {
      accessorKey: "postCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Articles" />
      ),
      cell: ({ row }) => {
        const count = row.original.postCount;
        return (
          <Badge
            variant="secondary"
            className="text-[11px] font-semibold px-2 py-0.5 rounded-sm"
          >
            {count} {count === 1 ? "article" : "articles"}
          </Badge>
        );
      },
    },
    createActionColumn<CategoryItem>((cat) => (
      <div className="inline-flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(cat)}
          className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground rounded-sm"
          title="Edit Category & SEO"
        >
          <Edit2 className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(cat)}
          className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10 rounded-sm"
          title="Delete Category"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    )),
  ];
}
