"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Upload,
  Mail,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface AddSubscribersModalProps {
  isOpen: boolean;
  initialTab?: "csv" | "manual";
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSubscribersModal = React.memo(function AddSubscribersModal({
  isOpen,
  initialTab = "manual",
  onClose,
  onSuccess,
}: AddSubscribersModalProps) {
  const [addModalTab, setAddModalTab] = useState<"csv" | "manual">(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setAddModalTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [newEmailsInput, setNewEmailsInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedEmails, setCsvParsedEmails] = useState<string[]>([]);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isAddingSubscribers, setIsAddingSubscribers] = useState(false);

  const manualParsedEmails = useMemo(() => {
    if (!newEmailsInput.trim()) return [];
    const matches = newEmailsInput.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    );
    if (!matches) return [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  }, [newEmailsInput]);

  function handleDownloadSampleCsv() {
    const sample =
      "email,source\nreader1@example.com,website\nclient@company.com,campaign\n";
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ys_subscribers_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleCsvFileSelect(file: File) {
    if (!file) return;
    setCsvFile(file);
    setIsParsingCsv(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setCsvParsedEmails([]);
          return;
        }
        const matches = text.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        );
        const unique = Array.from(
          new Set((matches || []).map((em) => em.toLowerCase().trim())),
        );
        setCsvParsedEmails(unique);
        if (unique.length === 0) {
          toast.add({
            title: "No valid email addresses found in file",
            type: "error",
          });
        }
      } catch {
        toast.add({
          title: "Failed to read CSV file",
          type: "error",
        });
      } finally {
        setIsParsingCsv(false);
      }
    };
    reader.onerror = () => {
      setIsParsingCsv(false);
      toast.add({ title: "Failed to read file", type: "error" });
    };
    reader.readAsText(file);
  }

  async function handleAddSubscribers() {
    const emailsToImport =
      addModalTab === "csv" ? csvParsedEmails : manualParsedEmails;

    if (emailsToImport.length === 0) {
      toast.add({
        title: "Please enter or upload at least one valid email address",
        type: "error",
      });
      return;
    }

    setIsAddingSubscribers(true);
    try {
      const res = await fetch("/api/newsletters/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailsToImport,
          source: addModalTab === "csv" ? "admin-csv" : "admin-manual",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onClose();
        setNewEmailsInput("");
        setCsvFile(null);
        setCsvParsedEmails([]);
        onSuccess();
        toast.add({
          title:
            data.message || `Processed ${emailsToImport.length} subscriber(s)`,
          type: "success",
        });
      } else {
        toast.add({
          title: data.error || "Failed to import subscribers",
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Network error occurred while importing subscribers",
        type: "error",
      });
    } finally {
      setIsAddingSubscribers(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl transition-all">
        <DialogHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground tracking-tight">
                Manage &amp; Import Subscribers
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add new readers manually or bulk import lists via CSV
                spreadsheet.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/70 mt-3 mb-4 gap-2">
          <button
            type="button"
            onClick={() => setAddModalTab("csv")}
            className={cn(
              "flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
              addModalTab === "csv"
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV File</span>
            {csvParsedEmails.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1 bg-amber-500/20 text-amber-400"
              >
                {csvParsedEmails.length}
              </Badge>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAddModalTab("manual")}
            className={cn(
              "flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
              addModalTab === "manual"
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
            {manualParsedEmails.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1 bg-amber-500/20 text-amber-400"
              >
                {manualParsedEmails.length}
              </Badge>
            )}
          </button>
        </div>

        {/* TAB CONTENT: CSV UPLOAD */}
        {addModalTab === "csv" ? (
          <div className="h-68.75 flex flex-col justify-between text-xs">
            {!csvFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleCsvFileSelect(file);
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer",
                  isDraggingFile
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border/80 hover:border-amber-500/50 bg-muted/10 hover:bg-muted/20",
                )}
                onClick={() => {
                  document.getElementById("csv-file-input")?.click();
                }}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvFileSelect(file);
                  }}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="size-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      Click to upload or drag &amp; drop CSV file
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      supports .csv or .txt containing email addresses
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between overflow-hidden gap-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/20 shrink-0">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-foreground text-xs truncate">
                        {csvFile.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(csvFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCsvFile(null);
                      setCsvParsedEmails([]);
                    }}
                    className="text-xs text-muted-foreground hover:text-rose-500 cursor-pointer font-medium shrink-0 ml-2"
                  >
                    Change file
                  </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col justify-center">
                  {isParsingCsv ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Parsing email addresses from file...</span>
                    </div>
                  ) : csvParsedEmails.length > 0 ? (
                    <div className="h-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex flex-col justify-between overflow-hidden">
                      <div className="flex items-center justify-between mb-1 shrink-0">
                        <span className="text-emerald-500 font-semibold flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {csvParsedEmails.length} valid email address
                          {csvParsedEmails.length > 1 ? "es" : ""} found
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto flex flex-wrap gap-1 p-1 bg-background/50 rounded-lg">
                        {csvParsedEmails.slice(0, 30).map((em, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] font-mono px-1.5 py-0.5"
                          >
                            {em}
                          </Badge>
                        ))}
                        {csvParsedEmails.length > 30 && (
                          <span className="text-[10px] text-muted-foreground self-center px-1">
                            +{csvParsedEmails.length - 30} more
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20">
                      No valid email addresses found in this file.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t border-border/50 shrink-0">
              <span>Need an example spreadsheet?</span>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="text-amber-500 hover:text-amber-400 underline font-medium cursor-pointer"
              >
                download sample csv template
              </button>
            </div>
          </div>
        ) : (
          <div className="h-68.75 flex flex-col justify-between text-xs gap-2">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-muted-foreground">
                Enter email addresses separated by commas, spaces, or new
                lines:
              </span>
              {manualParsedEmails.length > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px]"
                >
                  {manualParsedEmails.length} email
                  {manualParsedEmails.length > 1 ? "s" : ""} detected
                </Badge>
              )}
            </div>
            <Textarea
              placeholder="reader1@example.com&#10;client@company.com, info@agency.com"
              value={newEmailsInput}
              onChange={(e) => setNewEmailsInput(e.target.value)}
              className="font-mono text-xs bg-background leading-relaxed flex-1 resize-none p-3 rounded-xl border border-input"
            />
            <p className="text-[11px] text-muted-foreground shrink-0">
              Duplicates and invalid emails will be automatically sanitized
              before adding.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-9 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAddSubscribers}
            disabled={
              isAddingSubscribers ||
              (addModalTab === "csv"
                ? csvParsedEmails.length === 0
                : manualParsedEmails.length === 0)
            }
            className="text-xs h-9 bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black font-semibold cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isAddingSubscribers ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1.5" />
            )}
            {addModalTab === "csv"
              ? `Import ${csvParsedEmails.length || 0} Subscribers`
              : `Save ${manualParsedEmails.length || 0} Subscribers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
