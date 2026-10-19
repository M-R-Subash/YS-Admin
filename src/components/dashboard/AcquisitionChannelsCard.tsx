"use client";

import React, { useState, memo } from "react";
import { Compass } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChannelItem } from "./types";
import { formatNumber, getReferrerIcon } from "./utils";

interface AcquisitionChannelsCardProps {
  topReferrers: ChannelItem[];
  topCampaigns: ChannelItem[];
  isLoading: boolean;
}

export const AcquisitionChannelsCard = memo(function AcquisitionChannelsCard({
  topReferrers,
  topCampaigns,
  isLoading,
}: AcquisitionChannelsCardProps) {
  const [acquisitionTab, setAcquisitionTab] = useState<"referrers" | "campaigns">("referrers");

  const currentList = acquisitionTab === "referrers" ? topReferrers : topCampaigns;

  return (
    <Card className="border border-border/70 shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold font-heading">
            Traffic Sources
          </CardTitle>
          <CardDescription className="text-xs">
            Where your visitors discover and click to your website
          </CardDescription>
        </div>

        <Tabs
          value={acquisitionTab}
          onValueChange={(val) => setAcquisitionTab(val as "referrers" | "campaigns")}
          className="w-auto"
        >
          <TabsList className="h-7 p-0.5 bg-muted">
            <TabsTrigger value="referrers" className="text-xs px-2.5 h-6">
              Websites
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs px-2.5 h-6">
              Campaigns
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
        ) : currentList.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Compass className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-medium">
              No {acquisitionTab === "referrers" ? "referral websites" : "campaign links"} recorded yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.map((item, idx) => {
              const label = acquisitionTab === "referrers" ? item.source : item.campaign;
              const IconComponent = getReferrerIcon(label || "");

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
  );
});
