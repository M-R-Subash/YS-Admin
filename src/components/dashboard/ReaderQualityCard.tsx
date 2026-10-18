"use client";

import React, { memo } from "react";
import { Layers, Clock, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SummaryData } from "./types";
import { formatNumber } from "./utils";

interface ReaderQualityCardProps {
  summary?: SummaryData;
}

export const ReaderQualityCard = memo(function ReaderQualityCard({
  summary,
}: ReaderQualityCardProps) {
  return (
    <Card className="border border-border/70 shadow-xs flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base font-semibold font-heading">
          Reader Quality Metrics
        </CardTitle>
        <CardDescription className="text-xs">
          Deep session engagement and bounce telemetry
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
        {/* METRIC 1: PAGES PER VISIT */}
        <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Pages Per Visit</span>
            <Layers className="size-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-foreground">
              {summary?.pagesPerVisit ?? "1.0"}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-medium ${
                summary?.pagesPerVisitTrend === null || (summary?.pagesPerVisitTrend ?? 0) >= 0
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
              }`}
            >
              {summary?.pagesPerVisitTrend === null
                ? "New"
                : `${(summary?.pagesPerVisitTrend ?? 0) >= 0 ? "+" : ""}${summary?.pagesPerVisitTrend}%`}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Average page impressions explored per visitor session
          </span>
        </div>

        {/* METRIC 2: ENGAGED READER SESSIONS */}
        <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Engaged Reader Sessions</span>
            <Clock className="size-3.5 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-foreground">
              {formatNumber(summary?.engagedVisitsCount ?? 0)}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20 font-medium"
            >
              {summary?.engagementRate ?? 0}% Rate
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Visitors who read &gt;10s or scrolled deep into an article
          </span>
        </div>

        {/* METRIC 3: SINGLE-PAGE BOUNCE RATE */}
        <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Bounce Rate</span>
            <Activity className="size-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-foreground">
              {summary?.bounceRate ?? 0}%
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-medium ${
                summary?.bounceRateTrend === null || (summary?.bounceRateTrend ?? 0) <= 0
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}
            >
              {summary?.bounceRateTrend === null
                ? "Baseline"
                : (summary?.bounceRateTrend ?? 0) <= 0
                ? "Lower"
                : "Higher"}{" "}
              vs prior
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Non-engaged sessions: visitors who didn&apos;t scroll deep or stay &gt;10s
          </span>
        </div>
      </CardContent>
    </Card>
  );
});
