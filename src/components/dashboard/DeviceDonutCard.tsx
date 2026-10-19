"use client";

import React, { useMemo, memo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Smartphone, Monitor, Tablet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceData } from "./types";
import { formatNumber } from "./utils";
import { AnimatedCounter } from "./AnimatedCounter";

interface DeviceDonutCardProps {
  devices: DeviceData[];
  isLoading: boolean;
  mounted: boolean;
}

export const DeviceDonutCard = memo(function DeviceDonutCard({
  devices,
  isLoading,
  mounted,
}: DeviceDonutCardProps) {
  const dominantDevice = useMemo(() => {
    if (!devices || devices.length === 0) return { name: "Desktop", percentage: 0 };
    return [...devices].sort((a, b) => b.value - a.value)[0];
  }, [devices]);

  const desktopItem = devices.find((d) => d.name === "Desktop");
  const mobileItem = devices.find((d) => d.name === "Mobile");
  const tabletItem = devices.find((d) => d.name === "Tablet");

  const hasNoData =
    devices.length === 0 ||
    (desktopItem?.value === 0 && mobileItem?.value === 0 && tabletItem?.value === 0);

  return (
    <Card className="border border-border/70 shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base font-semibold font-heading">
          Devices
        </CardTitle>
        <CardDescription className="text-xs">
          Devices used to browse your site
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        {isLoading || !mounted ? (
          <div className="h-42.5 flex items-center justify-center">
            <Skeleton className="size-32 rounded-full" />
          </div>
        ) : hasNoData ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Smartphone className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-medium">No device data recorded yet</p>
          </div>
        ) : (
          <div className="relative flex items-center justify-center h-42.5">
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
                  {devices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                <AnimatedCounter
                  value={dominantDevice?.percentage ?? 0}
                  formatter={(v) => `${Math.round(v)}%`}
                />
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
              <AnimatedCounter
                value={desktopItem?.percentage ?? 0}
                formatter={(v) => `${Math.round(v)}%`}
              />
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              <AnimatedCounter
                value={desktopItem?.value ?? 0}
                formatter={(v) => formatNumber(Math.round(v))}
              />
            </span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/20">
            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
              <Smartphone className="size-3 text-emerald-500" />
              <span>Mobile</span>
            </div>
            <span className="text-sm font-semibold font-mono text-foreground">
              <AnimatedCounter
                value={mobileItem?.percentage ?? 0}
                formatter={(v) => `${Math.round(v)}%`}
              />
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              <AnimatedCounter
                value={mobileItem?.value ?? 0}
                formatter={(v) => formatNumber(Math.round(v))}
              />
            </span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/20">
            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
              <Tablet className="size-3 text-purple-500" />
              <span>Tablet</span>
            </div>
            <span className="text-sm font-semibold font-mono text-foreground">
              <AnimatedCounter
                value={tabletItem?.percentage ?? 0}
                formatter={(v) => `${Math.round(v)}%`}
              />
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              <AnimatedCounter
                value={tabletItem?.value ?? 0}
                formatter={(v) => formatNumber(Math.round(v))}
              />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
