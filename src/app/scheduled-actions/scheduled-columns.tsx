"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Globe,
  MoreHorizontal,
  PenTool,
  ExternalLink,
  Undo2,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

export interface ScheduledItem {
  id: string;
  title: string;
  slug: string;
  featuredImage: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  categories: string[];
  tags: string[];
  scheduleState: "upcoming" | "pending" | "failed" | "success";
  hasStagedUpdate?: boolean;
  author?: {
    id: string;
    name: string | null;
    email: string;
    profilePicture: string | null;
  } | null;
}

export interface ScheduledColumnsProps {
  onPublishNow: (item: ScheduledItem) => void;
  onOpenReschedule: (item: ScheduledItem) => void;
  onCancelSchedule: (item: ScheduledItem) => void;
  actionLoadingId: string | null;
  siteUrl?: string;
}

export const getScheduledColumns = ({
  onPublishNow,
  onOpenReschedule,
  onCancelSchedule,
  actionLoadingId,
  siteUrl = "",
}: ScheduledColumnsProps): ColumnDef<ScheduledItem>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Post & Title" />,
    meta: {
      className: "w-[240px] md:w-[260px] max-w-[260px]",
    },
    sortingFn: (rowA, rowB, columnId) => {
      const valA = (rowA.getValue(columnId) as string || "").toLowerCase();
      const valB = (rowB.getValue(columnId) as string || "").toLowerCase();
      return valA.localeCompare(valB);
    },
    cell: ({ row }) => {
      const item = row.original;
      const cleanSlug = item.slug?.startsWith("/") ? item.slug.slice(1) : (item.slug || "");

      return (
        <div className="flex items-center gap-3 w-full max-w-[240px] md:max-w-[260px] min-w-0">
          {item.featuredImage ? (
            <img
              src={item.featuredImage}
              alt={item.title}
              className="w-10 h-10 rounded-sm object-cover shrink-0 bg-muted border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center shrink-0 border border-border text-[10px] text-muted-foreground uppercase font-bold">
              Img
            </div>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="font-bold text-foreground truncate block text-xs select-text">
                    {item.title}
                  </span>
                }
              />
              <TooltipContent side="top" className="text-xs max-w-sm font-medium">
                {item.title}
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 mt-0.5 min-w-0 w-full overflow-hidden">
              <span className="text-[11px] text-muted-foreground truncate font-mono min-w-0 flex-1">
                /blogs/{cleanSlug}
              </span>
              {item.categories?.length > 0 && (
                <span className="px-1.5 py-0.2 bg-secondary text-secondary-foreground text-[9px] font-semibold uppercase rounded-xs shrink-0">
                  {item.categories[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "scheduledAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Target Schedule" />,
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.original.scheduledAt || rowA.original.publishedAt || "";
      const dateB = rowB.original.scheduledAt || rowB.original.publishedAt || "";
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    },
    cell: ({ row }) => {
      const item = row.original;
      const scheduledDate = item.scheduledAt ? new Date(item.scheduledAt) : null;

      if (scheduledDate) {
        return (
          <div className="flex flex-col gap-0.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {isToday(scheduledDate)
                  ? "Today"
                  : isTomorrow(scheduledDate)
                  ? "Tomorrow"
                  : format(scheduledDate, "MMM d, yyyy")}
              </span>
              {item.hasStagedUpdate && (
                <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase rounded-xs border border-purple-500/20">
                  Staged Update
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{format(scheduledDate, "h:mm a")}</span>
            </div>
          </div>
        );
      }

      if (item.publishedAt) {
        return (
          <div className="flex flex-col gap-0.5">
            <div className="font-medium text-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{format(new Date(item.publishedAt), "MMM d, yyyy")}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(item.publishedAt), "h:mm a")}
            </span>
          </div>
        );
      }

      return <span className="text-muted-foreground italic text-xs">Not specified</span>;
    },
  },
  {
    accessorKey: "scheduleState",
    header: "Timing & Status",
    cell: ({ row }) => {
      const item = row.original;
      const scheduledDate = item.scheduledAt ? new Date(item.scheduledAt) : null;

      return (
        <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-start sm:gap-1">
          {item.scheduleState === "success" && (
            <>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Success</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {item.publishedAt
                  ? `Published ${format(new Date(item.publishedAt), "MMM d, yyyy 'at' h:mm a")}`
                  : `Live since ${format(new Date(item.updatedAt), "MMM d, yyyy")}`}
              </span>
            </>
          )}

          {item.scheduleState === "failed" && (
            <>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                <span>Failed</span>
              </span>
              <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                {scheduledDate ? `Overdue by ${formatDistanceToNow(scheduledDate)}` : "Trigger missed"}
              </span>
            </>
          )}

          {item.scheduleState === "pending" && (
            <>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
                <span>Pending</span>
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                {scheduledDate ? `Due ${formatDistanceToNow(scheduledDate, { addSuffix: true })}` : "Due now"}
              </span>
            </>
          )}

          {item.scheduleState === "upcoming" && (
            <>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Upcoming</span>
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                {scheduledDate ? `In ${formatDistanceToNow(scheduledDate)}` : "Upcoming"}
              </span>
            </>
          )}
        </div>
      );
    },
  },
  {
    id: "author",
    header: "Author",
    cell: ({ row }) => {
      const item = row.original;
      const authorName = item.author?.name || "Admin";

      return (
        <div className="flex items-center gap-2">
          {item.author?.profilePicture ? (
            <img
              src={item.author.profilePicture}
              alt={authorName}
              className="w-6 h-6 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/20">
              {(authorName[0] || "A").toUpperCase()}
            </div>
          )}
          <div className="text-xs">
            <p className="font-medium text-foreground">{authorName}</p>
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const item = row.original;
      const cleanSlug = item.slug?.startsWith("/") ? item.slug.slice(1) : item.slug;
      const publicUrl = siteUrl ? `${siteUrl}/blogs/${cleanSlug}` : undefined;
      const isQueue =
        item.scheduleState === "upcoming" ||
        item.scheduleState === "pending" ||
        item.scheduleState === "failed";

      return (
        <div className="text-right flex items-center justify-end gap-1.5">
          {isQueue ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoadingId === item.id}
                onClick={() => onPublishNow(item)}
                className={`h-7 px-2.5 text-[11px] font-semibold gap-1 cursor-pointer hidden sm:inline-flex ${
                  item.scheduleState === "failed"
                    ? "border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    : "border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Publish Now</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenReschedule(item)}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer hidden sm:inline-flex"
              >
                Reschedule
              </Button>
            </>
          ) : (
            publicUrl && item.status === "published" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const separator = publicUrl.includes("?") ? "&" : "?";
                  window.open(`${publicUrl}${separator}nocache=${Date.now()}`, "_blank");
                }}
                className="h-7 px-2.5 text-[11px] font-semibold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer hidden sm:inline-flex"
              >
                <Globe className="w-3 h-3" />
                <span>View Live</span>
              </Button>
            )
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Post Actions</DropdownMenuLabel>
                <DropdownMenuItem className="cursor-pointer p-0">
                  <Link href={`/blogs/edit/${item.id}`} className="flex items-center w-full px-2 py-1.5">
                    <PenTool className="w-3.5 h-3.5 mr-2" />
                    <span>Edit in Builder</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`/blogs/preview/${item.id}`, `preview_${item.id}`)}
                  className="cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  <span>Live Preview</span>
                </DropdownMenuItem>
                {publicUrl && item.status === "published" && (
                  <DropdownMenuItem onClick={() => window.open(publicUrl, "_blank")} className="cursor-pointer">
                    <Globe className="w-3.5 h-3.5 mr-2" />
                    <span>View Live Post</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>

              {isQueue && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => onPublishNow(item)}
                      disabled={actionLoadingId === item.id}
                      className="cursor-pointer sm:hidden text-purple-600 font-semibold"
                    >
                      <Play className="w-3.5 h-3.5 mr-2 fill-current" />
                      <span>Publish Now</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onOpenReschedule(item)}
                      className="cursor-pointer sm:hidden"
                    >
                      <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <span>Reschedule</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onCancelSchedule(item)}
                      className="text-amber-600 focus:text-amber-600 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5 mr-2 text-amber-600" />
                      <span>Revert to Draft</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
