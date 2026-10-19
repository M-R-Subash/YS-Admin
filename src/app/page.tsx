"use client";

import React, { useState, useCallback, useSyncExternalStore } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { RefreshCw, AlertCircle } from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { DashboardStatsResponse } from "@/components/dashboard/types";
import { EMPTY_ARRAY } from "@/components/dashboard/utils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TrafficKpiHero } from "@/components/dashboard/TrafficKpiHero";
import { ConversionFunnelCard } from "@/components/dashboard/ConversionFunnelCard";
import { ReaderQualityCard } from "@/components/dashboard/ReaderQualityCard";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { TopContentCard } from "@/components/dashboard/TopContentCard";
import { AcquisitionChannelsCard } from "@/components/dashboard/AcquisitionChannelsCard";
import { DeviceDonutCard } from "@/components/dashboard/DeviceDonutCard";
import { AudienceStudioCard } from "@/components/dashboard/AudienceStudioCard";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const emptySubscribe = () => () => {};

export default function DashboardPage() {
  const { data: session } = useSession();

  const [range, setRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");
  const [compareMode, setCompareMode] = useState(true);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const greeting = mounted ? getGreeting() : "Good day";

  // SWR with keepPreviousData to prevent UI flashes during range transitions
  const { data, error, isLoading, mutate, isValidating } = useSWR<DashboardStatsResponse>(
    `/api/dashboard/stats?range=${range}`,
    {
      keepPreviousData: true,
    }
  );

  const handleToggleCompareMode = useCallback(() => {
    setCompareMode((prev) => !prev);
  }, []);

  const handleRangeChange = useCallback((newRange: "24h" | "7d" | "30d" | "90d") => {
    setRange(newRange);
  }, []);

  // Stable references for derived collections
  const summary = data?.summary;
  const funnel = data?.funnel;
  const sparklines = data?.sparklines;
  const liveVisitors = data?.liveVisitors ?? (EMPTY_ARRAY as any[]);
  const timeSeries = data?.timeSeries ?? (EMPTY_ARRAY as any[]);
  const devices = data?.devices ?? (EMPTY_ARRAY as any[]);
  const topBlogs = data?.topContent?.blogs ?? (EMPTY_ARRAY as any[]);
  const topPages = data?.topContent?.pages ?? (EMPTY_ARRAY as any[]);
  const topReferrers = data?.acquisition?.referrers ?? (EMPTY_ARRAY as any[]);
  const topCampaigns = data?.acquisition?.campaigns ?? (EMPTY_ARRAY as any[]);
  const topCountries = data?.acquisition?.countries ?? (EMPTY_ARRAY as any[]);
  const activeNow = summary?.activeNow ?? 0;

  return (
    <TooltipProvider delay={150}>
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
          <DashboardHeader
            userName={session?.user?.name?.split(" ")[0] || "Admin"}
            greeting={greeting}
            mounted={mounted}
            activeNow={activeNow}
            compareMode={compareMode}
            onToggleCompareMode={handleToggleCompareMode}
            range={range}
            onRangeChange={handleRangeChange}
          />

          {/* VISIBLE API ERROR ALERT STATE */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-400">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="size-4 shrink-0 text-rose-500" />
                <div>
                  <p className="font-semibold text-foreground">Analytics telemetry service unavailable</p>
                  <p className="text-muted-foreground mt-0.5">
                    Could not fetch statistics for the {range.toUpperCase()} timeframe. Please check your network or try again.
                  </p>
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

          {/* ROW 1: STRIPE & VERCEL-STYLE HERO CARD WITH EMBEDDED MICRO-SPARKLINES */}
          <TrafficKpiHero
            summary={summary}
            sparklines={sparklines}
            timeSeries={timeSeries}
            isLoading={isLoading}
            mounted={mounted}
            range={range}
            compareMode={compareMode}
          />

          {/* ROW 2: CONVERSION PIPELINE & READING QUALITY MATRIX */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ConversionFunnelCard funnel={funnel} isLoading={isLoading} />
            <ReaderQualityCard summary={summary} />
          </div>

          {/* ROW 3: REAL-TIME ACTIVITY & TOP CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <LiveActivityFeed
              liveVisitors={liveVisitors}
              isLoading={isLoading}
            />
            <TopContentCard
              topBlogs={topBlogs}
              topPages={topPages}
              isLoading={isLoading}
            />
          </div>

          {/* ROW 4: ACQUISITION CHANNELS, DEVICE DISTRIBUTION & AUDIENCE STUDIO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AcquisitionChannelsCard
              topReferrers={topReferrers}
              topCampaigns={topCampaigns}
              isLoading={isLoading}
            />
            <DeviceDonutCard
              devices={devices}
              isLoading={isLoading}
              mounted={mounted}
            />
            <AudienceStudioCard
              topCountries={topCountries}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
