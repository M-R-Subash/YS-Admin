import { format } from "date-fns";

export function calculateTrend(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? null : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2 || countryCode === "UNKNOWN") return "🌐";
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🌐";
  }
}

export function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr + "T00:00:00Z");
  const end = new Date(endDateStr + "T00:00:00Z");
  while (curr <= end) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  totalViews: number;
  uniqueVisitors: number;
  engagedVisits: number;
  subscribers: number;
  prevTotalViews: number;
  prevUniqueVisitors: number;
  prevEngagedVisits: number;
  prevSubscribers: number;
  prevLabel: string;
}

export function buildTimeSeries({
  rangeParam,
  todayUtcStr,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  currentSubsGrouped,
  prevSubsGrouped,
  todayVisitorSessions,
  yesterdayVisitorSessions,
  currentDailyRecords,
  prevDailyRecords,
}: {
  rangeParam: "24h" | "7d" | "30d" | "90d";
  todayUtcStr: string;
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  currentSubsGrouped: Array<{ key: number | string; count: number }>;
  prevSubsGrouped: Array<{ key: number | string; count: number }>;
  todayVisitorSessions: Array<{ hour: number; visitors: number; views: number; engaged: number }>;
  yesterdayVisitorSessions: Array<{ hour: number; visitors: number; views: number; engaged: number }>;
  currentDailyRecords: Array<{ date: string; totalViews: number; uniqueVisitors: number; engagedVisits: number }>;
  prevDailyRecords: Array<{ date: string; totalViews: number; uniqueVisitors: number; engagedVisits: number }>;
}): TimeSeriesPoint[] {
  const currentSubsMap = new Map<number | string, number>();
  for (const s of currentSubsGrouped) {
    currentSubsMap.set(rangeParam === "24h" ? Number(s.key) : String(s.key), Number(s.count) || 0);
  }

  const prevSubsMap = new Map<number | string, number>();
  for (const s of prevSubsGrouped) {
    prevSubsMap.set(rangeParam === "24h" ? Number(s.key) : String(s.key), Number(s.count) || 0);
  }

  if (rangeParam === "24h") {
    const hourlyVisitorsMap = new Map<number, number>();
    const hourlyViewsMap = new Map<number, number>();
    const hourlyEngagedMap = new Map<number, number>();
    for (const s of todayVisitorSessions) {
      const h = Number(s.hour);
      hourlyVisitorsMap.set(h, Number(s.visitors) || 0);
      hourlyViewsMap.set(h, Number(s.views) || 0);
      hourlyEngagedMap.set(h, Number(s.engaged) || 0);
    }

    const yesterdayHourlyVisitorsMap = new Map<number, number>();
    const yesterdayHourlyViewsMap = new Map<number, number>();
    const yesterdayHourlyEngagedMap = new Map<number, number>();
    for (const s of yesterdayVisitorSessions) {
      const h = Number(s.hour);
      yesterdayHourlyVisitorsMap.set(h, Number(s.visitors) || 0);
      yesterdayHourlyViewsMap.set(h, Number(s.views) || 0);
      yesterdayHourlyEngagedMap.set(h, Number(s.engaged) || 0);
    }

    return Array.from({ length: 24 }, (_, hour) => {
      const sessionVisitors = hourlyVisitorsMap.get(hour) ?? 0;
      const sessionViews = hourlyViewsMap.get(hour) ?? 0;
      const sessionEngaged = hourlyEngagedMap.get(hour) ?? 0;

      const prevVisitors = yesterdayHourlyVisitorsMap.get(hour) ?? 0;
      const prevViews = yesterdayHourlyViewsMap.get(hour) ?? 0;
      const prevEngaged = yesterdayHourlyEngagedMap.get(hour) ?? 0;

      const subsAtHour = currentSubsMap.get(hour) ?? 0;
      const prevSubsAtHour = prevSubsMap.get(hour) ?? 0;

      const d = new Date(2026, 0, 1, hour);
      const hourLabel = format(d, "h a");

      return {
        date: `${todayUtcStr}T${hour.toString().padStart(2, "0")}:00:00Z`,
        label: hourLabel,
        totalViews: sessionViews,
        uniqueVisitors: sessionVisitors,
        engagedVisits: sessionEngaged,
        subscribers: subsAtHour,
        prevTotalViews: prevViews,
        prevUniqueVisitors: prevVisitors,
        prevEngagedVisits: prevEngaged,
        prevSubscribers: prevSubsAtHour,
        prevLabel: `Yesterday ${hourLabel}`,
      };
    });
  }

  const allDates = getDateRangeArray(startDate, endDate);
  const prevDates = getDateRangeArray(prevStartDate, prevEndDate);

  const dailyMap = new Map<string, (typeof currentDailyRecords)[0]>();
  for (const item of currentDailyRecords) {
    dailyMap.set(item.date, item);
  }

  const prevDailyMap = new Map<string, (typeof prevDailyRecords)[0]>();
  for (const item of prevDailyRecords) {
    prevDailyMap.set(item.date, item);
  }

  return allDates.map((dateStr, index) => {
    const match = dailyMap.get(dateStr);
    const prevDateStr = prevDates[index] || prevDates[prevDates.length - 1];
    const prevMatch = prevDailyMap.get(prevDateStr);

    const dateObj = new Date(dateStr + "T00:00:00Z");
    const prevDateObj = new Date(prevDateStr + "T00:00:00Z");

    const subsAtDay = currentSubsMap.get(dateStr) ?? 0;
    const prevSubsAtDay = prevSubsMap.get(prevDateStr) ?? 0;

    return {
      date: dateStr,
      label: format(dateObj, "MMM d"),
      totalViews: match?.totalViews ?? 0,
      uniqueVisitors: match?.uniqueVisitors ?? 0,
      engagedVisits: match?.engagedVisits ?? 0,
      subscribers: subsAtDay,
      prevTotalViews: prevMatch?.totalViews ?? 0,
      prevUniqueVisitors: prevMatch?.uniqueVisitors ?? 0,
      prevEngagedVisits: prevMatch?.engagedVisits ?? 0,
      prevSubscribers: prevSubsAtDay,
      prevLabel: format(prevDateObj, "MMM d"),
    };
  });
}

export function buildTopBreakdowns({
  totalViews,
  topBlogsGrouped,
  topPagesGrouped,
  topReferrersGrouped,
  topCampaignsGrouped,
  topCountriesGrouped,
}: {
  totalViews: number;
  topBlogsGrouped: Array<{ path: string; title: string | null; _sum: { views: number | null; uniqueVisitors: number | null } }>;
  topPagesGrouped: Array<{ path: string; title: string | null; _sum: { views: number | null; uniqueVisitors: number | null } }>;
  topReferrersGrouped: Array<{ source: string; _sum: { views: number | null } }>;
  topCampaignsGrouped: Array<{ utmCampaign: string; _sum: { views: number | null } }>;
  topCountriesGrouped: Array<{ countryCode: string; _sum: { views: number | null } }>;
}) {
  const maxBlogViews = topBlogsGrouped[0]?._sum?.views || 1;
  const topBlogs = topBlogsGrouped.slice(0, 8).map((item) => {
    const views = item._sum?.views ?? 0;
    return {
      path: item.path,
      title: item.title || item.path,
      views,
      uniqueVisitors: item._sum?.uniqueVisitors ?? 0,
      totalShare: totalViews > 0 ? Number(((views / totalViews) * 100).toFixed(1)) : 0,
      relativeScale: Math.min(100, Math.round((views / maxBlogViews) * 100)),
    };
  });

  const maxPageViews = topPagesGrouped[0]?._sum?.views || 1;
  const topPages = topPagesGrouped.slice(0, 8).map((item) => {
    const views = item._sum?.views ?? 0;
    return {
      path: item.path,
      title: item.title || item.path,
      views,
      uniqueVisitors: item._sum?.uniqueVisitors ?? 0,
      totalShare: totalViews > 0 ? Number(((views / totalViews) * 100).toFixed(1)) : 0,
      relativeScale: Math.min(100, Math.round((views / maxPageViews) * 100)),
    };
  });

  const maxReferrerViews = topReferrersGrouped[0]?._sum?.views || 1;
  const topReferrers = topReferrersGrouped.slice(0, 6).map((item) => {
    const views = item._sum?.views ?? 0;
    return {
      source: item.source,
      views,
      totalShare: totalViews > 0 ? Number(((views / totalViews) * 100).toFixed(1)) : 0,
      relativeScale: Math.min(100, Math.round((views / maxReferrerViews) * 100)),
    };
  });

  const maxCampaignViews = topCampaignsGrouped[0]?._sum?.views || 1;
  const topCampaigns = topCampaignsGrouped.slice(0, 6).map((item) => {
    const views = item._sum?.views ?? 0;
    return {
      campaign: item.utmCampaign,
      views,
      totalShare: totalViews > 0 ? Number(((views / totalViews) * 100).toFixed(1)) : 0,
      relativeScale: Math.min(100, Math.round((views / maxCampaignViews) * 100)),
    };
  });

  const maxCountryViews = topCountriesGrouped[0]?._sum?.views || 1;
  const topCountries = topCountriesGrouped.slice(0, 6).map((item) => {
    const views = item._sum?.views ?? 0;
    return {
      code: item.countryCode,
      flag: getCountryFlag(item.countryCode),
      views,
      totalShare: totalViews > 0 ? Number(((views / totalViews) * 100).toFixed(1)) : 0,
      relativeScale: Math.min(100, Math.round((views / maxCountryViews) * 100)),
    };
  });

  return { topBlogs, topPages, topReferrers, topCampaigns, topCountries };
}

export function buildLiveVisitors({
  recentLiveSessionsRaw,
  topBlogs,
  topPages,
}: {
  recentLiveSessionsRaw: Array<{
    visitorHash: string;
    lastPath: string | null;
    visitedPaths: string[];
    isEngaged: boolean;
    lastSeenAt: Date;
  }>;
  topBlogs: Array<{ path: string; title: string }>;
  topPages: Array<{ path: string; title: string }>;
}) {
  return recentLiveSessionsRaw.map((s, idx) => {
    const elapsedSecs = Math.max(2, Math.floor((Date.now() - s.lastSeenAt.getTime()) / 1000));
    const timeAgo =
      elapsedSecs < 60
        ? `${elapsedSecs}s ago`
        : elapsedSecs < 3600
        ? `${Math.floor(elapsedSecs / 60)}m ago`
        : `${Math.floor(elapsedSecs / 3600)}h ago`;

    const cleanPath = s.lastPath || "/";
    const matchedTitle =
      topBlogs.find((b) => b.path === cleanPath)?.title ||
      topPages.find((p) => p.path === cleanPath)?.title ||
      cleanPath;

    return {
      id: `visitor_${idx + 1}`,
      hashMask: `#${s.visitorHash.slice(-4).toUpperCase()}`,
      path: cleanPath,
      title: matchedTitle,
      pagesVisited: Math.max(1, s.visitedPaths?.length || 1),
      isEngaged: s.isEngaged,
      timeAgo,
      lastSeenAt: s.lastSeenAt.toISOString(),
    };
  });
}

export function buildExecutiveInsights({
  viewsTrend,
  totalViews,
  rangeParam,
  topBlogs,
  topReferrers,
  devices,
}: {
  viewsTrend: number | null;
  totalViews: number;
  rangeParam: string;
  topBlogs: Array<{ title: string; totalShare: number }>;
  topReferrers: Array<{ source: string; views: number; totalShare: number }>;
  devices: Array<{ name: string; value: number; percentage: number }>;
}) {
  const dominantDevice = [...devices].sort((a, b) => b.value - a.value)[0] || { name: "Desktop", percentage: 50 };
  const insights: Array<{ id: string; category: "growth" | "content" | "channel" | "audience"; text: string; highlight: string }> = [];

  if (viewsTrend !== null && viewsTrend > 0) {
    insights.push({
      id: "ins-growth",
      category: "growth",
      highlight: `+${viewsTrend}%`,
      text: `Traffic accelerated by +${viewsTrend}% vs previous ${rangeParam.toUpperCase()} period (${totalViews.toLocaleString()} views).`,
    });
  } else if (viewsTrend !== null && viewsTrend < 0) {
    insights.push({
      id: "ins-growth",
      category: "growth",
      highlight: `${viewsTrend}%`,
      text: `Readership decreased ${Math.abs(viewsTrend)}% compared to the prior timeframe.`,
    });
  } else {
    insights.push({
      id: "ins-growth",
      category: "growth",
      highlight: "Steady",
      text: `Traffic is holding steady with ${totalViews.toLocaleString()} total page impressions.`,
    });
  }

  if (topBlogs[0]) {
    insights.push({
      id: "ins-content",
      category: "content",
      highlight: `${topBlogs[0].totalShare}% share`,
      text: `"${topBlogs[0].title}" is your #1 driver, capturing ${topBlogs[0].totalShare}% of total reading volume.`,
    });
  }

  if (topReferrers[0]) {
    insights.push({
      id: "ins-channel",
      category: "channel",
      highlight: topReferrers[0].source,
      text: `${topReferrers[0].source} dominates acquisition with ${topReferrers[0].views.toLocaleString()} visits (${topReferrers[0].totalShare}% share).`,
    });
  }

  if (dominantDevice.percentage > 0) {
    insights.push({
      id: "ins-audience",
      category: "audience",
      highlight: `${dominantDevice.percentage}% ${dominantDevice.name}`,
      text: `${dominantDevice.name} is the primary reading environment (${dominantDevice.percentage}% of readers).`,
    });
  }

  return insights;
}
