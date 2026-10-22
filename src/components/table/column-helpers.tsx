"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/table/StatusBadge";
import { formatDate } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

/**
 * Reusable selection checkbox column for TanStack tables.
 * Eliminates 30+ lines of duplicated checkbox boilerplate.
 */
export function createSelectColumn<T>(options?: {
  isRowDisabled?: (row: T) => { disabled: boolean; reason?: string };
}): ColumnDef<T> {
  return {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center px-1">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          aria-label="Select all rows"
          className="cursor-pointer"
        />
      </div>
    ),
    cell: ({ row }) => {
      const disabledInfo = options?.isRowDisabled ? options.isRowDisabled(row.original) : { disabled: false };
      if (disabledInfo.disabled) {
        return (
          <div
            className="flex items-center justify-center px-1 cursor-not-allowed"
            title={disabledInfo.reason || "Locked"}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={false}
              disabled
              aria-label={disabledInfo.reason || "Row is locked"}
              className="opacity-30 cursor-not-allowed pointer-events-none"
            />
          </div>
        );
      }
      return (
        <div
          className="flex items-center justify-center px-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className="cursor-pointer"
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: "w-10 min-w-10 max-w-10 px-2 text-center",
      headerClassName: "w-10 min-w-10 max-w-10 px-2 text-center",
    },
  };
}

/**
 * Standard StatusBadge column with DataTableColumnHeader.
 */
export function createStatusColumn<T>(options?: {
  accessorKey?: string;
  header?: string;
  className?: string;
}): ColumnDef<T> {
  const key = options?.accessorKey || "status";
  const title = options?.header || "Status";

  return {
    accessorKey: key,
    header: ({ column }) => <DataTableColumnHeader column={column} title={title} />,
    cell: ({ row }) => {
      const item = row.original as any;
      return (
        <StatusBadge
          status={item[key]}
          scheduledAt={item.scheduledAt}
        />
      );
    },
    meta: {
      className: options?.className || "w-[120px]",
    },
  };
}

/**
 * Standard Date column with sorting and formatting.
 */
export function createDateColumn<T>(
  accessorKey: keyof T | string,
  header: string,
  options?: {
    showRelative?: boolean;
    className?: string;
  }
): ColumnDef<T> {
  const key = accessorKey as string;

  return {
    accessorKey: key,
    header: ({ column }) => <DataTableColumnHeader column={column} title={header} />,
    cell: ({ row }) => {
      const rawDate = (row.original as any)[key];
      if (!rawDate) return <span className="text-muted-foreground text-xs italic">—</span>;

      try {
        const date = new Date(rawDate);
        if (isNaN(date.getTime())) return <span className="text-muted-foreground text-xs">—</span>;

        if (options?.showRelative) {
          return (
            <div className="flex flex-col text-xs">
              <span className="font-medium text-foreground">
                {formatDistanceToNow(date, { addSuffix: true })}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {format(date, "MMM d, yyyy")}
              </span>
            </div>
          );
        }

        return (
          <span className="text-xs text-muted-foreground">
            {formatDate(String(rawDate))}
          </span>
        );
      } catch {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
    },
    meta: {
      className: options?.className || "w-[150px]",
    },
  };
}

/**
 * Standard action cell column wrapper.
 */
export function createActionColumn<T>(
  render: (item: T, row: any) => React.ReactNode,
  options?: {
    className?: string;
  }
): ColumnDef<T> {
  return {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => render(row.original, row),
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: options?.className || "w-[60px] text-right",
    },
  };
}
