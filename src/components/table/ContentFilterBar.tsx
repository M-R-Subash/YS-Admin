"use client";

import React from "react";
import { Search, SlidersHorizontal, ChevronDown, Check, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  secondaryFilter?: React.ReactNode;
  actionButton?: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  extraRightContent?: React.ReactNode;
  mobileRightContent?: React.ReactNode;
  className?: string;
  showCount?: boolean;
  filterMode?: "dropdown" | "tabs";
}

const colorMap: Record<FilterTabColor, string> = {
  primary: "bg-primary text-primary-foreground",
  emerald: "bg-emerald-600 text-white",
  purple: "bg-purple-600 text-white",
  amber: "bg-amber-600 text-white",
  red: "bg-red-600 text-white",
  default: "bg-foreground text-background",
};

const dotColorMap: Record<FilterTabColor, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  default: "bg-foreground/70",
};

export function ContentFilterBar({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  secondaryFilter,
  actionButton,
  onRefresh,
  isRefreshing = false,
  extraRightContent,
  mobileRightContent,
  className = "",
  showCount = false,
}: ContentFilterBarProps) {
  const activeTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  const renderStatusDropdown = (widthClass: string = "w-[105px] sm:w-[118px]") => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`h-9 gap-1.5 px-2.5 sm:px-3 text-xs font-semibold cursor-pointer shrink-0 border-border bg-card hover:bg-muted ${widthClass} justify-between`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {activeTabObj?.color && activeTabObj.id !== "all" && (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    dotColorMap[activeTabObj.color] || "bg-primary"
                  }`}
                />
              )}
              <span className="truncate">
                {activeTabObj ? activeTabObj.label : "All"}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70 shrink-0 ml-1" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-48 text-xs p-1">
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Filter by Status
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          const dotClass = tab.color ? dotColorMap[tab.color] : "bg-primary";

          return (
            <DropdownMenuItem
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 cursor-pointer rounded-xs transition-colors ${
                isSelected ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                <span className="truncate">{tab.label}</span>
                {showCount && typeof tab.count === "number" && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    ({tab.count})
                  </span>
                )}
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderStatusTabs = () => (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none no-scrollbar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const activeClass = tab.color ? colorMap[tab.color] : colorMap.primary;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              isActive
                ? activeClass
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {showCount && typeof tab.count === "number" && ` (${tab.count})`}
          </button>
        );
      })}
    </div>
  );

  // If a secondary filter (e.g. Category dropdown) is provided:
  // Mobile (< md): Row 1 = Status Dropdown + Secondary Filter + Action Button; Row 2 = Search + Refresh
  // Desktop (md:flex): Left = Status Tabs + Secondary Filter; Right = Search + Refresh + Action Button
  if (secondaryFilter) {
    return (
      <div className={`flex flex-col gap-2.5 ${className}`}>
        {/* Mobile View (< md) */}
        <div className="flex md:hidden flex-col gap-2.5 w-full">
          {/* Row 1: Filter 1 (Status Dropdown) + Filter 2 (Secondary) + Action Button */}
          <div className="flex items-center gap-2 w-full">
            <div className="shrink-0">
              {renderStatusDropdown("w-[95px] sm:w-[105px]")}
            </div>
            <div className="flex-1 min-w-0">
              {secondaryFilter}
            </div>
            {actionButton && (
              <div className="shrink-0">
                {actionButton}
              </div>
            )}
          </div>

          {/* Row 2: Search input + Refresh button */}
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs w-full bg-card"
              />
            </div>
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 shrink-0 border-border hover:bg-muted cursor-pointer"
                title="Refresh data"
              >
                <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Desktop View (md:flex): Status Tabs + Secondary Filter on Left, Search + Refresh + Action on Right */}
        <div className="hidden md:flex items-center justify-between gap-3 w-full">
          {/* Left: Status Tabs + Secondary Filter */}
          <div className="flex items-center gap-3">
            {renderStatusTabs()}
            <div className="w-40 lg:w-44">
              {secondaryFilter}
            </div>
          </div>

          {/* Right: Search + Refresh + Action Button */}
          <div className="flex items-center gap-2">
            <div className="relative w-64 lg:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs w-full bg-card"
              />
            </div>

            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 shrink-0 border-border hover:bg-muted cursor-pointer"
                title="Refresh data"
              >
                <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}

            {actionButton}
            {extraRightContent}
          </div>
        </div>
      </div>
    );
  }

  // Case B: If actionButton is provided without a secondary filter (e.g. Webpages)
  if (actionButton) {
    return (
      <div className={`flex flex-col gap-2.5 ${className}`}>
        {/* Mobile View (< md): Row 1 = Status Dropdown + Action Button; Row 2 = Search + Refresh */}
        <div className="flex md:hidden flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="shrink-0">
              {renderStatusDropdown("w-[105px] sm:w-[118px]")}
            </div>
            <div className="shrink-0">
              {actionButton}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs w-full bg-card"
              />
            </div>
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 shrink-0 border-border hover:bg-muted cursor-pointer"
                title="Refresh data"
              >
                <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
            {mobileRightContent}
          </div>
        </div>

        {/* Extra Right Content on Mobile if present */}
        {extraRightContent && (
          <div className="flex md:hidden items-center gap-2 shrink-0 justify-end">
            {extraRightContent}
          </div>
        )}

        {/* Desktop View (md:flex): Status Tabs on Left, Search + Actions on Right */}
        <div className="hidden md:flex items-center justify-between gap-4 w-full">
          <div>
            {renderStatusTabs()}
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative w-64 lg:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs w-full bg-card"
              />
            </div>
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 shrink-0 border-border hover:bg-muted cursor-pointer"
                title="Refresh data"
              >
                <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
            {actionButton}
            {extraRightContent}
          </div>
        </div>
      </div>
    );
  }

  // Case C: Standard Filter Bar (no secondary filter, no action button)
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {/* Mobile View (< md): Status Dropdown Button + Search Input + Refresh side-by-side */}
      <div className="flex md:hidden items-center gap-2 w-full">
        <div className="shrink-0">
          {renderStatusDropdown("w-[95px] sm:w-[105px]")}
        </div>

        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs w-full bg-card"
          />
        </div>

        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 shrink-0 border-border hover:bg-muted cursor-pointer"
            title="Refresh data"
          >
            <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}

        {mobileRightContent && (
          <div className="shrink-0">
            {mobileRightContent}
          </div>
        )}
      </div>

      {/* Extra Right Content on Mobile if present */}
      {extraRightContent && (
        <div className="flex md:hidden items-center gap-2 shrink-0 justify-end">
          {extraRightContent}
        </div>
      )}

      {/* Desktop View (md:flex): Status Tabs on Left, Search + Actions on Right */}
      <div className="hidden md:flex items-center justify-between gap-4 w-full">
        {/* Left: Status Tabs */}
        <div>
          {renderStatusTabs()}
        </div>

        {/* Right: Search Input + Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative w-64 lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-xs w-full bg-card"
            />
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 shrink-0 border-border hover:bg-muted cursor-pointer"
              title="Refresh data"
            >
              <RotateCw className={`w-3.5 h-3.5 text-purple-600 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
          {extraRightContent}
        </div>
      </div>
    </div>
  );
}
