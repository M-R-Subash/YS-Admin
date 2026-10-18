"use client";

import React, { useState, useMemo, memo } from "react";
import { Search, Globe, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { clientConfig } from "@/lib/config/client";
import { ContentItem } from "./types";
import { formatNumber } from "./utils";

interface TopContentCardProps {
  topBlogs: ContentItem[];
  topPages: ContentItem[];
  isLoading: boolean;
}

export const TopContentCard = memo(function TopContentCard({
  topBlogs,
  topPages,
  isLoading,
}: TopContentCardProps) {
  const [contentTab, setContentTab] = useState<"blogs" | "pages">("blogs");
  const [contentSearch, setContentSearch] = useState("");

  const filteredContent = useMemo(() => {
    const list = contentTab === "blogs" ? topBlogs : topPages;
    if (!contentSearch.trim()) return list;
    const q = contentSearch.toLowerCase();
    return list.filter((item) => {
      const title = (item?.title || item?.path || "").toLowerCase();
      const path = (item?.path || "").toLowerCase();
      return title.includes(q) || path.includes(q);
    });
  }, [contentTab, topBlogs, topPages, contentSearch]);

  return (
    <Card className="lg:col-span-2 border border-border/70 shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold font-heading">
            Top Performing Content
          </CardTitle>
          <CardDescription className="text-xs">
            Highest-trafficked articles and landing pages for this timeframe
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {/* SEARCH FILTER ISOLATED TO THIS CARD */}
          <div className="relative w-36 sm:w-44">
            <Search className="size-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={contentSearch}
              onChange={(e) => setContentSearch(e.target.value)}
              className="h-8 pl-7 text-xs bg-muted/40"
            />
          </div>

          {/* TABS FOR BLOGS VS PAGES */}
          <Tabs
            value={contentTab}
            onValueChange={(val) => setContentTab(val as "blogs" | "pages")}
            className="w-auto"
          >
            <TabsList className="h-8 p-0.5 bg-muted">
              <TabsTrigger value="blogs" className="text-xs px-2.5 h-7">
                Blogs ({topBlogs.length})
              </TabsTrigger>
              <TabsTrigger value="pages" className="text-xs px-2.5 h-7">
                Pages ({topPages.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Globe className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-medium">No results found for &ldquo;{contentSearch}&rdquo;</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              Try searching for another keyword or switch tabs.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContent.map((item, index) => (
              <div
                key={item.path}
                className="group relative flex items-center justify-between overflow-hidden rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/30"
              >
                {/* PROPORTIONAL BACKGROUND FILL BAR (RELATIVE TO TOP ITEM) */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 dark:bg-primary/15 rounded-md transition-all duration-500 ease-out"
                  style={{ width: `${item.relativeScale ?? item.percentShare}%` }}
                  title={`Relative index: ${item.relativeScale ?? item.percentShare}% | Share of total site views: ${item.totalShare ?? 0}%`}
                />

                {/* FOREGROUND TITLE & URL */}
                <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-4 flex-1">
                  <span className="font-mono text-[11px] text-muted-foreground/60 w-5 shrink-0">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {item.path}
                    </p>
                  </div>
                </div>

                {/* FOREGROUND METRICS & LINK */}
                <div className="relative z-10 flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs px-2 py-0.5 bg-background/80 border border-border/40 font-semibold"
                  >
                    {formatNumber(item.views)} views
                    {item.totalShare !== undefined && (
                      <span className="text-[10px] text-muted-foreground font-normal ml-1">
                        ({item.totalShare}%)
                      </span>
                    )}
                  </Badge>
                  <a
                    href={`${clientConfig.app.frontendUrl}${item.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                    title="View live page"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
