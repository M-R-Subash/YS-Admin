"use client";

import React, { useState } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface ExportColumnOption {
  key: string;
  label: string;
  category?: string;
}

export interface ExportColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string; // e.g. "blogs", "webpages", "subscribers"
  columns: ExportColumnOption[];
  data: any[];
}

export function ExportColumnsModal({
  isOpen,
  onClose,
  entityName,
  columns,
  data,
}: ExportColumnsModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    return new Set(columns.map((c) => c.key));
  });
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedKeys(new Set(columns.map((c) => c.key)));
  };

  const deselectAll = () => {
    setSelectedKeys(new Set());
  };

  const handleExport = () => {
    if (selectedKeys.size === 0) {
      toast.add({
        title: "No Columns Selected",
        description: "Please select at least one column to export.",
        type: "error",
      });
      return;
    }

    try {
      setIsExporting(true);
      const chosenColumns = columns.filter((c) => selectedKeys.has(c.key));

      // Extract rows with only selected columns
      const exportedRows = data.map((item) => {
        const row: Record<string, any> = {};
        chosenColumns.forEach((col) => {
          let val = item[col.key];

          // Handle nested SEO fields
          if (val === undefined && item.seo && item.seo[col.key] !== undefined) {
            val = item.seo[col.key];
          }

          // Format arrays (categories, tags)
          if (Array.isArray(val)) {
            val = val.join(", ");
          }

          row[col.label] = val !== null && val !== undefined ? val : "";
        });
        return row;
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const normalizedEntity = entityName.endsWith("s") ? entityName : `${entityName}s`;

      if (format === "json") {
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(exportedRows, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = dataStr;
        downloadAnchor.download = `${normalizedEntity}-selected-export-${timestamp}.json`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        // Generate CSV
        const headers = chosenColumns.map((c) => `"${c.label.replace(/"/g, '""')}"`);
        const csvRows = exportedRows.map((row) =>
          chosenColumns
            .map((c) => {
              const cell = String(row[c.label] ?? "");
              return `"${cell.replace(/"/g, '""')}"`;
            })
            .join(",")
        );

        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = url;
        downloadAnchor.download = `${normalizedEntity}-selected-export-${timestamp}.csv`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
      }

      toast.add({
        title: "Export Completed",
        description: `Exported ${data.length} ${normalizedEntity} with ${selectedKeys.size} columns as ${format.toUpperCase()}.`,
        type: "success",
      });

      onClose();
    } catch (err: any) {
      toast.add({
        title: "Export Failed",
        description: err.message || "Failed to generate export file.",
        type: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const pluralEntity = data.length === 1
    ? entityName.replace(/s$/, "")
    : entityName.endsWith("s")
    ? entityName
    : `${entityName}s`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-4 sm:p-6 max-w-lg sm:max-w-xl max-h-[90vh] flex flex-col gap-4 rounded-2xl overflow-hidden shadow-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-border shrink-0">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2.5 text-foreground">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span>Export Selected Columns</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose export format and columns to download for {data.length} {pluralEntity}.
          </DialogDescription>
        </DialogHeader>

        {/* Format Selection Cards */}
        <div className="space-y-1.5 shrink-0">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={cn(
                "flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-left cursor-pointer transition-all select-none",
                format === "csv"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-xs"
                  : "border-border hover:bg-muted/60 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  format === "csv"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">CSV Spreadsheet</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Excel & Sheets (.csv)
                </p>
              </div>
              {format === "csv" && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setFormat("json")}
              className={cn(
                "flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-left cursor-pointer transition-all select-none",
                format === "json"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-xs"
                  : "border-border hover:bg-muted/60 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  format === "json"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <FileJson className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">JSON Document</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Raw data (.json)
                </p>
              </div>
              {format === "json" && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Column Selection Section */}
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between pb-1.5 border-b border-border shrink-0">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Columns ({selectedKeys.size}/{columns.length})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span className="text-muted-foreground text-xs">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Column Checkbox List (Scrollable direct view) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto pr-1 flex-1 min-h-[160px] max-h-[300px]">
            {columns.map((col) => {
              const isChecked = selectedKeys.has(col.key);
              return (
                <div
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-all",
                    isChecked
                      ? "border-primary/50 bg-primary/5 text-foreground font-medium shadow-2xs"
                      : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <span className="truncate">{col.label}</span>
                  </div>
                  {col.category && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-border/80 ml-1.5 shrink-0"
                    >
                      {col.category}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer (Clean side-by-side row on mobile and desktop) */}
        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-border shrink-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 flex-1 sm:flex-initial px-4 text-xs font-semibold cursor-pointer rounded-lg border-border"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={selectedKeys.size === 0 || isExporting}
            className="h-9 flex-1 sm:flex-initial px-5 text-xs font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            Download {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
