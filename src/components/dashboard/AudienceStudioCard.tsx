"use client";

import React, { memo } from "react";
import { Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CountryItem } from "./types";
import { formatNumber } from "./utils";

interface AudienceStudioCardProps {
  topCountries: CountryItem[];
  isLoading: boolean;
}

export const AudienceStudioCard = memo(function AudienceStudioCard({
  topCountries,
  isLoading,
}: AudienceStudioCardProps) {
  return (
    <Card className="border border-border/70 shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold font-heading">
            Geographic Reach
          </CardTitle>
          <CardDescription className="text-xs">
            Traffic distribution by reader country
          </CardDescription>
        </div>

        <Globe className="size-4 text-emerald-500" />
      </CardHeader>

      <CardContent className="p-4 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
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
            {topCountries.map((c) => (
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
        )}
      </CardContent>
    </Card>
  );
});
