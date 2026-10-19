"use client";

import React, { useState, useMemo, useRef, useCallback, memo } from "react";
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
import { AnimatedCounter } from "./AnimatedCounter";

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

interface ChartConfig {
  currentKey: keyof TimeSeriesPoint;
  prevKey: keyof TimeSeriesPoint;
  name: string;
  color: string;
  gradientId: string;
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
  const [swipedIndex, setSwipedIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const scrollLeft = el.scrollLeft;
    const firstChild = el.firstElementChild as HTMLElement;
    const cardWidth = firstChild ? firstChild.offsetWidth : (el.scrollWidth / 4);
    if (cardWidth > 0) {
      const newIndex = Math.min(3, Math.max(0, Math.round(scrollLeft / cardWidth)));
      setSwipedIndex(newIndex);
    }
  }, []);

  const currentChartProps = useMemo<ChartConfig>(() => {
    switch (activeKpiTab) {
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
      case "visitors":
      default:
        return {
          currentKey: "uniqueVisitors",
          prevKey: "prevUniqueVisitors",
          name: "Unique Visitors",
          color: "#10b981",
          gradientId: "fillVisitors",
        };
    }
  }, [activeKpiTab]);

  const maxVal = useMemo(() => {
    let max = 0;
    for (const pt of timeSeries) {
      const cur = Number(pt[currentChartProps.currentKey]) || 0;
      if (cur > max) max = cur;
      if (compareMode && currentChartProps.prevKey) {
        const prev = Number(pt[currentChartProps.prevKey]) || 0;
        if (prev > max) max = prev;
      }
    }
    return max;
  }, [timeSeries, currentChartProps, compareMode]);

  const { yDomain, yTicks } = useMemo(() => {
    if (!maxVal || maxVal <= 0) {
      return { yDomain: [0, 4] as [number, number], yTicks: [0, 1, 2, 3, 4] };
    }

    // Calculate an ideal step size targeting ~4 intervals
    const rawStep = (maxVal * 1.15) / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    let stepMultiplier = 1;
    if (normalized <= 1.25) stepMultiplier = 1;
    else if (normalized <= 1.85) stepMultiplier = 1.5;
    else if (normalized <= 2.85) stepMultiplier = 2.5;
    else if (normalized <= 6) stepMultiplier = 5;
    else stepMultiplier = 10;

    const step = Math.max(1, Math.round(stepMultiplier * magnitude));

    // Ceiling must be a multiple of step and leave comfortable upper spacing above maxVal
    let ceiling = Math.ceil(maxVal / step) * step;
    if (ceiling - maxVal < step * 0.15) {
      ceiling += step;
    }

    const ticks: number[] = [];
    for (let val = 0; val <= ceiling; val += step) {
      ticks.push(val);
    }

    return {
      yDomain: [0, ceiling] as [number, number],
      yTicks: ticks,
    };
  }, [maxVal]);

  return (
    <Card className="border border-border/70 shadow-xs overflow-hidden pt-0">
      {/* TOP 4 INTERACTIVE KPI TABS - SWIPEABLE SNAP CAROUSEL ON MOBILE, 4-COL GRID ON LG */}
      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        role="tablist"
        className="flex lg:grid lg:grid-cols-4 overflow-x-auto lg:overflow-visible snap-x snap-mandatory no-scrollbar border-b border-border/60 divide-x divide-border/60 bg-muted/30"
      >
        {/* KPI 1: Unique Visits */}
        <div
          role="tab"
          aria-selected={activeKpiTab === "visitors"}
          tabIndex={0}
          onClick={() => {
            setActiveKpiTab("visitors");
            setSwipedIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("visitors");
              setSwipedIndex(0);
            }
          }}
          className={`min-w-[72vw] sm:min-w-[280px] lg:min-w-0 snap-start flex-1 shrink-0 lg:shrink p-4 sm:p-5 text-left transition-all cursor-pointer group select-none relative focus-visible:outline-none ${
            activeKpiTab === "visitors"
              ? "bg-background shadow-xs ring-1 ring-emerald-500/20 lg:ring-0"
              : "bg-muted/20 opacity-75 hover:opacity-100 hover:bg-muted/40"
          }`}
        >
          {activeKpiTab === "visitors" && (
            <span className="absolute -bottom-px inset-x-0 h-0.75 bg-emerald-500 z-20" />
          )}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="inline-flex items-center gap-1">
              <span
                className={`transition-colors ${
                  activeKpiTab === "visitors"
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground group-hover:text-foreground"
                }`}
              >
                Unique Visits
              </span>
              <Tooltip>
                <TooltipTrigger
                  className="cursor-help inline-flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="size-3 text-muted-foreground/60 hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Number of individual people who visited your site during this period.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div
              className={`p-1 rounded-md transition-colors ${
                activeKpiTab === "visitors"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-transparent text-emerald-500/70 group-hover:text-emerald-500"
              }`}
            >
              <Users className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <AnimatedCounter
                      value={summary?.uniqueVisitors ?? 0}
                      formatter={formatNumber}
                    />
                  )}
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
                Individual visitors in {range.toUpperCase()}
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
          onClick={() => {
            setActiveKpiTab("views");
            setSwipedIndex(1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("views");
              setSwipedIndex(1);
            }
          }}
          className={`min-w-[72vw] sm:min-w-[280px] lg:min-w-0 snap-start flex-1 shrink-0 lg:shrink p-4 sm:p-5 text-left transition-all cursor-pointer group select-none relative focus-visible:outline-none ${
            activeKpiTab === "views"
              ? "bg-background shadow-xs ring-1 ring-blue-500/20 lg:ring-0"
              : "bg-muted/20 opacity-75 hover:opacity-100 hover:bg-muted/40"
          }`}
        >
          {activeKpiTab === "views" && (
            <span className="absolute -bottom-px inset-x-0 h-0.75 bg-blue-500 z-20" />
          )}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="inline-flex items-center gap-1">
              <span
                className={`transition-colors ${
                  activeKpiTab === "views"
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground group-hover:text-foreground"
                }`}
              >
                Total Pageviews
              </span>
              <Tooltip>
                <TooltipTrigger
                  className="cursor-help inline-flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="size-3 text-muted-foreground/60 hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Every time an article or page was viewed by a reader.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div
              className={`p-1 rounded-md transition-colors ${
                activeKpiTab === "views"
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "bg-transparent text-blue-500/70 group-hover:text-blue-500"
              }`}
            >
              <Eye className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <AnimatedCounter
                      value={summary?.totalViews ?? 0}
                      formatter={formatNumber}
                    />
                  )}
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
                Total articles &amp; pages read
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
          onClick={() => {
            setActiveKpiTab("engagement");
            setSwipedIndex(2);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("engagement");
              setSwipedIndex(2);
            }
          }}
          className={`min-w-[72vw] sm:min-w-[280px] lg:min-w-0 snap-start flex-1 shrink-0 lg:shrink p-4 sm:p-5 text-left transition-all cursor-pointer group select-none relative focus-visible:outline-none ${
            activeKpiTab === "engagement"
              ? "bg-background shadow-xs ring-1 ring-purple-500/20 lg:ring-0"
              : "bg-muted/20 opacity-75 hover:opacity-100 hover:bg-muted/40"
          }`}
        >
          {activeKpiTab === "engagement" && (
            <span className="absolute -bottom-px inset-x-0 h-0.75 bg-purple-500 z-20" />
          )}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="inline-flex items-center gap-1">
              <span
                className={`transition-colors ${
                  activeKpiTab === "engagement"
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground group-hover:text-foreground"
                }`}
              >
                Engagement Rate
              </span>
              <Tooltip>
                <TooltipTrigger
                  className="cursor-help inline-flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="size-3 text-muted-foreground/60 hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Percentage of readers who spent &gt;10s or scrolled through an article.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div
              className={`p-1 rounded-md transition-colors ${
                activeKpiTab === "engagement"
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                  : "bg-transparent text-purple-500/70 group-hover:text-purple-500"
              }`}
            >
              <Activity className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <AnimatedCounter
                      value={summary?.engagementRate ?? 0}
                      formatter={(v) => `${Math.round(v)}%`}
                    />
                  )}
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
                Visitors who actively read content
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
          onClick={() => {
            setActiveKpiTab("subscribers");
            setSwipedIndex(3);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveKpiTab("subscribers");
              setSwipedIndex(3);
            }
          }}
          className={`min-w-[72vw] sm:min-w-[280px] lg:min-w-0 snap-start flex-1 shrink-0 lg:shrink p-4 sm:p-5 text-left transition-all cursor-pointer group select-none relative focus-visible:outline-none ${
            activeKpiTab === "subscribers"
              ? "bg-background shadow-xs ring-1 ring-violet-500/20 lg:ring-0"
              : "bg-muted/20 opacity-75 hover:opacity-100 hover:bg-muted/40"
          }`}
        >
          {activeKpiTab === "subscribers" && (
            <span className="absolute -bottom-px inset-x-0 h-0.75 bg-violet-500 z-20" />
          )}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="inline-flex items-center gap-1">
              <span
                className={`transition-colors ${
                  activeKpiTab === "subscribers"
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground group-hover:text-foreground"
                }`}
              >
                Newsletter Subscribers
              </span>
              <Tooltip>
                <TooltipTrigger
                  className="cursor-help inline-flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="size-3 text-muted-foreground/60 hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Total active readers subscribed to your email updates.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div
              className={`p-1 rounded-md transition-colors ${
                activeKpiTab === "subscribers"
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                  : "bg-transparent text-violet-500/70 group-hover:text-violet-500"
              }`}
            >
              <Mail className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <AnimatedCounter
                      value={summary?.subscribersCount ?? 0}
                      formatter={formatNumber}
                    />
                  )}
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
                        {summary.subscribersTrend >= 0 ? `+${summary.subscribersTrend}%` : `${Math.abs(summary.subscribersTrend)}%`}
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                +{summary?.currentPeriodSubsCount ?? 0} new signups in {range.toUpperCase()}
              </span>
            </div>

            {sparklines?.subscribers && (
              <MiniSparkline data={sparklines.subscribers} strokeColor="#a855f7" fillColor="#a855f7" />
            )}
          </div>
        </div>
      </div>

      {/* MOBILE TOUCH CAROUSEL INDICATOR (TRACKS SWIPED POSITION) */}
      <div className="flex lg:hidden items-center justify-center gap-1.5 py-1.5 bg-muted/20 border-b border-border/40">
        {(["visitors", "views", "engagement", "subscribers"] as const).map((tab, idx) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setSwipedIndex(idx);
              setActiveKpiTab(tab);
              if (carouselRef.current) {
                const targetCard = carouselRef.current.children[idx] as HTMLElement;
                if (targetCard) {
                  targetCard.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
                }
              }
            }}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              swipedIndex === idx
                ? "w-5 bg-foreground"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to ${tab}`}
          />
        ))}
      </div>

      {/* DUAL-PERIOD COMPARISON AREA CHART */}
      <CardContent className="px-2 sm:px-6 py-0 focus:outline-none focus:ring-0">
        {!mounted || isLoading ? (
          <div className="h-60 sm:h-80 lg:h-87.5 w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : timeSeries.length === 0 ? (
          <div className="h-60 sm:h-80 lg:h-87.5 w-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Sparkles className="size-8 mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium">No traffic recorded yet for this period</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Visitor data from main.ys will populate this chart as readers browse.
            </p>
          </div>
        ) : (
          <div className="h-60 sm:h-80 lg:h-87.5 w-full select-none outline-none focus:outline-none focus:ring-0 [&_*]:focus:outline-none [&_*]:outline-none">
            <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
              <AreaChart
                data={timeSeries}
                margin={{ top: 12, right: 10, left: -22, bottom: 0 }}
                style={{ outline: "none" }}
                className="outline-none focus:outline-none"
              >
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
                  interval={range === "7d" ? 0 : "preserveStartEnd"}
                  minTickGap={range === "7d" ? 4 : 12}
                  className="text-[10px] sm:text-[11px] fill-muted-foreground font-mono"
                />
                <YAxis
                  width={30}
                  allowDecimals={false}
                  domain={yDomain}
                  ticks={yTicks}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  className="text-[11px] fill-muted-foreground font-mono"
                  tickFormatter={(val) => {
                    if (val >= 1000) {
                      const k = val / 1000;
                      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
                    }
                    return Math.round(val).toString();
                  }}
                />
                <RechartsTooltip
                  animationDuration={150}
                  animationEasing="ease-out"
                  cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.5 }}
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
                    activeDot={false}
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
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: currentChartProps.color,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                    className: "transition-all duration-200 ease-out",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
