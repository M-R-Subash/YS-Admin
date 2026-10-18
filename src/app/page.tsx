"use client";

import React, { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Eye,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Compass,
  Mail,
  Share2,
  RefreshCw,
  Info,
  PenToolIcon,
  MessageSquare,
  Inbox,
  Sparkles,
  Clock,
  Layers,
  Radio,
  Search,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { clientConfig } from "@/lib/config/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatNumber(num: number): string {
  if (!num && num !== 0) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

function getReferrerIcon(source: string) {
  const s = (source || "").toLowerCase();
  if (s.includes("google") || s.includes("bing") || s.includes("yahoo") || s.includes("search")) {
    return Globe;
  }
  if (s.includes("linkedin") || s.includes("twitter") || s.includes("x /") || s.includes("facebook") || s.includes("social")) {
    return Share2;
  }
  if (s.includes("newsletter") || s.includes("email") || s.includes("mail")) {
    return Mail;
  }
  return Compass;
}

// Lightweight micro-sparkline SVG generator for KPI cards
function MiniSparkline({ data, strokeColor, fillColor }: { data: number[]; strokeColor: string; fillColor: string }) {
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
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
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

  // Accurate delta computation (avoids misleading +0% or +100% when baseline is 0)
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
    deltaBadgeClass = delta >= 0
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
    <div className="rounded-xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[210px] animate-in fade-in-50 zoom-in-95">
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

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [range, setRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [compareMode, setCompareMode] = useState(true);
  const [activeKpiTab, setActiveKpiTab] = useState<"visitors" | "views" | "engagement" | "subscribers">("visitors");
  const [contentTab, setContentTab] = useState<"blogs" | "pages">("blogs");
  const [contentSearch, setContentSearch] = useState("");
  const [acquisitionTab, setAcquisitionTab] = useState<"referrers" | "campaigns">("referrers");
  const [rightPanelTab, setRightPanelTab] = useState<"countries" | "editorial">("countries");

  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    `/api/dashboard/stats?range=${range}`,
    {
      refreshInterval: autoRefresh ? 30000 : 0,
      dedupingInterval: 4000,
    }
  );

  const summary = data?.summary;
  const funnel = data?.funnel;
  const insights = data?.insights || [];
  const sparklines = data?.sparklines;
  const liveVisitors = data?.liveVisitors || [];
  const timeSeries = data?.timeSeries || [];
  const devices = useMemo(() => data?.devices || [], [data?.devices]);
  const topBlogs = data?.topContent?.blogs || [];
  const topPages = data?.topContent?.pages || [];
  const topReferrers = data?.acquisition?.referrers || [];
  const topCampaigns = data?.acquisition?.campaigns || [];
  const topCountries = data?.acquisition?.countries || [];
  const recentDraftBlogs = data?.editorial?.recentDraftBlogs || [];
  const activeNow = summary?.activeNow ?? 0;

  // Dominant device
  const dominantDevice = useMemo(() => {
    if (!devices || devices.length === 0) return { name: "Desktop", percentage: 0 };
    return [...devices].sort((a: any, b: any) => b.value - a.value)[0];
  }, [devices]);

  // Crash-safe search filter (guards against nullable titles/paths)
  const filteredContent = useMemo(() => {
    const list = contentTab === "blogs" ? topBlogs : topPages;
    if (!contentSearch.trim()) return list;
    const q = contentSearch.toLowerCase();
    return list.filter((item: any) => {
      const title = (item?.title || item?.path || "").toLowerCase();
      const path = (item?.path || "").toLowerCase();
      return title.includes(q) || path.includes(q);
    });
  }, [contentTab, topBlogs, topPages, contentSearch]);

  // Active chart configurations
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
    <div className="flex flex-col min-h-screen bg-background">
      <AdminTopBar
        breadcrumbs="Analytics Command Center"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isValidating}
              className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isValidating ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <main className="flex-1 flex flex-col gap-6 py-6 px-3.5 md:px-6 lg:px-8 w-full max-w-[1600px] mx-auto">
        {/* EXECUTIVE HEADER & CONTROL BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
                {mounted ? (
                  `${greeting}, ${session?.user?.name?.split(" ")[0] || "Admin"}`
                ) : (
                  <span className="opacity-0">Welcome back</span>
                )}
              </h1>
              {/* LIVE PULSE INDICATOR WITH HONEST STATUS */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${activeNow > 0 ? "animate-ping opacity-75" : "opacity-0"}`}></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span>
                  <strong className="font-semibold font-mono">{activeNow}</strong> Active Now
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audience acquisition, conversion funnels, and real-time reader telemetry.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* SHOPIFY-STYLE GHOST COMPARISON TOGGLE */}
            <Button
              variant={compareMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
              className={`h-8 text-xs gap-1.5 cursor-pointer ${
                compareMode
                  ? "border-primary/40 bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-3.5 border-b border-dashed border-current inline-block" />
              <span>Compare prior period</span>
            </Button>

            {/* DATE RANGE TABS */}
            <Tabs
              value={range}
              onValueChange={(val) => setRange(val as typeof range)}
              className="w-auto"
            >
              <TabsList className="h-8 p-1 bg-muted/80">
                <TabsTrigger value="24h" className="text-xs px-2.5 h-6">
                  24h
                </TabsTrigger>
                <TabsTrigger value="7d" className="text-xs px-2.5 h-6">
                  7d
                </TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2.5 h-6">
                  30d
                </TabsTrigger>
                <TabsTrigger value="90d" className="text-xs px-2.5 h-6">
                  90d
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* AUTO REFRESH TOGGLE (HONEST POLLING STATUS) */}
            <Button
              variant={autoRefresh ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-8 text-xs gap-1.5 cursor-pointer ${
                autoRefresh ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
              }`}
            >
              <span className={`size-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
              <span>{autoRefresh ? "Auto (30s)" : "Auto-refresh off"}</span>
            </Button>
          </div>
        </div>

        {/* VISIBLE API ERROR ALERT STATE (NEVER MASKS A CRASH AS 0 VISITORS) */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-400">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-rose-500" />
              <div>
                <p className="font-semibold text-foreground">Analytics telemetry service unavailable</p>
                <p className="text-muted-foreground mt-0.5">Could not fetch statistics for the {range.toUpperCase()} timeframe. Please check your network or try again.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isValidating}
              className="h-7 text-xs border-rose-500/30 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`size-3 mr-1.5 ${isValidating ? "animate-spin" : ""}`} />
              Retry Request
            </Button>
          </div>
        )}

        {/* AUTOMATED EXECUTIVE INTELLIGENCE BAR */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {insights.map((ins: any) => (
              <div
                key={ins.id}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="p-1.5 rounded-md bg-background border border-border/50 shrink-0">
                  {ins.category === "growth" && <TrendingUp className="size-3.5 text-emerald-500" />}
                  {ins.category === "content" && <Sparkles className="size-3.5 text-amber-500" />}
                  {ins.category === "channel" && <Globe className="size-3.5 text-blue-500" />}
                  {ins.category === "audience" && <Monitor className="size-3.5 text-purple-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      {ins.category}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-mono font-semibold">
                      {ins.highlight}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground truncate mt-0.5" title={ins.text}>
                    {ins.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROW 1: STRIPE & VERCEL-STYLE HERO CARD WITH EMBEDDED MICRO-SPARKLINES */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          {/* TOP 4 INTERACTIVE KPI TABS WITH ACCESSIBLE ROLES */}
          <div role="tablist" className="grid grid-cols-2 lg:grid-cols-4 border-b border-border/60 divide-x divide-y lg:divide-y-0 divide-border/60 bg-muted/20">
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
              className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeKpiTab === "visitors" ? "bg-background shadow-xs ring-1 ring-emerald-500/30" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <div className="inline-flex items-center gap-1">
                  <span className="font-medium group-hover:text-foreground">Unique Visits</span>
                  <TooltipProvider>
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
                  </TooltipProvider>
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
              className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeKpiTab === "views" ? "bg-background shadow-xs ring-1 ring-blue-500/30" : ""
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
              className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                activeKpiTab === "engagement" ? "bg-background shadow-xs ring-1 ring-purple-500/30" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <div className="inline-flex items-center gap-1">
                  <span className="font-medium group-hover:text-foreground">Engagement Rate</span>
                  <TooltipProvider>
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
                  </TooltipProvider>
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
              className={`p-4 sm:p-5 text-left transition-all cursor-pointer group hover:bg-muted/40 select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                activeKpiTab === "subscribers" ? "bg-background shadow-xs ring-1 ring-violet-500/30" : ""
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
                            {summary.subscribersTrend >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
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
              <div className="h-[320px] sm:h-[350px] w-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            ) : timeSeries.length === 0 ? (
              <div className="h-[320px] sm:h-[350px] w-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Sparkles className="size-8 mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">No traffic recorded yet for this period</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Visitor data from main.ys will populate this chart as readers browse.
                </p>
              </div>
            ) : (
              <div className="h-[320px] sm:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeSeries}
                    margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
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

        {/* ROW 2: SHOPIFY AUDIENCE CONVERSION PIPELINE & READING QUALITY MATRIX */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COL 1 & 2: CONVERSION FUNNEL (SHOPIFY-STYLE 3-STAGE FUNNEL) */}
          <Card className="lg:col-span-2 border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold font-heading">
                    Audience Conversion Pipeline
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    Session Population
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Full-funnel retention from first page landing to high-intent subscribers
                </CardDescription>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground">Overall Conversion</span>
                <p className="text-base font-bold font-mono text-emerald-500">
                  {funnel?.conversionRate ?? 0}%
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
                        <span className="font-semibold text-foreground">Total Unique Visits (Landing)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground text-sm">
                          {formatNumber(funnel?.visitors ?? 0)}
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
                      <span>Retention to Engaged Reader</span>
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                      {funnel?.retentionRate ?? 0}% Retained ({funnel?.dropOffVisitorsToEngaged ?? 0}% Drop-off)
                    </Badge>
                  </div>

                  {/* FUNNEL STAGE 2: ENGAGED READERS */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 text-[11px] font-bold">
                          2
                        </span>
                        <span className="font-semibold text-foreground">Engaged Reader Visits (&gt;10s / Scrolled)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground text-sm">
                          {formatNumber(funnel?.engaged ?? 0)}
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
                      <span>Reader to Subscriber / Lead</span>
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
                        <span className="font-semibold text-foreground">Conversions (Subscribers &amp; Inquiries)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-emerald-500 text-sm">
                          {formatNumber(funnel?.conversions ?? 0)}
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

          {/* COL 3: READING QUALITY & DEPTH */}
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
                    {summary?.pagesPerVisitTrend === null ? "New" : `${(summary?.pagesPerVisitTrend ?? 0) >= 0 ? "+" : ""}${summary?.pagesPerVisitTrend}%`}
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
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20 font-medium">
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
                    {summary?.bounceRateTrend === null ? "Baseline" : ((summary?.bounceRateTrend ?? 0) <= 0 ? "Lower" : "Higher")} vs prior
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Non-engaged sessions: visitors who didn&apos;t scroll deep or stay &gt;10s
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROW 3: VERCEL-STYLE LIVE ACTIVITY STREAM & TOP CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COL 1: REAL-TIME RECENT VISITOR SESSIONS */}
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
                  {liveVisitors.map((session: any) => (
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

          {/* COL 2 & 3: TOP PERFORMING CONTENT WITH SEARCH & BAR LIST */}
          <Card className="lg:col-span-2 border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Top Performing Content
                </CardTitle>
                <CardDescription className="text-xs">
                  Highest-trafficked articles and landing pages for this timeframe
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {/* SEARCH FILTER WITH CRASH-SAFE NULL CHECKS */}
                <div className="relative w-36 sm:w-44">
                  <Search className="size-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search content..."
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    className="h-8 pl-7 text-xs bg-muted/40"
                  />
                </div>

                {/* TABS FOR BLOGS VS PAGES */}
                <Tabs
                  value={contentTab}
                  onValueChange={(val) => setContentTab(val as typeof contentTab)}
                  className="w-auto"
                >
                  <TabsList className="h-8 p-0.5 bg-muted">
                    <TabsTrigger value="blogs" className="text-xs px-2.5 h-7">
                      Blogs ({topBlogs.length})
                    </TabsTrigger>
                    <TabsTrigger value="pages" className="text-xs px-2.5 h-7">
                      Pages ({topPages.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Globe className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-medium">No results found for &ldquo;{contentSearch}&rdquo;</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Try searching for another keyword or switch tabs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContent.map((item: any, index: number) => (
                    <div
                      key={item.path}
                      className="group relative flex items-center justify-between overflow-hidden rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/30"
                    >
                      {/* PROPORTIONAL BACKGROUND FILL BAR (RELATIVE TO TOP ITEM) */}
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/10 dark:bg-primary/15 rounded-md transition-all duration-500 ease-out"
                        style={{ width: `${item.relativeScale ?? item.percentShare}%` }}
                        title={`Relative index: ${item.relativeScale ?? item.percentShare}% | Share of total site views: ${item.totalShare ?? 0}%`}
                      />

                      {/* FOREGROUND TITLE & URL */}
                      <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-4 flex-1">
                        <span className="font-mono text-[11px] text-muted-foreground/60 w-5 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {item.path}
                          </p>
                        </div>
                      </div>

                      {/* FOREGROUND METRICS & LINK */}
                      <div className="relative z-10 flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs px-2 py-0.5 bg-background/80 border border-border/40 font-semibold"
                        >
                          {formatNumber(item.views)} views
                          {item.totalShare !== undefined && (
                            <span className="text-[10px] text-muted-foreground font-normal ml-1">
                              ({item.totalShare}%)
                            </span>
                          )}
                        </Badge>
                        <a
                          href={`${clientConfig.app.frontendUrl}${item.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="View live page"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROW 4: ACQUISITION CHANNELS & GLOBAL REACH BENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COL 1: TRAFFIC ACQUISITION (REFERRERS & UTMS) */}
          <Card className="border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Acquisition Channels
                </CardTitle>
                <CardDescription className="text-xs">
                  Where readers originate from
                </CardDescription>
              </div>

              <Tabs
                value={acquisitionTab}
                onValueChange={(val) => setAcquisitionTab(val as typeof acquisitionTab)}
                className="w-auto"
              >
                <TabsList className="h-7 p-0.5 bg-muted">
                  <TabsTrigger value="referrers" className="text-xs px-2.5 h-6">
                    Referrers
                  </TabsTrigger>
                  <TabsTrigger value="campaigns" className="text-xs px-2.5 h-6">
                    UTMs
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="p-4 flex-1">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : (acquisitionTab === "referrers" ? topReferrers : topCampaigns).length === 0 ? (
                <div className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Compass className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-medium">No {acquisitionTab} recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(acquisitionTab === "referrers" ? topReferrers : topCampaigns).map((item: any, idx: number) => {
                    const label = acquisitionTab === "referrers" ? item.source : item.campaign;
                    const IconComponent = getReferrerIcon(label);

                    return (
                      <div
                        key={idx}
                        className="group relative flex items-center justify-between overflow-hidden rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/30"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500/10 dark:bg-blue-500/15 rounded-md transition-all duration-500"
                          style={{ width: `${item.relativeScale ?? item.percentShare}%` }}
                        />
                        <div className="relative z-10 flex items-center gap-2 min-w-0 pr-4 flex-1">
                          <IconComponent className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {label || "Direct / Untracked"}
                          </span>
                        </div>
                        <div className="relative z-10 flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {formatNumber(item.views)}
                          </span>
                          {item.totalShare !== undefined && (
                            <span className="text-[10px] text-muted-foreground">
                              ({item.totalShare}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* COL 2: DEVICE DISTRIBUTION DONUT */}
          <Card className="border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold font-heading">
                Device Distribution
              </CardTitle>
              <CardDescription className="text-xs">
                Traffic split by reader device type
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              {isLoading || !mounted ? (
                <div className="h-[170px] flex items-center justify-center">
                  <Skeleton className="size-32 rounded-full" />
                </div>
              ) : devices.length === 0 || (devices[0]?.value === 0 && devices[1]?.value === 0 && devices[2]?.value === 0) ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Smartphone className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-medium">No device telemetry yet</p>
                </div>
              ) : (
                <div className="relative flex items-center justify-center h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {devices.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                      {dominantDevice?.percentage}%
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      {dominantDevice?.name}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50 mt-2 text-center">
                <div className="flex flex-col items-center p-2 rounded-lg bg-muted/20">
                  <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                    <Monitor className="size-3 text-blue-500" />
                    <span>Desktop</span>
                  </div>
                  <span className="text-sm font-semibold font-mono text-foreground">
                    {devices.find((d: any) => d.name === "Desktop")?.percentage ?? 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatNumber(devices.find((d: any) => d.name === "Desktop")?.value ?? 0)}
                  </span>
                </div>

                <div className="flex flex-col items-center p-2 rounded-lg bg-muted/20">
                  <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                    <Smartphone className="size-3 text-emerald-500" />
                    <span>Mobile</span>
                  </div>
                  <span className="text-sm font-semibold font-mono text-foreground">
                    {devices.find((d: any) => d.name === "Mobile")?.percentage ?? 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatNumber(devices.find((d: any) => d.name === "Mobile")?.value ?? 0)}
                  </span>
                </div>

                <div className="flex flex-col items-center p-2 rounded-lg bg-muted/20">
                  <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                    <Tablet className="size-3 text-purple-500" />
                    <span>Tablet</span>
                  </div>
                  <span className="text-sm font-semibold font-mono text-foreground">
                    {devices.find((d: any) => d.name === "Tablet")?.percentage ?? 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatNumber(devices.find((d: any) => d.name === "Tablet")?.value ?? 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* COL 3: GLOBAL REACH (COUNTRIES) & EDITORIAL SHORTCUTS */}
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
                onValueChange={(val) => setRightPanelTab(val as typeof rightPanelTab)}
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
                    {topCountries.map((c: any) => (
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
                        {data?.unreadSubmissionsCount > 0 ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            {data.unreadSubmissionsCount} new
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
                        {data?.unapprovedCommentsCount > 0 ? (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
                            {data.unapprovedCommentsCount} pending
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">All clear</span>
                        )}
                      </Link>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/blogs/new")}
                      className="h-9 justify-start gap-2 text-xs font-medium cursor-pointer"
                    >
                      <PenToolIcon className="size-3.5 text-primary" />
                      <span>New Blog Post</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/webpages")}
                      className="h-9 justify-start gap-2 text-xs font-medium cursor-pointer"
                    >
                      <Globe className="size-3.5 text-emerald-500" />
                      <span>Webpages</span>
                    </Button>
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
                        {recentDraftBlogs.map((b: any) => (
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
        </div>
      </main>
    </div>
  );
}
