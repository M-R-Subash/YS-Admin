"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Hash, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { createActionColumn } from "@/components/table/column-helpers";

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  createdAt: string;
}

interface TagsColumnsProps {
  onEdit: (tag: TagItem) => void;
  onDelete: (tag: TagItem) => void;
}

export function getTagsColumns({
  onEdit,
  onDelete,
}: TagsColumnsProps): ColumnDef<TagItem>[] {
  return [
    {
      accessorKey: "name",
      id: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tag Name" />
      ),
      cell: ({ row }) => {
        const tag = row.original;
        return (
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-sm bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
          >
            <Hash className="size-2.5 text-purple-500 shrink-0" />
            <span>{tag.name}</span>
          </Badge>
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
    createActionColumn<TagItem>((tag) => (
      <div className="inline-flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(tag)}
          className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground rounded-sm"
          title="Edit Tag"
        >
          <Edit2 className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(tag)}
          className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10 rounded-sm"
          title="Delete Tag"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    )),
  ];
}
