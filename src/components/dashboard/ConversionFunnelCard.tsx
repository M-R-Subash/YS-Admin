"use client";

import React, { memo } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FunnelData } from "./types";
import { formatNumber } from "./utils";
import { AnimatedCounter } from "./AnimatedCounter";

interface ConversionFunnelCardProps {
  funnel?: FunnelData;
  isLoading: boolean;
}

export const ConversionFunnelCard = memo(function ConversionFunnelCard({
  funnel,
  isLoading,
}: ConversionFunnelCardProps) {
  return (
    <Card className="lg:col-span-2 border border-border/70 shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold font-heading">
              Visitor Journey &amp; Conversions
            </CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              3 Stages
            </Badge>
          </div>
          <CardDescription className="text-xs">
            How visitors progress from landing on your site to becoming subscribers
          </CardDescription>
        </div>

        <div className="text-right">
          <span className="text-xs text-muted-foreground">Overall Conversion</span>
          <p className="text-base font-bold font-mono text-emerald-500">
            <AnimatedCounter
              value={funnel?.conversionRate ?? 0}
              formatter={(v) => `${v.toFixed(2)}%`}
            />
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-5 flex-1 flex flex-col justify-between gap-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* FUNNEL STAGE 1: ALL VISITORS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-bold">
                    1
                  </span>
                  <span className="font-semibold text-foreground">1. Landed on Site</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-foreground text-sm">
                    <AnimatedCounter
                      value={funnel?.visitors ?? 0}
                      formatter={formatNumber}
                    />
                  </span>
                  <span className="text-muted-foreground text-[11px]">100%</span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: "100%" }} />
              </div>
            </div>

            {/* DROP-OFF CONNECTOR 1 -> 2 */}
            <div className="flex items-center justify-between px-6 py-0.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowRight className="size-3 text-muted-foreground/60" />
                <span>Readers who stayed to read</span>
              </span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                {funnel?.retentionRate ?? 0}% Retained ({funnel?.dropOffVisitorsToEngaged ?? 0}% Left early)
              </Badge>
            </div>

            {/* FUNNEL STAGE 2: ENGAGED READERS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 text-[11px] font-bold">
                    2
                  </span>
                  <span className="font-semibold text-foreground">2. Actively Read Content</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-foreground text-sm">
                    <AnimatedCounter
                      value={funnel?.engaged ?? 0}
                      formatter={formatNumber}
                    />
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {funnel?.retentionRate ?? 0}%
                  </span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all duration-700"
                  style={{ width: `${Math.max(4, funnel?.retentionRate ?? 0)}%` }}
                />
              </div>
            </div>

            {/* DROP-OFF CONNECTOR 2 -> 3 */}
            <div className="flex items-center justify-between px-6 py-0.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowRight className="size-3 text-muted-foreground/60" />
                <span>Readers who subscribed or contacted</span>
              </span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 text-emerald-600 dark:text-emerald-400">
                {funnel?.conversionRate ?? 0}% Converted
              </Badge>
            </div>

            {/* FUNNEL STAGE 3: ACTION & CONVERSIONS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-bold">
                    3
                  </span>
                  <span className="font-semibold text-foreground">3. Took Action (Subscribers &amp; Leads)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-emerald-500 text-sm">
                    <AnimatedCounter
                      value={funnel?.conversions ?? 0}
                      formatter={formatNumber}
                    />
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {funnel?.conversionRate ?? 0}%
                  </span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${Math.max(3, Math.min(100, (funnel?.conversionRate ?? 0) * 8))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* FUNNEL RECAP STATS */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-center">
          <div className="p-2.5 rounded-lg bg-muted/20">
            <span className="text-[11px] text-muted-foreground block mb-0.5">New Subscribers in Period</span>
            <span className="text-base font-bold font-mono text-foreground">
              +{funnel?.subscribersGained ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/20">
            <span className="text-[11px] text-muted-foreground block mb-0.5">Contact Submissions</span>
            <span className="text-base font-bold font-mono text-foreground">
              +{funnel?.submissionsGained ?? 0}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
