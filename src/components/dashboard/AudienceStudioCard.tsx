"use client";

import React, { useState, memo } from "react";
import Link from "next/link";
import { Globe, Inbox, MessageSquare, PenToolIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CountryItem, RecentDraftBlog } from "./types";
import { formatNumber } from "./utils";

interface AudienceStudioCardProps {
  topCountries: CountryItem[];
  recentDraftBlogs: RecentDraftBlog[];
  unreadSubmissionsCount?: number;
  unapprovedCommentsCount?: number;
  isAdmin: boolean;
  isLoading: boolean;
}

export const AudienceStudioCard = memo(function AudienceStudioCard({
  topCountries,
  recentDraftBlogs,
  unreadSubmissionsCount = 0,
  unapprovedCommentsCount = 0,
  isAdmin,
  isLoading,
}: AudienceStudioCardProps) {
  const [rightPanelTab, setRightPanelTab] = useState<"countries" | "editorial">("countries");

  return (
    <Card className="border border-border/70 shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold font-heading">
            Audience &amp; Studio
          </CardTitle>
          <CardDescription className="text-xs">
            Geographic reach and fast editorial shortcuts
          </CardDescription>
        </div>

        <Tabs
          value={rightPanelTab}
          onValueChange={(val) => setRightPanelTab(val as "countries" | "editorial")}
          className="w-auto"
        >
          <TabsList className="h-7 p-0.5 bg-muted">
            <TabsTrigger value="countries" className="text-xs px-2.5 h-6">
              Countries
            </TabsTrigger>
            <TabsTrigger value="editorial" className="text-xs px-2.5 h-6">
              Studio
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-4 flex-1">
        {rightPanelTab === "countries" ? (
          isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : topCountries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Globe className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-medium">No geographic data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topCountries.map((c) => (
                <div
                  key={c.code}
                  className="group relative flex items-center justify-between overflow-hidden rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/30"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md transition-all duration-500"
                    style={{ width: `${c.relativeScale ?? c.percentShare}%` }}
                  />
                  <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-4 flex-1">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="font-semibold text-foreground font-mono">
                      {c.code}
                    </span>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {formatNumber(c.views)}
                    </span>
                    {c.totalShare !== undefined && (
                      <span className="text-[10px] text-muted-foreground">
                        ({c.totalShare}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* EDITORIAL STUDIO QUICK ACTIONS */
          <div className="space-y-4">
            {isAdmin && (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/submissions"
                  className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Inbox className="size-4 text-primary" />
                    <span className="text-xs font-medium">Inquiries</span>
                  </div>
                  {unreadSubmissionsCount > 0 ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {unreadSubmissionsCount} new
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">0 unread</span>
                  )}
                </Link>

                <Link
                  href="/comments"
                  className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-amber-500" />
                    <span className="text-xs font-medium">Comments</span>
                  </div>
                  {unapprovedCommentsCount > 0 ? (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
                      {unapprovedCommentsCount} pending
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">All clear</span>
                  )}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/blogs/new"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-9 justify-start gap-2 text-xs font-medium cursor-pointer"
                )}
              >
                <PenToolIcon className="size-3.5 text-primary" />
                <span>New Blog Post</span>
              </Link>
              <Link
                href="/webpages"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-9 justify-start gap-2 text-xs font-medium cursor-pointer"
                )}
              >
                <Globe className="size-3.5 text-emerald-500" />
                <span>Webpages</span>
              </Link>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Recent Drafts &amp; Scheduled
              </h4>
              {recentDraftBlogs.length === 0 ? (
                <p className="text-xs text-muted-foreground/70 italic py-2">
                  No drafts or scheduled blogs in queue.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentDraftBlogs.map((b) => (
                    <Link
                      key={b.id}
                      href={`/blogs/${b.id}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors text-xs border border-border/40"
                    >
                      <span className="font-medium text-foreground truncate pr-2">
                        {b.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-medium ${
                          b.status === "scheduled"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {b.status === "scheduled" ? "Scheduled" : "Draft"}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
