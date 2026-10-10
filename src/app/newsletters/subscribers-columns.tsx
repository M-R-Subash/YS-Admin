"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import {
  UserCheck,
  UserX,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Globe,
  User,
  FileSpreadsheet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface Subscriber {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source: string | null;
  resubscribeCount?: number;
  resubscribedAt?: string | null;
  createdAt: string;
}

function getInitials(email: string): string {
  const namePart = email.split("@")[0] || "";
  const clean = namePart.replace(/[^a-zA-Z0-9]/g, "");
  if (!clean) return "SU";
  if (clean.length === 1) return clean.toUpperCase();
  return (clean[0] + clean[1]).toUpperCase();
}

const AVATAR_PALETTE = [
  "bg-blue-500/15 text-blue-500 border-blue-500/25",
  "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
  "bg-purple-500/15 text-purple-400 border-purple-500/25",
  "bg-amber-500/15 text-amber-500 border-amber-500/25",
  "bg-rose-500/15 text-rose-500 border-rose-500/25",
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
];

function getAvatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

interface SubscribersColumnsOptions {
  onToggleStatus: (sub: Subscriber) => void;
  onDelete: (id: string) => void;
  copiedEmail: string | null;
  onCopyEmail: (email: string) => void;
}

export function getSubscribersColumns({
  onToggleStatus,
  onDelete,
  copiedEmail,
  onCopyEmail,
}: SubscribersColumnsOptions): ColumnDef<Subscriber>[] {
  return [
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subscriber" />
      ),
      cell: ({ row }) => {
        const sub = row.original;
        const avatarColor = getAvatarColor(sub.email);
        const initials = getInitials(sub.email);
        const isCopied = copiedEmail === sub.email;

        return (
          <div className="flex items-center gap-3 group">
            <div
              className={cn(
                "size-8 rounded-full flex items-center justify-center font-bold text-[11px] border shrink-0 select-none shadow-2xs",
                avatarColor
              )}
            >
              {initials}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-foreground text-xs truncate max-w-[240px] sm:max-w-none">
                {sub.email}
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => onCopyEmail(sub.email)}
                      className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  }
                />
                <TooltipContent side="top">
                  {isCopied ? "Copied!" : "Copy email"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const sub = row.original;

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {sub.status === "active" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                Opted Out
              </span>
            )}

            {sub.resubscribeCount && sub.resubscribeCount > 0 ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/25 cursor-help">
                      <RotateCcw className="w-2.5 h-2.5" />
                      Returned ({sub.resubscribeCount}x)
                    </span>
                  }
                />
                <TooltipContent side="top" className="text-xs">
                  {sub.resubscribedAt
                    ? `Returned reader: re-opted in ${sub.resubscribeCount} time(s). Most recent: ${format(
                        new Date(sub.resubscribedAt),
                        "MMM d, yyyy"
                      )}`
                    : `Returned reader: re-opted in ${sub.resubscribeCount} time(s)`}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "source",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Attribution" />
      ),
      cell: ({ row }) => {
        const source = row.original.source;

        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            {source?.includes("csv") ? (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : source?.includes("manual") ? (
              <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <span className="capitalize">
              {source ? source.replace("admin-", "") : "Website"}
            </span>
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-default text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                  {formatDistanceToNow(new Date(createdAt), {
                    addSuffix: true,
                  })}
                </span>
              }
            />
            <TooltipContent side="top">
              {format(new Date(createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const sub = row.original;

        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(sub)}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-sm"
                  >
                    {sub.status === "active" ? (
                      <span className="flex items-center gap-1 text-rose-400">
                        <UserX className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Opt-out</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Activate</span>
                      </span>
                    )}
                  </Button>
                }
              />
              <TooltipContent side="top">
                {sub.status === "active"
                  ? "Mark as Unsubscribed"
                  : "Re-activate subscriber"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(sub.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer rounded-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                }
              />
              <TooltipContent side="top">Delete permanently</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ];
}
