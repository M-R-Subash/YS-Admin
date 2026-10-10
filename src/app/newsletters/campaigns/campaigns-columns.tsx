"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Calendar,
  Clock,
  Send,
  MoreHorizontal,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface Campaign {
  id: string;
  subject: string;
  bodyHtml: string;
  type: "BLOG_UPDATE" | "CUSTOM_BLAST";
  status: "draft" | "scheduled" | "processing" | "completed" | "failed";
  scheduledAt?: string | null;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  errorMessage?: string | null;
  createdAt: string;
  completedAt: string | null;
  blog?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

interface CampaignsColumnsOptions {
  onSelectCampaign: (camp: Campaign) => void;
  onRetryCampaign: (id: string) => void;
  onSendNowCampaign?: (id: string) => void;
  onRescheduleCampaign?: (camp: Campaign) => void;
  onCancelScheduleCampaign?: (id: string) => void;
  retryingCampaignId: string | null;
  actionCampaignId?: string | null;
}

export function getCampaignsColumns({
  onSelectCampaign,
  onRetryCampaign,
  onSendNowCampaign,
  onRescheduleCampaign,
  onCancelScheduleCampaign,
  retryingCampaignId,
  actionCampaignId,
}: CampaignsColumnsOptions): ColumnDef<Campaign>[] {
  return [
    {
      accessorKey: "subject",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Campaign Subject" />
      ),
      cell: ({ row }) => {
        const camp = row.original;

        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-xs text-foreground">
              {camp.subject}
            </span>
            {camp.blog && (
              <a
                href={`/blogs/edit/${camp.blog.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-500 hover:underline flex items-center gap-1 text-[11px] font-medium"
              >
                View Post
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.type;

        return type === "BLOG_UPDATE" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/25">
            Blog Update
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
            Custom Blast
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status;

        if (status === "completed") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          );
        }

        if (status === "processing") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sending...
            </span>
          );
        }

        if (status === "scheduled") {
          const schedDate = row.original.scheduledAt ? new Date(row.original.scheduledAt) : null;
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25 cursor-default">
                    <Clock className="w-3.5 h-3.5" />
                    Scheduled
                  </span>
                }
              />
              <TooltipContent side="top">
                {schedDate
                  ? `Scheduled for ${format(schedDate, "MMMM d, yyyy 'at' h:mm a")}`
                  : "Scheduled for automated dispatch"}
              </TooltipContent>
            </Tooltip>
          );
        }

        if (status === "draft") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
              Draft
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      },
    },
    {
      accessorKey: "successCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Delivery Progress" />
      ),
      cell: ({ row }) => {
        const camp = row.original;

        if (camp.status === "scheduled") {
          return (
            <div className="text-[11px] text-muted-foreground font-medium italic">
              Awaiting release ({camp.totalRecipients} recipient{camp.totalRecipients !== 1 ? "s" : ""})
            </div>
          );
        }

        const successPct =
          camp.totalRecipients > 0
            ? Math.round((camp.successCount / camp.totalRecipients) * 100)
            : 0;

        return (
          <div className="space-y-1.5 min-w-[140px]">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {camp.successCount} / {camp.totalRecipients}
              </span>
              <span className="font-semibold">{successPct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 transition-all duration-500"
                style={{ width: `${successPct}%` }}
              />
            </div>
            {camp.failedCount > 0 && (
              <div className="text-[10px] text-rose-400 font-medium">
                {camp.failedCount} recipient failure{camp.failedCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const camp = row.original;
        const isScheduled = camp.status === "scheduled" && camp.scheduledAt;
        const targetDate = isScheduled ? new Date(camp.scheduledAt!) : new Date(camp.createdAt);

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-default text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                  {isScheduled ? "Sends " : ""}
                  {formatDistanceToNow(targetDate, {
                    addSuffix: true,
                  })}
                </span>
              }
            />
            <TooltipContent side="top">
              {format(targetDate, "MMMM d, yyyy 'at' h:mm a")}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const camp = row.original;

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectCampaign(camp)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer rounded-sm"
              title="View delivery breakdown and error details"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details</span>
            </Button>
            {camp.status === "scheduled" && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionCampaignId === camp.id}
                      className="h-8 px-2.5 text-xs gap-1 cursor-pointer rounded-sm border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                    >
                      {actionCampaignId === camp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5" />
                      )}
                      <span>Manage</span>
                      <MoreHorizontal className="w-3 h-3 ml-0.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => onSendNowCampaign?.(camp.id)}
                    className="text-xs cursor-pointer gap-2"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                    <span>Send Now</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRescheduleCampaign?.(camp)}
                    className="text-xs cursor-pointer gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5 text-violet-500" />
                    <span>Reschedule</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCancelScheduleCampaign?.(camp.id)}
                    className="text-xs cursor-pointer gap-2 text-rose-500 focus:text-rose-500"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Schedule</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {camp.failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetryCampaign(camp.id)}
                disabled={
                  retryingCampaignId === camp.id || camp.status === "processing"
                }
                className="h-8 px-2.5 text-xs text-amber-500 hover:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 cursor-pointer font-medium rounded-sm"
                title="Resend email only to failed recipients"
              >
                {retryingCampaignId === camp.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Retry ({camp.failedCount})</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
