"use client";

import React, { useState, useMemo, memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Eye,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Mail,
  Info,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SummaryData, SparklinesData, TimeSeriesPoint } from "./types";
import { formatNumber } from "./utils";

// Lightweight micro-sparkline SVG generator for KPI cards
function MiniSparkline({
  data,
  strokeColor,
  fillColor,
}: {
  data: number[];
  strokeColor: string;
  fillColor: string;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M ${points[0]} L ${points.join(" L ")} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id={`grad-${strokeColor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.4} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${strokeColor.replace("#", "")})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Custom Tooltip with Shopify-style Period-over-Period Delta & Honest Zero-Handling
function CustomChartTooltip({
  active,
  payload,
  label,
  compareMode,
  activeKpiTab,
  range,
}: any) {
  if (!active || !payload || !payload.length) return null;

  const currentItem = payload.find((p: any) => !p.dataKey.startsWith("prev"));
  const prevItem = payload.find((p: any) => p.dataKey.startsWith("prev"));

  const currentVal = currentItem?.value ?? 0;
  const prevVal = prevItem?.value ?? 0;

  let deltaText = "";
  let deltaBadgeClass = "";
  let isPositive = true;

  if (prevVal === 0 && currentVal > 0) {
    deltaText = "New";
    deltaBadgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    isPositive = true;
  } else if (prevVal === 0 && currentVal === 0) {
    deltaText = "0%";
    deltaBadgeClass = "bg-muted text-muted-foreground border-border/40";
    isPositive = true;
  } else {
    const delta = Math.round(((currentVal - prevVal) / prevVal) * 100);
    isPositive = delta >= 0;
    deltaText = delta >= 0 ? `+${delta}%` : `${delta}%`;
    deltaBadgeClass =
      delta >= 0
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  }

  const kpiLabels: Record<string, string> = {
    visitors: "Unique Visitors",
    views: "Total Pageviews",
    engagement: "Engaged Visits",
    subscribers: "New Signups",
  };

  const kpiColors: Record<string, string> = {
    visitors: "#10b981",
    views: "#3b82f6",
    engagement: "#8b5cf6",
    subscribers: "#a855f7",
  };

  const activeColor = kpiColors[activeKpiTab] || "#3b82f6";
  const labelTitle = kpiLabels[activeKpiTab] || "Views";

  return (
    <div className="rounded-xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-52.5 animate-in fade-in-50 zoom-in-95">
      <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-2">
        <span className="font-semibold text-foreground">{label}</span>
        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4">
          {range}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 py-1">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <span className="size-2 rounded-full" style={{ backgroundColor: activeColor }} />
          Current {labelTitle}
        </span>
        <span className="font-mono font-bold text-foreground text-sm">{formatNumber(currentVal)}</span>
      </div>

      {compareMode && (
        <div className="mt-1.5 pt-1.5 border-t border-dashed border-border/60 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground/80">
              <span className="size-2 rounded-full border border-dashed border-muted-foreground" />
              Previous Period
            </span>
            <span className="font-mono text-muted-foreground">{formatNumber(prevVal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <span className="text-[11px] text-muted-foreground">Period Delta</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 ${deltaBadgeClass}`}
            >
              {isPositive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {deltaText}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

interface TrafficKpiHeroProps {
  summary?: SummaryData;
  sparklines?: SparklinesData;
  timeSeries: TimeSeriesPoint[];
  isLoading: boolean;
  mounted: boolean;
  range: "24h" | "7d" | "30d" | "90d";
  compareMode: boolean;
}

export const TrafficKpiHero = memo(function TrafficKpiHero({
  summary,
  sparklines,
  timeSeries,
  isLoading,
  mounted,
  range,
  compareMode,
}: TrafficKpiHeroProps) {
  const [activeKpiTab, setActiveKpiTab] = useState<"visitors" | "views" | "engagement" | "subscribers">("visitors");

  const currentChartProps = useMemo(() => {
    switch (activeKpiTab) {
      case "visitors":
        return {
          currentKey: "uniqueVisitors",
          prevKey: "prevUniqueVisitors",
          name: "Unique Visitors",
          color: "#10b981",
          gradientId: "fillVisitors",
        };
      case "views":
        return {
          currentKey: "totalViews",
          prevKey: "prevTotalViews",
          name: "Total Views",
          color: "#3b82f6",
          gradientId: "fillViews",
        };
      case "engagement":
        return {
          currentKey: "engagedVisits",
          prevKey: "prevEngagedVisits",
          name: "Engaged Visits",
          color: "#8b5cf6",
          gradientId: "fillEngagement",
        };
      case "subscribers":
        return {
          currentKey: "subscribers",
          prevKey: "prevSubscribers",
          name: "New Subscribers",
          color: "#a855f7",
          gradientId: "fillSubscribers",
        };
    }
  }, [activeKpiTab]);

  return (
    <Card className="border border-border/70 shadow-xs overflow-hidden">
      {/* TOP 4 INTERACTIVE KPI TABS WITH ACCESSIBLE ROLES */}
      <div
        role="tablist"
        className="grid grid-cols-2 lg:grid-cols-4 border-b border-border/60 divide-x divide-y lg:divide-y-0 divide-border/60 bg-muted/20"
      >
        {/* KPI 1: Unique Visits */}
        <div
          role="tab"
          aria-selected={activeKpiTab === "visitors"}
          tabIndex={0}
          onClick={() => setActiveKpiTab("visitors")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("visitors");
            }
          }}
          className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none ${
            activeKpiTab === "visitors" ? "bg-background shadow-xs" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <div className="inline-flex items-center gap-1">
              <span className="font-medium group-hover:text-foreground">Unique Visits</span>
              <Tooltip>
                <TooltipTrigger
                  className="cursor-help inline-flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="size-3 text-muted-foreground/60 hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Sum of daily unique visitor sessions. Exact distinct visitors for 24h.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Users className="size-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(summary?.uniqueVisitors ?? 0)}
                </span>
                {!isLoading && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 rounded-sm ${
                      summary?.visitorsTrend === null || (summary?.visitorsTrend ?? 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {summary?.visitorsTrend === null ? (
                      "New"
                    ) : (
                      <>
                        {(summary?.visitorsTrend ?? 0) >= 0 ? (
                          <TrendingUp className="size-2.5" />
                        ) : (
                          <TrendingDown className="size-2.5" />
                        )}
                        {Math.abs(summary?.visitorsTrend ?? 0)}%
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                Daily uniques in {range.toUpperCase()} period
              </span>
            </div>

            {sparklines?.visitors && (
              <MiniSparkline data={sparklines.visitors} strokeColor="#10b981" fillColor="#10b981" />
            )}
          </div>
        </div>

        {/* KPI 2: Total Pageviews */}
        <div
          role="tab"
          aria-selected={activeKpiTab === "views"}
          tabIndex={0}
          onClick={() => setActiveKpiTab("views")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("views");
            }
          }}
          className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none ${
            activeKpiTab === "views" ? "bg-background shadow-xs" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-medium group-hover:text-foreground">Total Pageviews</span>
            <Eye className="size-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(summary?.totalViews ?? 0)}
                </span>
                {!isLoading && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 rounded-sm ${
                      summary?.viewsTrend === null || (summary?.viewsTrend ?? 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {summary?.viewsTrend === null ? (
                      "New"
                    ) : (
                      <>
                        {(summary?.viewsTrend ?? 0) >= 0 ? (
                          <TrendingUp className="size-2.5" />
                        ) : (
                          <TrendingDown className="size-2.5" />
                        )}
                        {Math.abs(summary?.viewsTrend ?? 0)}%
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                Total reading impressions
              </span>
            </div>

            {sparklines?.views && (
              <MiniSparkline data={sparklines.views} strokeColor="#3b82f6" fillColor="#3b82f6" />
            )}
          </div>
        </div>

        {/* KPI 3: Engagement Rate */}
        <div
          role="tab"
          aria-selected={activeKpiTab === "engagement"}
          tabIndex={0}
          onClick={() => setActiveKpiTab("engagement")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("engagement");
            }
          }}
          className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none ${
            activeKpiTab === "engagement" ? "bg-background shadow-xs" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <div className="inline-flex items-center gap-1">
              <span className="font-medium group-hover:text-foreground">Engagement Rate</span>
              <Tooltip>
                <TooltipTrigger
                  className="cursor-help inline-flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="size-3 text-muted-foreground/60 hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Percentage of unique visits where reader spent &gt;10s or scrolled deep</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Activity className="size-3.5 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : `${summary?.engagementRate ?? 0}%`}
                </span>
                {!isLoading && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 rounded-sm ${
                      summary?.engagementRateTrend === null || (summary?.engagementRateTrend ?? 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {summary?.engagementRateTrend === null ? (
                      "New"
                    ) : (
                      <>
                        {(summary?.engagementRateTrend ?? 0) >= 0 ? (
                          <TrendingUp className="size-2.5" />
                        ) : (
                          <TrendingDown className="size-2.5" />
                        )}
                        {Math.abs(summary?.engagementRateTrend ?? 0)}%
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                High-interest reader visits
              </span>
            </div>

            {sparklines?.engagement && (
              <MiniSparkline data={sparklines.engagement} strokeColor="#8b5cf6" fillColor="#8b5cf6" />
            )}
          </div>
        </div>

        {/* KPI 4: Active Subscribers */}
        <div
          role="tab"
          aria-selected={activeKpiTab === "subscribers"}
          tabIndex={0}
          onClick={() => setActiveKpiTab("subscribers")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("subscribers");
            }
          }}
          className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none ${
            activeKpiTab === "subscribers" ? "bg-background shadow-xs" : ""
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-medium group-hover:text-foreground">Newsletter Audience</span>
            <Mail className="size-3.5 text-violet-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(summary?.subscribersCount ?? 0)}
                </span>
                {!isLoading && summary?.subscribersTrend !== undefined && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 rounded-sm ${
                      summary.subscribersTrend === null || summary.subscribersTrend >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {summary.subscribersTrend === null ? (
                      "New"
                    ) : (
                      <>
                        {summary.subscribersTrend >= 0 ? (
                          <TrendingUp className="size-2.5" />
                        ) : (
                          <TrendingDown className="size-2.5" />
                        )}
                        {summary.subscribersTrend >= 0 ? `+${summary.subscribersTrend}%` : `${summary.subscribersTrend}%`}
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                +{summary?.currentPeriodSubsCount ?? 0} signups in {range.toUpperCase()}
              </span>
            </div>

            {sparklines?.subscribers && (
              <MiniSparkline data={sparklines.subscribers} strokeColor="#a855f7" fillColor="#a855f7" />
            )}
          </div>
        </div>
      </div>

      {/* DUAL-PERIOD COMPARISON AREA CHART */}
      <CardContent className="p-4 sm:p-6">
        {!mounted || isLoading ? (
          <div className="h-80 sm:h-87.5 w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : timeSeries.length === 0 ? (
          <div className="h-80 sm:h-87.5 w-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Sparkles className="size-8 mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium">No traffic recorded yet for this period</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Visitor data from main.ys will populate this chart as readers browse.
            </p>
          </div>
        ) : (
          <div className="h-80 sm:h-87.5 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={currentChartProps.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentChartProps.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={currentChartProps.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  className="text-[11px] fill-muted-foreground font-mono"
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.max(dataMax, 4) : 4)]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-[11px] fill-muted-foreground font-mono"
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}K` : Math.round(val).toString())}
                />
                <RechartsTooltip
                  content={
                    <CustomChartTooltip
                      compareMode={compareMode}
                      activeKpiTab={activeKpiTab}
                      range={range}
                    />
                  }
                />

                {/* SHOPIFY-STYLE GHOST LINE (Previous Period Benchmark) */}
                {compareMode && (
                  <Area
                    type="monotone"
                    dataKey={currentChartProps.prevKey}
                    name={`Prior ${currentChartProps.name}`}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.75}
                    fillOpacity={0}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 1.5, fill: "#94a3b8" }}
                  />
                )}

                {/* CURRENT PERIOD SOLID VIBRANT CURVE */}
                <Area
                  type="monotone"
                  dataKey={currentChartProps.currentKey}
                  name={currentChartProps.name}
                  stroke={currentChartProps.color}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#${currentChartProps.gradientId})`}
                  dot={{ r: 3, fill: currentChartProps.color, strokeWidth: 1 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
