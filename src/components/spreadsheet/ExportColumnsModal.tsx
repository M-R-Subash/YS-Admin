"use client";

import React, { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
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
import { toast } from "@/components/ui/toast";

export interface ExportColumnOption {
  key: string;
  label: string;
  category?: string;
}

export interface ExportColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string; // e.g. "blogs", "webpages"
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

      if (format === "json") {
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(exportedRows, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = dataStr;
        downloadAnchor.download = `${entityName}-selected-export-${timestamp}.json`;
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
        downloadAnchor.download = `${entityName}-selected-export-${timestamp}.csv`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
      }

      toast.add({
        title: "Export Completed",
        description: `Exported ${data.length} ${entityName} with ${selectedKeys.size} columns as ${format.toUpperCase()}.`,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl p-6 sm:p-7 space-y-5 rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border">
          <DialogTitle className="text-lg font-bold flex items-center gap-2.5 text-foreground">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Download className="w-5 h-5" />
            </div>
            <span>Export Selected Columns</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Choose the columns and preferred file format to download for {data.length} {entityName}.
          </DialogDescription>
        </DialogHeader>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                format === "csv"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV Spreadsheet</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                format === "json"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>JSON Document</span>
            </button>
          </div>
        </div>

        {/* Column Checkboxes */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-border">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Choose Columns ({selectedKeys.size}/{columns.length})
            </label>
            <div className="flex items-center gap-2.5">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {columns.map((col) => {
              const isChecked = selectedKeys.has(col.key);
              return (
                <div
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer select-none transition-all ${
                    isChecked
                      ? "border-primary/50 bg-primary/5 text-foreground font-medium shadow-2xs"
                      : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  <span className="truncate">{col.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onClose}
            className="h-10 px-5 text-sm font-medium cursor-pointer rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="default"
            onClick={handleExport}
            disabled={selectedKeys.size === 0 || isExporting}
            className="h-10 px-5 text-sm font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
          >
            <Download className="w-4 h-4 mr-2" />
            Download {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
