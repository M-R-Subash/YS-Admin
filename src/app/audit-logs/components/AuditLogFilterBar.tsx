import React from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CATEGORY_OPTIONS } from "../types";

export interface UniqueActor {
  email: string;
  name: string;
}

export interface AuditLogFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategories: Set<string>;
  onCategoriesChange: (next: Set<string>) => void;
  selectedActionFilter: string;
  onActionFilterChange: (val: string) => void;
  selectedActor: string;
  onActorChange: (val: string) => void;
  uniqueActors: UniqueActor[];
}

export const AuditLogFilterBar = React.memo(function AuditLogFilterBar({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedActionFilter,
  onActionFilterChange,
  selectedActor,
  onActorChange,
  uniqueActors,
}: AuditLogFilterBarProps) {
  const handleToggleCategory = (catKey: string, isChecked: boolean) => {
    const next = new Set(
      selectedCategories.size === 0
        ? CATEGORY_OPTIONS.map((c) => c.key)
        : selectedCategories
    );
    if (isChecked) {
      next.delete(catKey);
    } else {
      next.add(catKey);
    }
    if (next.size === CATEGORY_OPTIONS.length || next.size === 0) {
      onCategoriesChange(new Set());
    } else {
      onCategoriesChange(next);
    }
  };

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0">
      {/* Quick Search */}
      <div className="relative flex-1 md:max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by page, article title, slug, or team member..."
          className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border rounded-lg w-full"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div
        className={`grid ${
          uniqueActors.length > 1 ? "grid-cols-3" : "grid-cols-2"
        } md:flex md:items-center gap-1.5 sm:gap-2 w-full md:w-auto`}
      >
        {/* Category Filter Checkbox Dropdown */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-2.5 text-xs cursor-pointer border-border font-medium gap-1 sm:gap-1.5 w-full md:w-auto justify-between md:justify-start"
              >
                <div className="flex items-center gap-1 truncate">
                  <Filter className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedCategories.size > 0 &&
                    selectedCategories.size < CATEGORY_OPTIONS.length
                      ? `Cats (${selectedCategories.size})`
                      : "Categories"}
                  </span>
                </div>
                <ChevronDown className="size-3 text-muted-foreground opacity-70 shrink-0 ml-0.5" />
              </Button>
            }
          />
          <PopoverContent align="end" className="w-64 p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                Categories
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCategoriesChange(new Set())}
                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  All
                </button>
                <span className="text-muted-foreground text-[10px]">|</span>
                <button
                  type="button"
                  onClick={() => onCategoriesChange(new Set(["PAGES", "BLOGS"]))}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                >
                  Content only
                </button>
              </div>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {CATEGORY_OPTIONS.map((cat) => {
                const isChecked =
                  selectedCategories.size === 0 || selectedCategories.has(cat.key);
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.key}
                    onClick={() => handleToggleCategory(cat.key, isChecked)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/70 cursor-pointer text-xs font-medium text-foreground select-none transition-colors"
                  >
                    <Checkbox checked={isChecked} />
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span>{cat.label}</span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* State Transition Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <Select
            value={selectedActionFilter}
            onValueChange={(val) => onActionFilterChange(val || "ALL")}
          >
            <SelectTrigger className="h-8 px-2 sm:px-2.5 text-xs bg-muted/40 border-border cursor-pointer w-full md:min-w-32.5">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              sideOffset={4}
              className="min-w-40"
            >
              <SelectItem
                value="ALL"
                label="All States"
                className="text-xs font-semibold cursor-pointer"
              >
                All States
              </SelectItem>
              <SelectItem
                value="published"
                label="Published / Live"
                className="text-xs font-semibold cursor-pointer text-emerald-600 dark:text-emerald-400"
              >
                Published / Live
              </SelectItem>
              <SelectItem
                value="draft"
                label="Drafts / Inactive"
                className="text-xs font-semibold cursor-pointer text-amber-600 dark:text-amber-400"
              >
                Drafts / Inactive
              </SelectItem>
              <SelectItem
                value="updated"
                label="Content & SEO Edits"
                className="text-xs font-semibold cursor-pointer text-blue-600 dark:text-blue-400"
              >
                Content & SEO Edits
              </SelectItem>
              <SelectItem
                value="trashed"
                label="Trashed"
                className="text-xs font-semibold cursor-pointer text-orange-600 dark:text-orange-400"
              >
                Trashed
              </SelectItem>
              <SelectItem
                value="deleted"
                label="Permanently Deleted"
                className="text-xs font-semibold cursor-pointer text-rose-600 dark:text-rose-400"
              >
                Permanently Deleted
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Team Member Filter */}
        {uniqueActors.length > 1 && (
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <Select
              value={selectedActor}
              onValueChange={(val) => onActorChange(val || "ALL")}
            >
              <SelectTrigger className="h-8 px-2 sm:px-2.5 text-xs bg-muted/40 border-border cursor-pointer w-full md:min-w-35">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                sideOffset={4}
                className="min-w-42.5"
              >
                <SelectItem
                  value="ALL"
                  label="All Team Members"
                  className="text-xs font-semibold cursor-pointer"
                >
                  All Team Members
                </SelectItem>
                {uniqueActors.map((actor) => (
                  <SelectItem
                    key={actor.email}
                    value={actor.email}
                    label={actor.name}
                    className="text-xs font-medium cursor-pointer"
                  >
                    {actor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
});
