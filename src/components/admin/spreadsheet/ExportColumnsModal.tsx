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
      <DialogContent className="sm:max-w-md p-5 space-y-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Export Selected Columns
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select the exact columns and format to download for {data.length} {entityName}.
          </DialogDescription>
        </DialogHeader>

        {/* Format Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                format === "csv"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV Spreadsheet</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                format === "json"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>JSON Document</span>
            </button>
          </div>
        </div>

        {/* Column Checkboxes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
              Choose Columns ({selectedKeys.size}/{columns.length})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span className="text-muted-foreground text-[10px]">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {columns.map((col) => {
              const isChecked = selectedKeys.has(col.key);
              return (
                <div
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                    isChecked
                      ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
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

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={selectedKeys.size === 0 || isExporting}
            className="text-xs font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
