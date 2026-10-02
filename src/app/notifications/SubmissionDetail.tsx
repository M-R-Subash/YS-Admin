"use client";

import {
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle,
  Circle,
  Trash2,
  Globe,
  Monitor,
  Calendar,
  MessageSquare,
  Inbox,
  Tag,
  Undo2,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "./CopyButton";
import {
  FormSubmission,
  MobileView,
  getSenderName,
  formatKeyName,
  isCopyableField,
} from "./types";

interface SubmissionDetailProps {
  selectedSubmission: FormSubmission | null;
  totalCount: number;
  loading: boolean;
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
  toggleReadStatus: (submission: FormSubmission) => void;
  openTrashModal: (
    type: "trash" | "restore" | "delete",
    item: FormSubmission,
    id: string,
    name: string
  ) => void;
  handleRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function SubmissionDetail({
  selectedSubmission,
  totalCount,
  loading,
  mobileView,
  setMobileView,
  toggleReadStatus,
  openTrashModal,
  handleRefresh,
  isRefreshing,
}: SubmissionDetailProps) {
  return (
    <main
      className={`w-full shrink-0 md:w-auto md:flex-1 h-full flex flex-col overflow-hidden bg-background min-h-0 transition-opacity ${
        mobileView !== "detail" ? "pointer-events-none md:pointer-events-auto" : ""
      }`}
    >
      {selectedSubmission ? (
        <div className="h-full flex flex-col overflow-hidden">
          {/* Mobile Top Navigation & Quick Actions Bar */}
          <div className="p-3 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-card md:hidden">
            <button
              onClick={() => setMobileView("list")}
              className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-2.5 py-1.5 rounded-sm transition-colors cursor-pointer border border-border shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Inbox ({totalCount})</span>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleRefresh}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing || loading ? "animate-spin" : ""}`}
                />
              </button>

              {!selectedSubmission.isTrashed && (
                <button
                  onClick={() => toggleReadStatus(selectedSubmission)}
                  className="p-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
                  title={
                    selectedSubmission.isRead
                      ? "Mark as unread"
                      : "Mark as read"
                  }
                >
                  {selectedSubmission.isRead ? (
                    <Circle className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>
              )}

              {selectedSubmission.isTrashed ? (
                <>
                  <button
                    onClick={() =>
                      openTrashModal(
                        "restore",
                        selectedSubmission,
                        selectedSubmission.id,
                        getSenderName(selectedSubmission.payload)
                      )
                    }
                    className="p-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Restore submission"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      openTrashModal(
                        "delete",
                        selectedSubmission,
                        selectedSubmission.id,
                        getSenderName(selectedSubmission.payload)
                      )
                    }
                    className="p-1.5 rounded-md border border-red-300 bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    openTrashModal(
                      "trash",
                      selectedSubmission,
                      selectedSubmission.id,
                      getSenderName(selectedSubmission.payload)
                    )
                  }
                  className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                  title="Move to trash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Detail View Header */}
          <div className="p-4 sm:p-6 border-b border-border bg-card space-y-4 shrink-0 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2.5 py-0.5"
                  >
                    {selectedSubmission.formName}
                  </Badge>
                  {selectedSubmission.sourceUrl && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md cursor-help truncate max-w-[240px] sm:max-w-none" />
                        }
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{selectedSubmission.sourceUrl}</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Submitted from URL: {selectedSubmission.sourceUrl}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Sender Name with Copy Button */}
                <div className="flex items-center gap-2 pt-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                    {getSenderName(selectedSubmission.payload)}
                  </h2>
                  <CopyButton
                    text={getSenderName(selectedSubmission.payload)}
                    label="Sender Name"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {format(
                      new Date(selectedSubmission.createdAt),
                      "PPP 'at' p"
                    )}
                  </span>
                </div>
              </div>

              {/* Desktop Action Buttons with Tooltips */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                {selectedSubmission.payload?.email && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a
                          href={`mailto:${selectedSubmission.payload.email}`}
                          className="px-3 py-2 rounded-lg bg-black hover:bg-black/90 text-white dark:bg-white dark:text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        />
                      }
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Lead</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Send email to {selectedSubmission.payload.email}
                    </TooltipContent>
                  </Tooltip>
                )}

                {selectedSubmission.payload?.phone && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a
                          href={`tel:${selectedSubmission.payload.phone}`}
                          className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-border"
                        />
                      }
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Call {selectedSubmission.payload.phone}
                    </TooltipContent>
                  </Tooltip>
                )}

                {!selectedSubmission.isTrashed && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={() => toggleReadStatus(selectedSubmission)}
                          className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
                        />
                      }
                    >
                      {selectedSubmission.isRead ? (
                        <Circle className="w-4 h-4 text-blue-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {selectedSubmission.isRead
                        ? "Mark as unread"
                        : "Mark as read"}
                    </TooltipContent>
                  </Tooltip>
                )}

                {selectedSubmission.isTrashed ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            onClick={() =>
                              openTrashModal(
                                "restore",
                                selectedSubmission,
                                selectedSubmission.id,
                                getSenderName(selectedSubmission.payload)
                              )
                            }
                            className="p-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                          />
                        }
                      >
                        <Undo2 className="w-4 h-4" />
                        <span>Restore</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Restore submission from trash
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            onClick={() =>
                              openTrashModal(
                                "delete",
                                selectedSubmission,
                                selectedSubmission.id,
                                getSenderName(selectedSubmission.payload)
                              )
                            }
                            className="p-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                          />
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Permanently</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Permanently delete submission
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={() =>
                            openTrashModal(
                              "trash",
                              selectedSubmission,
                              selectedSubmission.id,
                              getSenderName(selectedSubmission.payload)
                            )
                          }
                          className="p-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                        />
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Move submission to trash
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Mobile-only Prominent Lead Action Buttons (Call / Email) */}
            {(selectedSubmission.payload?.email ||
              selectedSubmission.payload?.phone) && (
              <div className="grid grid-cols-2 gap-2 pt-1 md:hidden">
                {selectedSubmission.payload?.email && (
                  <a
                    href={`mailto:${selectedSubmission.payload.email}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-98"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Lead</span>
                  </a>
                )}
                {selectedSubmission.payload?.phone && (
                  <a
                    href={`tel:${selectedSubmission.payload.phone}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-bold border border-border transition-all cursor-pointer active:scale-98"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Lead</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Detail View Body: Dynamic Payload Key-Value Inspector */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            {/* Dynamic Form Payload Fields */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
                <Tag className="w-3.5 h-3.5" />
                <span>Form Payload Data</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {Object.entries(selectedSubmission.payload || {}).map(
                  ([key, value]) => {
                    if (key === "message") return null;

                    const stringValue =
                      typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value);

                    const formattedLabel = formatKeyName(key);
                    const copyable = isCopyableField(key);

                    return (
                      <div
                        key={key}
                        className="p-3.5 sm:p-4 rounded-sm border border-border bg-card space-y-1 relative group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {formattedLabel}
                          </span>
                          {copyable && stringValue && (
                            <CopyButton
                              text={stringValue}
                              label={formattedLabel}
                            />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground break-words pt-0.5">
                          {stringValue || "—"}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Message Block if present */}
              {selectedSubmission.payload?.message && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message / Project Scope</span>
                    </span>
                    <CopyButton
                      text={selectedSubmission.payload.message}
                      label="Message"
                    />
                  </div>
                  <div className="p-4 sm:p-5 rounded-sm border border-border bg-card text-foreground text-sm font-medium leading-relaxed whitespace-pre-wrap shadow-xs break-words">
                    {selectedSubmission.payload.message}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Footer: Collapsible on Mobile, Expanded on Desktop */}
            <div className="pt-4 sm:pt-6 border-t border-border">
              <details className="group [&_summary::-webkit-details-marker]:hidden" open>
                <summary className="flex items-center justify-between cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-muted-foreground pb-3">
                  <span className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Captured Security & Device Metadata</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180 md:hidden" />
                </summary>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  <div className="p-3.5 sm:p-4 rounded-sm border border-border bg-muted/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      IP Address
                    </span>
                    <p className="text-xs font-mono font-semibold text-foreground">
                      {selectedSubmission.ipAddress || "Unknown / localhost"}
                    </p>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-sm border border-border bg-muted/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      User Agent / Browser
                    </span>
                    <p className="text-xs font-mono font-semibold text-foreground break-all leading-normal">
                      {selectedSubmission.userAgent || "Unknown Browser"}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      ) : loading ? (
        /* Skeleton State for Detail View */
        <div className="h-full flex flex-col overflow-hidden bg-background">
          <div className="p-4 sm:p-6 border-b border-border bg-card space-y-4 shrink-0 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-sm" />
                  <Skeleton className="h-5 w-32 rounded-md" />
                </div>
                <Skeleton className="h-7 w-64 pt-1" />
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full rounded-sm" />
                <Skeleton className="h-20 w-full rounded-sm" />
                <Skeleton className="h-20 w-full rounded-sm" />
                <Skeleton className="h-20 w-full rounded-sm" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-28 w-full rounded-sm" />
            </div>
            <div className="pt-6 border-t border-border space-y-3">
              <Skeleton className="h-4 w-44" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-16 w-full rounded-sm" />
                <Skeleton className="h-16 w-full rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State when no submission selected */
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-muted/10">
          <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              No Submission Selected
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Select a message from the list to view submission details,
              contact information, and captured metadata.
            </p>
          </div>
          {/* Mobile Back Button fallback */}
          <button
            onClick={() => setMobileView("list")}
            className="md:hidden flex items-center gap-1.5 text-xs font-bold text-foreground bg-card hover:bg-muted px-3 py-2 rounded-sm border border-border transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Inbox List</span>
          </button>
        </div>
      )}
    </main>
  );
}
