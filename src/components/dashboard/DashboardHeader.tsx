"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardHeaderProps {
  userName?: string;
  greeting: string;
  mounted: boolean;
  activeNow: number;
  compareMode: boolean;
  onToggleCompareMode: () => void;
  range: "24h" | "7d" | "30d" | "90d";
  onRangeChange: (range: "24h" | "7d" | "30d" | "90d") => void;
}

export const DashboardHeader = memo(function DashboardHeader({
  userName = "Admin",
  greeting,
  mounted,
  activeNow,
  compareMode,
  onToggleCompareMode,
  range,
  onRangeChange,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            {mounted ? (
              `${greeting}, ${userName}`
            ) : (
              <span className="opacity-0">Welcome back</span>
            )}
          </h1>
          {/* LIVE PULSE INDICATOR WITH HONEST STATUS */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${
                  activeNow > 0 ? "animate-ping opacity-75" : "opacity-0"
                }`}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>
              <strong className="font-semibold font-mono">{activeNow}</strong> Active Visitors
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Overview of your website visitors, reading trends, and subscriber growth.
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* SHOPIFY-STYLE GHOST COMPARISON TOGGLE */}
        <Button
          variant={compareMode ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleCompareMode}
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
          onValueChange={(val) => onRangeChange(val as "24h" | "7d" | "30d" | "90d")}
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
      </div>
    </div>
  );
});
