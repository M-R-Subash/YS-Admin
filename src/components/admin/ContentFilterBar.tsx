"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type FilterTabColor = "primary" | "emerald" | "purple" | "amber" | "red" | "default";

export interface ContentFilterTab {
  id: string;
  label: string;
  count?: number;
  color?: FilterTabColor;
}

export interface ContentFilterBarProps {
  tabs: ContentFilterTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  extraRightContent?: React.ReactNode;
  className?: string;
}

const colorMap: Record<FilterTabColor, string> = {
  primary: "bg-primary text-primary-foreground",
  emerald: "bg-emerald-600 text-white",
  purple: "bg-purple-600 text-white",
  amber: "bg-amber-600 text-white",
  red: "bg-red-600 text-white",
  default: "bg-foreground text-background",
};

export function ContentFilterBar({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  extraRightContent,
  className = "",
}: ContentFilterBarProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}>
      {/* Filter Tabs on Left */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const activeClass = tab.color ? colorMap[tab.color] : colorMap.primary;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                isActive
                  ? activeClass
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" && ` (${tab.count})`}
            </button>
          );
        })}
      </div>

      {/* Right Side: Search Input + Optional Actions */}
      <div className="flex items-center gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        {extraRightContent}
      </div>
    </div>
  );
}
