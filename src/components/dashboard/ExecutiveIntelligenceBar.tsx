"use client";

import React, { memo } from "react";
import { TrendingUp, Sparkles, Globe, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InsightItem } from "./types";

interface ExecutiveIntelligenceBarProps {
  insights: InsightItem[];
}

export const ExecutiveIntelligenceBar = memo(function ExecutiveIntelligenceBar({
  insights,
}: ExecutiveIntelligenceBarProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {insights.map((ins) => (
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
  );
});
