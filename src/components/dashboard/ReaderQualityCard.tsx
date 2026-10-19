"use client";

import React, { memo } from "react";
import { Layers, Clock, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SummaryData } from "./types";
import { formatNumber } from "./utils";
import { AnimatedCounter } from "./AnimatedCounter";

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
          Reading & Engagement
        </CardTitle>
        <CardDescription className="text-xs">
          How deeply visitors read and interact with your content
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
              <AnimatedCounter
                value={Number(summary?.pagesPerVisit ?? 1.0)}
                formatter={(v) => v.toFixed(1)}
              />
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
            Average number of pages read per visitor
          </span>
        </div>

        {/* METRIC 2: ENGAGED READERS */}
        <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Engaged Readers</span>
            <Clock className="size-3.5 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-foreground">
              <AnimatedCounter
                value={summary?.engagedVisitsCount ?? 0}
                formatter={(v) => formatNumber(Math.round(v))}
              />
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20 font-medium"
            >
              <AnimatedCounter
                value={summary?.engagementRate ?? 0}
                formatter={(v) => `${Math.round(v)}%`}
              />{" "}
              Rate
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Visitors who spent time reading or scrolled deep into an article
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
              <AnimatedCounter
                value={summary?.bounceRate ?? 0}
                formatter={(v) => `${Math.round(v)}%`}
              />
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
            Visitors who left quickly without reading further
          </span>
        </div>
      </CardContent>
    </Card>
  );
});
