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
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { clientConfig } from "@/lib/config/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  totalViews: {
    label: "Total Views",
    color: "#3b82f6",
  },
  uniqueVisitors: {
    label: "Unique Visitors",
    color: "#10b981",
  },
  engagedVisits: {
    label: "Engaged Visits",
    color: "#8b5cf6",
  },
  subscribers: {
    label: "Subscribers",
    color: "#a855f7",
  },
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

function getReferrerIcon(source: string) {
  const s = source.toLowerCase();
  if (s.includes("google") || s.includes("bing") || s.includes("yahoo") || s.includes("search")) {
    return Globe;
  }
  if (s.includes("linkedin") || s.includes("twitter") || s.includes("facebook") || s.includes("social")) {
    return Share2;
  }
  if (s.includes("newsletter") || s.includes("email") || s.includes("mail")) {
    return Mail;
  }
  return Compass;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [range, setRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeKpiTab, setActiveKpiTab] = useState<"views" | "visitors" | "engagement" | "subscribers">("views");
  const [contentTab, setContentTab] = useState<"blogs" | "pages">("blogs");
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

  const { data, isLoading, mutate, isValidating } = useSWR(
    `/api/dashboard/stats?range=${range}`,
    {
      refreshInterval: autoRefresh ? 30000 : 0,
      dedupingInterval: 5000,
    }
  );

  const summary = data?.summary;
  const timeSeries = data?.timeSeries || [];
  const devices = useMemo(() => data?.devices || [], [data?.devices]);
  const topBlogs = data?.topContent?.blogs || [];
  const topPages = data?.topContent?.pages || [];
  const topReferrers = data?.acquisition?.referrers || [];
  const topCampaigns = data?.acquisition?.campaigns || [];
  const topCountries = data?.acquisition?.countries || [];
  const recentDraftBlogs = data?.editorial?.recentDraftBlogs || [];
  const activeNow = summary?.activeNow ?? 0;

  // Calculate dominant device
  const dominantDevice = useMemo(() => {
    if (!devices || devices.length === 0) return { name: "Desktop", percentage: 0 };
    return [...devices].sort((a: any, b: any) => b.value - a.value)[0];
  }, [devices]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AdminTopBar
        breadcrumbs="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isValidating}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${isValidating ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <main className="flex-1 flex flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5 w-full">
        {/* TOP CONTROL BAR: Greeting, Pulse Badge, Range Switcher & Auto-refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading" suppressHydrationWarning>
                {greeting}, {session?.user?.name?.split(" ")[0] || "Admin"}
              </h1>
              {/* LIVE PULSE INDICATOR */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span>
                  <strong className="font-semibold">{activeNow}</strong> Active Now
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time visitor traffic, audience engagement, and publishing insights.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
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

            {/* AUTO REFRESH TOGGLE */}
            <Button
              variant={autoRefresh ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-8 text-xs gap-1.5 ${
                autoRefresh ? "border-primary/40 bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <span className={`size-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
              <span className="hidden sm:inline">Auto-refresh (30s)</span>
              <span className="sm:hidden">Auto</span>
            </Button>
          </div>
        </div>

        {/* ROW 1: VERCEL-STYLE INTERACTIVE HERO CHART CARD */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          {/* TOP 4 INTERACTIVE KPI TABS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-border/60 divide-x divide-y lg:divide-y-0 divide-border/60 bg-muted/20">
            {/* KPI 1: Unique Visitors */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveKpiTab("visitors")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveKpiTab("visitors");
                }
              }}
              className={`p-4 sm:p-5 lg:p-6 text-left transition-colors cursor-pointer group hover:bg-muted/40 select-none ${
                activeKpiTab === "visitors" ? "bg-background shadow-xs ring-1 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-medium group-hover:text-foreground">Unique Visitors</span>
                <Users className="size-3.5" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(summary?.uniqueVisitors ?? 0)}
                </span>
                {!isLoading && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 rounded-sm ${
                      (summary?.visitorsTrend ?? 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {(summary?.visitorsTrend ?? 0) >= 0 ? (
                      <TrendingUp className="size-2.5" />
                    ) : (
                      <TrendingDown className="size-2.5" />
                    )}
                    {Math.abs(summary?.visitorsTrend ?? 0)}%
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                vs previous {range.toUpperCase()} period
              </span>
            </div>

            {/* KPI 2: Total Pageviews */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveKpiTab("views")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveKpiTab("views");
                }
              }}
              className={`p-4 sm:p-5 lg:p-6 text-left transition-colors cursor-pointer group hover:bg-muted/40 select-none ${
                activeKpiTab === "views" ? "bg-background shadow-xs ring-1 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-medium group-hover:text-foreground">Total Pageviews</span>
                <Eye className="size-3.5" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(summary?.totalViews ?? 0)}
                </span>
                {!isLoading && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 rounded-sm ${
                      (summary?.viewsTrend ?? 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {(summary?.viewsTrend ?? 0) >= 0 ? (
                      <TrendingUp className="size-2.5" />
                    ) : (
                      <TrendingDown className="size-2.5" />
                    )}
                    {Math.abs(summary?.viewsTrend ?? 0)}%
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                Total page impressions
              </span>
            </div>

            {/* KPI 3: Engagement Rate */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveKpiTab("engagement")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveKpiTab("engagement");
                }
              }}
              className={`p-4 sm:p-5 lg:p-6 text-left transition-colors cursor-pointer group hover:bg-muted/40 select-none ${
                activeKpiTab === "engagement" ? "bg-background shadow-xs ring-1 ring-primary/20" : ""
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
                        <p className="text-xs">Visitors who spent &gt;10s or scrolled &gt;50% down an article</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Activity className="size-3.5" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : `${summary?.engagementRate ?? 0}%`}
                </span>
                {!isLoading && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-0.5 rounded-sm ${
                      (summary?.engagementRateTrend ?? 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {(summary?.engagementRateTrend ?? 0) >= 0 ? (
                      <TrendingUp className="size-2.5" />
                    ) : (
                      <TrendingDown className="size-2.5" />
                    )}
                    {Math.abs(summary?.engagementRateTrend ?? 0)}%
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/80 mt-1 block">
                High-interest readers
              </span>
            </div>

            {/* KPI 4: Active Subscribers */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveKpiTab("subscribers")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveKpiTab("subscribers");
                }
              }}
              className={`p-4 sm:p-5 lg:p-6 text-left transition-colors cursor-pointer group hover:bg-muted/40 select-none ${
                activeKpiTab === "subscribers" ? "bg-background shadow-xs ring-1 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-medium group-hover:text-foreground">Newsletter Subscribers</span>
                <Mail className="size-3.5" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(summary?.subscribersCount ?? 0)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">Subscribers</span>
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/newsletters");
                }}
                className="text-[11px] text-muted-foreground/80 mt-1 block inline-flex items-center gap-1 text-primary hover:underline"
              >
                Manage Subscribers &rarr;
              </span>
            </div>
          </div>

          {/* DUAL-GRADIENT AREA CHART */}
          <CardContent className="p-4 sm:p-6">
            {!mounted || isLoading ? (
              <div className="h-[300px] sm:h-[340px] lg:h-[360px] w-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            ) : timeSeries.length === 0 ? (
              <div className="h-[300px] sm:h-[340px] lg:h-[360px] w-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Sparkles className="size-8 mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">No traffic recorded yet for this period</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Visitor data from main.ys will populate this chart in real time.
                </p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] sm:h-[340px] lg:h-[360px] w-full">
                <AreaChart
                  data={timeSeries}
                  margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fillSubscribers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={20}
                    className="text-[11px] fill-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.max(dataMax, 4) : 4)]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[11px] fill-muted-foreground"
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}K` : Math.round(val).toString())}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => `${value}`}
                        indicator="dot"
                      />
                    }
                  />
                  {/* Total Views (shown when Views or Engagement is active) */}
                  {(activeKpiTab === "views" || activeKpiTab === "engagement") && (
                    <Area
                      type="monotone"
                      dataKey="totalViews"
                      name="Total Views"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#fillViews)"
                      dot={{ r: 3, fill: "#3b82f6", strokeWidth: 1 }}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                    />
                  )}
                  {/* Unique Visitors (shown when Visitors or Engagement is active) */}
                  {(activeKpiTab === "visitors" || activeKpiTab === "engagement") && (
                    <Area
                      type="monotone"
                      dataKey="uniqueVisitors"
                      name="Unique Visitors"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#fillVisitors)"
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 1 }}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                    />
                  )}
                  {/* Subscribers (shown when Subscribers tab is active) */}
                  {activeKpiTab === "subscribers" && (
                    <Area
                      type="monotone"
                      dataKey="subscribers"
                      name="Subscribers"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#fillSubscribers)"
                      dot={{ r: 3, fill: "#a855f7", strokeWidth: 1 }}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                    />
                  )}
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* ROW 2: BENTO GRID (2/3 Top Content Bar-List vs 1/3 Devices Donut) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COL 1 & 2: TOP PERFORMING CONTENT (PLAUSIBLE-STYLE BAR-LIST) */}
          <Card className="lg:col-span-2 border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Top Performing Content
                </CardTitle>
                <CardDescription className="text-xs">
                  Highest-trafficked articles and landing pages for this timeframe
                </CardDescription>
              </div>

              {/* TABS FOR BLOGS VS PAGES */}
              <Tabs
                value={contentTab}
                onValueChange={(val) => setContentTab(val as typeof contentTab)}
                className="w-auto"
              >
                <TabsList className="h-7 p-0.5 bg-muted">
                  <TabsTrigger value="blogs" className="text-xs px-2.5 h-6">
                    Top Blogs
                  </TabsTrigger>
                  <TabsTrigger value="pages" className="text-xs px-2.5 h-6">
                    Top Pages
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="p-4 flex-1">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : (contentTab === "blogs" ? topBlogs : topPages).length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Globe className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-medium">No pageviews recorded yet for {contentTab}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Visits from public visitors will appear ranked here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(contentTab === "blogs" ? topBlogs : topPages).map((item: any, index: number) => (
                    <div
                      key={item.path}
                      className="group relative flex items-center justify-between overflow-hidden rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/30"
                    >
                      {/* PLAUSIBLE-STYLE PROPORTIONAL BACKGROUND FILL BAR */}
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/10 dark:bg-primary/15 rounded-md transition-all duration-500 ease-out"
                        style={{ width: `${item.percentShare}%` }}
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
                        </Badge>
                        <a
                          href={`${clientConfig.app.frontendUrl}${item.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="View on live site"
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

          {/* COL 3: DEVICES & BROWSERS DONUT CHART */}
          <Card className="border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold font-heading">
                Device Distribution
              </CardTitle>
              <CardDescription className="text-xs">
                Traffic split by device category
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              {isLoading || !mounted ? (
                <div className="h-[180px] flex items-center justify-center">
                  <Skeleton className="size-32 rounded-full" />
                </div>
              ) : devices.length === 0 || (devices[0]?.value === 0 && devices[1]?.value === 0 && devices[2]?.value === 0) ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Smartphone className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-medium">No device data yet</p>
                </div>
              ) : (
                <div className="relative flex items-center justify-center h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {devices.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* CENTER TEXT INSIDE DONUT RING */}
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

              {/* CLEAN DEVICE ICONS & LEGEND */}
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
        </div>

        {/* ROW 3: 2-COLUMN SPLIT (Acquisition Sources vs Global Reach & Editorial) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: TRAFFIC SOURCES & CAMPAIGNS */}
          <Card className="border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Acquisition Channels
                </CardTitle>
                <CardDescription className="text-xs">
                  Where your readers and subscribers originate from
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
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    External link referrals will be categorized automatically.
                  </p>
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
                        {/* PROPORTIONAL BACKGROUND PROGRESS BAR */}
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500/10 dark:bg-blue-500/15 rounded-md transition-all duration-500"
                          style={{ width: `${item.percentShare}%` }}
                        />

                        {/* FOREGROUND SOURCE LABEL */}
                        <div className="relative z-10 flex items-center gap-2 min-w-0 pr-4 flex-1">
                          <IconComponent className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {label || "Untracked Campaign"}
                          </span>
                        </div>

                        {/* FOREGROUND VIEW COUNT */}
                        <div className="relative z-10 flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {formatNumber(item.views)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">views</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: GLOBAL REACH (COUNTRIES) & EDITORIAL QUICK ACTIONS */}
          <Card className="border border-border/70 shadow-xs flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold font-heading">
                  Audience & Quick Actions
                </CardTitle>
                <CardDescription className="text-xs">
                  Geographic reach and studio publishing shortcuts
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
                    Shortcuts
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
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      Country codes from HTTP edge headers will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topCountries.map((c: any) => (
                      <div
                        key={c.code}
                        className="group relative flex items-center justify-between overflow-hidden rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/30"
                      >
                        {/* PROPORTIONAL BACKGROUND PROGRESS BAR */}
                        <div
                          className="absolute inset-y-0 left-0 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md transition-all duration-500"
                          style={{ width: `${c.percentShare}%` }}
                        />

                        {/* COUNTRY FLAG & CODE */}
                        <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-4 flex-1">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="font-semibold text-foreground font-mono">
                            {c.code}
                          </span>
                        </div>

                        {/* COUNTRY VIEWS */}
                        <div className="relative z-10 flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {formatNumber(c.views)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* EDITORIAL SHORTCUTS TAB */
                <div className="space-y-4">
                  {/* ADMIN NOTIFICATION CALLOUTS */}
                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/submissions"
                        className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Inbox className="size-4 text-primary" />
                          <span className="text-xs font-medium">Submissions</span>
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

                  {/* QUICK CREATION BUTTONS */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/blogs/new")}
                      className="h-9 justify-start gap-2 text-xs font-medium"
                    >
                      <PenToolIcon className="size-3.5 text-primary" />
                      <span>New Blog Post</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/webpages")}
                      className="h-9 justify-start gap-2 text-xs font-medium"
                    >
                      <Globe className="size-3.5 text-emerald-500" />
                      <span>Webpages</span>
                    </Button>
                  </div>

                  {/* RECENT DRAFTS / SCHEDULED BLOGS */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Recent Drafts &amp; Scheduled Posts
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
