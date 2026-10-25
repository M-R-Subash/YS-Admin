import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  ArrowRight,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { AuditLogItem } from "../types";
import {
  getTransitionInfo,
  getSimpleExplanation,
  getItemCleanName,
  formatDiffValue,
} from "../utils/audit-helpers";

export interface AuditLogInspectorProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export function AuditLogInspector({ log }: AuditLogInspectorProps) {
  const [copiedId, setCopiedId] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  if (!log) return null;

  const copyLogId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(false), 2000);
  };

  const date = new Date(log.timestamp);
  const trans = getTransitionInfo(log);
  const explanation = getSimpleExplanation(log);
  const itemInfo = getItemCleanName(log);
  const meta = log.metadata || {};

  return (
    <>
      <SheetHeader className="p-5 border-b border-border/60 bg-muted/20">
        <div className="flex items-start justify-between gap-3 pr-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 bg-primary/10 text-primary border-primary/20"
              >
                {log.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(date, "MMM d, yyyy · HH:mm:ss")}
              </span>
            </div>
            <SheetTitle className="text-base font-bold text-foreground leading-snug">
              {explanation}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {formatDistanceToNow(date, { addSuffix: true })} by{" "}
              {log.actor?.name || "System"}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* 1. Target Resource Card */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Target Resource
            </span>
            {itemInfo.cmsUrl && (
              <Link href={itemInfo.cmsUrl} target="_blank">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] font-semibold gap-1 text-primary hover:text-primary cursor-pointer p-1"
                >
                  <span>Open in Admin</span>
                  <ExternalLink className="size-3" />
                </Button>
              </Link>
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {itemInfo.name}
            </h4>
            {itemInfo.slug && (
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                /{itemInfo.slug.replace(/^\//, "")}
              </p>
            )}
          </div>
        </div>

        {/* 2. Before ➔ After Status Box (Only if status actually changed) */}
        {trans.from.toLowerCase() !== trans.to.toLowerCase() ? (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Status Transition
            </span>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/80">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Previous State
                </span>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  {trans.from}
                </span>
              </div>
              <ArrowRight className="size-4 text-primary shrink-0" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  New State
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {trans.to}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Modification Type
            </span>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/80">
              <span className="text-xs font-bold text-foreground">
                {trans.pillText || "Content & Field Update"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              >
                {meta.toStatus
                  ? meta.toStatus.charAt(0).toUpperCase() + meta.toStatus.slice(1)
                  : "Active"}
              </Badge>
            </div>
          </div>
        )}

        {/* 3. Team Member (Actor) Card */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Modified By
          </span>
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-border">
              {log.actor?.avatar && (
                <AvatarImage src={log.actor.avatar} alt={log.actor.name} />
              )}
              <AvatarFallback className="text-xs font-bold">
                {log.actor?.name ? log.actor.name.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-foreground">
                  {log.actor?.name || "System Actor"}
                </span>
                {log.actor?.role && (
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-semibold px-1 py-0 rounded-xs bg-muted text-muted-foreground border-border"
                  >
                    {log.actor.role}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {log.actor?.email || "Internal System Operation"}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Field Modifications Card (Diff Breakdown) */}
        {meta.diff && Object.keys(meta.diff).length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Field Modifications ({Object.keys(meta.diff).length})
              </span>
              {meta.contentChanged && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                >
                  Body Content Updated
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {Object.values(meta.diff).map((entry: any, idx: number) => {
                const fromStr = formatDiffValue(entry.from);
                const toStr = formatDiffValue(entry.to);
                const isImage =
                  (entry.field === "featuredImage" ||
                    entry.field === "ogImage" ||
                    entry.field === "profilePicture") &&
                  (entry.to || entry.from);

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-muted/40 border border-border/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {entry.label || entry.field}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {entry.field}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-background/60 border border-border/50">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">
                          Previous
                        </span>
                        {isImage &&
                        entry.from &&
                        typeof entry.from === "string" &&
                        entry.from.startsWith("http") ? (
                          <div className="space-y-1">
                            <img
                              src={entry.from}
                              alt="Previous"
                              className="h-10 w-auto rounded object-cover border border-border opacity-60"
                            />
                            <span className="text-muted-foreground line-through break-all text-[10px] font-mono block truncate">
                              {fromStr}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground line-through break-all text-[11px] block">
                            {fromStr}
                          </span>
                        )}
                      </div>

                      <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                          Updated
                        </span>
                        {isImage &&
                        entry.to &&
                        typeof entry.to === "string" &&
                        entry.to.startsWith("http") ? (
                          <div className="space-y-1">
                            <img
                              src={entry.to}
                              alt="New"
                              className="h-10 w-auto rounded object-cover border border-emerald-500/30"
                            />
                            <span className="text-foreground font-semibold break-all text-[10px] font-mono block truncate">
                              {toStr}
                            </span>
                          </div>
                        ) : (
                          <span className="text-foreground font-semibold break-all text-[11px] block">
                            {toStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Activity Specific Breakdown (Clean checklist, NOT raw JSON) */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Change Details
          </span>
          <div className="space-y-1.5 text-xs text-foreground">
            {meta.fromTitle && meta.toTitle && meta.fromTitle !== meta.toTitle && (
              <>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Previous Title:</span>
                  <span className="font-medium text-muted-foreground line-through">
                    {meta.fromTitle}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">New Title:</span>
                  <span className="font-bold text-foreground">{meta.toTitle}</span>
                </div>
              </>
            )}
            {meta.fromSlug && meta.toSlug && meta.fromSlug !== meta.toSlug && (
              <>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Previous Slug:</span>
                  <span className="font-mono text-[11px] text-muted-foreground line-through">
                    /{meta.fromSlug}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">New Slug:</span>
                  <span className="font-mono text-[11px] font-bold text-foreground">
                    /{meta.toSlug}
                  </span>
                </div>
              </>
            )}
            {meta.sourceUrl && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Source URL:</span>
                <span className="font-mono text-[11px] font-medium">{meta.sourceUrl}</span>
              </div>
            )}
            {meta.destinationUrl && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-mono text-[11px] font-medium">{meta.destinationUrl}</span>
              </div>
            )}
            {meta.statusCode && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">HTTP Status:</span>
                <span className="font-semibold">{meta.statusCode} Redirect</span>
              </div>
            )}
            {meta.subject && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Subject Line:</span>
                <span className="font-medium text-right">{meta.subject}</span>
              </div>
            )}
            {meta.totalRecipients !== undefined && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-semibold">{meta.totalRecipients} subscribers</span>
              </div>
            )}
            {meta.scheduledAt && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Scheduled Send:</span>
                <span>{format(new Date(meta.scheduledAt), "MMM d, yyyy HH:mm")}</span>
              </div>
            )}
            {meta.targetIds && Array.isArray(meta.targetIds) && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Batch Count:</span>
                <span className="font-semibold">{meta.targetIds.length} items modified</span>
              </div>
            )}
            {meta.restoredFromVersion && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Restored Revision:</span>
                <span className="font-semibold text-primary">Revision #{meta.restoredFromVersion}</span>
              </div>
            )}
            {meta.filename && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Export Filename:</span>
                <span className="font-mono text-[11px]">{meta.filename}</span>
              </div>
            )}
            {log.ipAddress && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">IP Address:</span>
                <span className="font-mono text-[11px]">{log.ipAddress}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Execution Status:</span>
              {log.status === "SUCCESS" ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Success
                </span>
              ) : log.status === "WARNING" ? (
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  Warning
                </span>
              ) : (
                <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <XCircle className="size-3" />
                  Failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 6. System Integrity Stamp */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono truncate max-w-60">
            ID: {log.id}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyLogId(log.id)}
            className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
          >
            {copiedId ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Copy ID</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
