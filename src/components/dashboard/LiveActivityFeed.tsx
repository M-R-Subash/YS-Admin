"use client";

import React, { memo } from "react";
import { Radio } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveVisitorItem } from "./types";

interface LiveActivityFeedProps {
  liveVisitors: LiveVisitorItem[];
  isLoading: boolean;
  autoRefresh: boolean;
}

export const LiveActivityFeed = memo(function LiveActivityFeed({
  liveVisitors,
  isLoading,
  autoRefresh,
}: LiveActivityFeedProps) {
  return (
    <Card className="border border-border/70 shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold font-heading">
              Recent Activity
            </CardTitle>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className={`size-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-emerald-500"}`} />
              <span>{autoRefresh ? "POLLING 30S" : "LIVE FEED (SNAPSHOT)"}</span>
            </div>
          </div>
          <CardDescription className="text-xs">
            Active readers with visits in the last 15 minutes
          </CardDescription>
        </div>

        <Radio className="size-4 text-emerald-500" />
      </CardHeader>

      <CardContent className="p-4 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : liveVisitors.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Radio className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-medium">No sessions active in the last 15 minutes</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              Visitor telemetry will stream here as readers browse your site.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {liveVisitors.map((session) => (
              <div
                key={session.id}
                className="p-2.5 rounded-lg border border-border/50 bg-muted/15 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`size-2 rounded-full shrink-0 ${
                      session.isEngaged ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-blue-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                        {session.hashMask}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 h-3.5 font-medium ${
                          session.isEngaged
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "text-muted-foreground"
                        }`}
                      >
                        {session.isEngaged ? "⚡ Engaged" : "Browsing"}
                      </Badge>
                    </div>
                    <p className="text-foreground font-medium truncate text-xs mt-0.5" title={session.title}>
                      {session.title}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-[10px] text-muted-foreground block">
                    {session.timeAgo}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {session.pagesVisited} {session.pagesVisited === 1 ? "page" : "pages"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
