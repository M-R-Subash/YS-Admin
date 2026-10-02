"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Power,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

export interface RedirectionItem {
  id: string;
  sourceUrl: string;
  destinationUrl: string;
  statusCode: number;
  status: "active" | "inactive" | "trashed";
  createdAt: string;
  updatedAt: string;
}

interface RedirectionColumnsProps {
  onEdit: (item: RedirectionItem) => void;
  onToggleStatus: (item: RedirectionItem) => void;
  onTrash: (item: RedirectionItem) => void;
  onRestore: (item: RedirectionItem) => void;
  onDelete: (item: RedirectionItem) => void;
}

export function getRedirectionColumns({
  onEdit,
  onToggleStatus,
  onTrash,
  onRestore,
  onDelete,
}: RedirectionColumnsProps): ColumnDef<RedirectionItem>[] {
  return [
    {
      accessorKey: "sourceUrl",
      id: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source URL" />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2.5 w-full min-w-0">
            <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground text-xs break-all">
                  {item.sourceUrl}
                </span>
                <CopyButton value={item.sourceUrl} label="Source URL" />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "destinationUrl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Destination URL" />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <a
            href={item.destinationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors max-w-xs truncate"
          >
            <span className="truncate">{item.destinationUrl}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
          </a>
        );
      },
    },
    {
      accessorKey: "statusCode",
      id: "type",
      header: "HTTP Status",
      cell: ({ row }) => {
        const item = row.original;
        const is301 = item.statusCode === 301;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-extrabold tracking-wide ${
              is301
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                : "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300"
            }`}
          >
            {item.statusCode} {is301 ? "Permanent" : "Temporary"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "State",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-extrabold capitalize ${
              item.status === "active"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                : item.status === "inactive"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.status === "active"
                  ? "bg-emerald-500"
                  : item.status === "inactive"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
            {item.status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        const isTrashed = item.status === "trashed";

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {!isTrashed ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => onEdit(item)}
                      className="cursor-pointer text-xs"
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit Redirect
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onToggleStatus(item)}
                      className="cursor-pointer text-xs"
                    >
                      <Power className="mr-2 h-3.5 w-3.5" />
                      {item.status === "active"
                        ? "Deactivate Rule"
                        : "Activate Rule"}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => onTrash(item)}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 text-xs"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Move to Trash
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => onRestore(item)}
                      className="cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/50 text-xs"
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      Restore Redirect
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => onDelete(item)}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 text-xs font-semibold"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
