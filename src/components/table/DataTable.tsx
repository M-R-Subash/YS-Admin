"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  OnChangeFn,
  Row,
  RowData,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
    headerClassName?: string;
    cellClassName?: string;
  }
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultSorting?: SortingState;
  renderMobileCard?: (row: Row<TData>) => React.ReactNode;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  renderBulkActionDock?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode;
  getRowClassName?: (row: TData) => string | undefined;
}

function getColumnLabel(columnId: string): string {
  const map: Record<string, string> = {
    publishedAt: "Published",
    updatedAt: "Updated",
    createdAt: "Created",
    scheduledAt: "Scheduled",
    categories: "Categories",
    author: "Author",
    comments: "Comments",
    status: "Status",
    seoStatus: "SEO Score",
    email: "Email",
    role: "Role",
    lastLogin: "Last Login",
    destinationUrl: "Destination",
  };
  if (map[columnId]) return map[columnId];
  return columnId
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultSorting = [],
  renderMobileCard,
  enableRowSelection = true,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: setControlledRowSelection,
  renderBulkActionDock,
  getRowClassName,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});

  const rowSelection = controlledRowSelection !== undefined ? controlledRowSelection : internalRowSelection;
  const setRowSelection = setControlledRowSelection !== undefined ? setControlledRowSelection : setInternalRowSelection;

  const table = useReactTable({
    data,
    columns,
    enableRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row: any, relativeIndex: number) =>
      row?.id ?? row?._id ?? row?.slug ?? String(relativeIndex),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-4">
      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block rounded-sm border border-border bg-card overflow-hidden shadow-xs">
        <Table className="text-xs">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-border bg-muted/40 font-semibold text-muted-foreground hover:bg-muted/40"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "py-3 px-4 text-xs font-semibold text-muted-foreground",
                        header.column.columnDef.meta?.headerClassName ||
                          header.column.columnDef.meta?.className
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:bg-muted/30 transition-colors data-[state=selected]:bg-muted/60 data-[state=selected]:hover:bg-muted/80",
                    getRowClassName?.(row.original)
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "py-3 px-4 text-xs",
                        cell.column.columnDef.meta?.cellClassName ||
                          cell.column.columnDef.meta?.className
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center py-6 text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Stack View (< md) */}
      <div className="block md:hidden space-y-3">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            if (renderMobileCard) {
              return (
                <React.Fragment key={row.id}>
                  {renderMobileCard(row)}
                </React.Fragment>
              );
            }

            const cells = row.getVisibleCells();
            const actionCell = cells.find((c) => c.column.id === "actions");
            const selectCell = cells.find(
              (c) => c.column.id === "select" || c.column.id === "checkbox"
            );
            const primaryCell =
              cells.find((c) =>
                ["title", "name", "page", "post", "heading", "user"].includes(
                  c.column.id.toLowerCase()
                )
              ) ||
              cells.find(
                (c) =>
                  c.column.id !== "actions" &&
                  c.column.id !== "select" &&
                  c.column.id !== "checkbox"
              ) ||
              cells[0];

            const badgeCells = cells.filter(
              (c) =>
                c !== primaryCell &&
                c !== actionCell &&
                c !== selectCell &&
                [
                  "status",
                  "seostatus",
                  "categories",
                  "role",
                  "type",
                  "priority",
                  "state",
                  "schedulestate",
                  "schedulestatus",
                ].includes(c.column.id.toLowerCase())
            );

            const metaCells = cells.filter(
              (c) =>
                c !== primaryCell &&
                c !== actionCell &&
                c !== selectCell &&
                !badgeCells.includes(c)
            );

            return (
              <div
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "rounded-sm border border-border bg-card p-3.5 shadow-xs transition-colors hover:border-border/80",
                  getRowClassName?.(row.original)
                )}
              >
                {/* Header: Select + Primary Cell (Image + Title) + Action Cell (3 dots) */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {selectCell && (
                      <div className="pt-0.5 shrink-0">
                        {flexRender(
                          selectCell.column.columnDef.cell,
                          selectCell.getContext()
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 w-full">
                      {primaryCell &&
                        flexRender(
                          primaryCell.column.columnDef.cell,
                          primaryCell.getContext()
                        )}
                    </div>
                  </div>
                  {actionCell && (
                    <div className="shrink-0 -mr-1 -mt-0.5">
                      {flexRender(
                        actionCell.column.columnDef.cell,
                        actionCell.getContext()
                      )}
                    </div>
                  )}
                </div>

                {/* Badges / Chips Row (Status, SEO, Categories, Role) */}
                {badgeCells.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-border/60">
                    {badgeCells.map((cell) => (
                      <div key={cell.id} className="shrink-0">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Secondary Metadata Grid (Author, Dates, Comments, etc.) */}
                {metaCells.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2.5 pt-2.5 border-t border-border/40 text-xs">
                    {metaCells.map((cell) => {
                      const label = getColumnLabel(cell.column.id);
                      return (
                        <div
                          key={cell.id}
                          className="flex items-center justify-between sm:justify-start gap-2 min-w-0"
                        >
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                            {label}:
                          </span>
                          <div className="min-w-0 truncate text-foreground font-normal text-xs">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-sm border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No results.
          </div>
        )}
      </div>

      {/* Responsive Pagination */}
      {data.length > 10 && (
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1">
          <div className="text-xs text-muted-foreground sm:hidden">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 text-xs cursor-pointer"
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground hidden sm:block px-2">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 text-xs cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Dock */}
      {renderBulkActionDock && selectedRows.length > 0 && (
        renderBulkActionDock(selectedRows, () => table.resetRowSelection())
      )}
    </div>
  );
}
