"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type MetricCardColor = "primary" | "emerald" | "purple" | "amber" | "red";

export interface MetricCardItem {
  id: string;
  label: string;
  count: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color?: MetricCardColor;
  isActive?: boolean;
  onClick?: () => void;
  badgeLabel?: string;
}

export interface ContentMetricCardsProps {
  cards: MetricCardItem[];
  loading?: boolean;
  className?: string;
}

const colorStyles: Record<
  MetricCardColor,
  {
    active: string;
    inactiveHover: string;
    iconBox: string;
    badge: string;
  }
> = {
  primary: {
    active: "bg-primary/5 border-primary ring-1 ring-primary shadow-sm",
    inactiveHover: "hover:border-primary/40",
    iconBox: "bg-primary/10 text-primary",
    badge: "text-primary bg-primary/10 border-primary/20",
  },
  emerald: {
    active: "bg-emerald-500/5 border-emerald-500 ring-1 ring-emerald-500 shadow-sm",
    inactiveHover: "hover:border-emerald-500/40",
    iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  purple: {
    active: "bg-purple-500/5 border-purple-500 ring-1 ring-purple-500 shadow-sm",
    inactiveHover: "hover:border-purple-500/40",
    iconBox: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    badge: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  amber: {
    active: "bg-amber-500/5 border-amber-500 ring-1 ring-amber-500 shadow-sm",
    inactiveHover: "hover:border-amber-500/40",
    iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  red: {
    active: "bg-red-500/5 border-red-500 ring-1 ring-red-500 shadow-sm",
    inactiveHover: "hover:border-red-500/40",
    iconBox: "bg-red-500/10 text-red-600 dark:text-red-400",
    badge: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
  },
};

export function ContentMetricCards({
  cards,
  loading = false,
  className = "",
}: ContentMetricCardsProps) {
  const gridLayout =
    cards.length >= 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : "grid-cols-2 lg:grid-cols-4";

  if (loading) {
    return (
      <div className={`grid ${gridLayout} gap-3.5 ${className}`}>
        {Array.from({ length: cards.length || 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridLayout} gap-3.5 ${className}`}>
      {cards.map((card) => {
        const color = card.color || "primary";
        const style = colorStyles[color];
        const IconComponent = card.icon;

        return (
          <div
            key={card.id}
            role={card.onClick ? "button" : undefined}
            tabIndex={card.onClick ? 0 : undefined}
            onClick={card.onClick}
            className={`rounded-sm border p-4 shadow-xs transition-all select-none flex flex-col justify-between ${
              card.onClick ? "cursor-pointer" : ""
            } ${
              card.isActive
                ? style.active
                : `bg-card border-border ${style.inactiveHover} hover:shadow-xs`
            }`}
          >
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <div className={`p-1.5 rounded-sm ${style.iconBox}`}>
                <IconComponent className="size-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="text-2xl font-extrabold text-foreground">
                {card.count}
              </div>
              {card.isActive && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-xs border ${style.badge}`}
                >
                  {card.badgeLabel || "Active"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
