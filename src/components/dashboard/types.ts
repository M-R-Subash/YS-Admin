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

export interface SummaryData {
  totalViews: number;
  viewsTrend: number | null;
  uniqueVisitors: number;
  visitorsTrend: number | null;
  engagementRate: number;
  engagementRateTrend: number | null;
  subscribersCount: number;
  subscribersTrend: number | null;
  currentPeriodSubsCount: number;
  publishedPagesCount: number;
  totalBlogsCount: number;
  activeNow: number;
  pagesPerVisit: number;
  pagesPerVisitTrend: number | null;
  bounceRate: number;
  bounceRateTrend: number | null;
  engagedVisitsCount: number;
}

export interface FunnelData {
  visitors: number;
  engaged: number;
  conversions: number;
  retentionRate: number;
  conversionRate: number;
  dropOffVisitorsToEngaged: number;
  subscribersGained: number;
  submissionsGained: number;
}

export interface InsightItem {
  id: string;
  category: "growth" | "content" | "channel" | "audience";
  highlight: string;
  text: string;
}

export interface SparklinesData {
  views?: number[];
  visitors?: number[];
  engagement?: number[];
  subscribers?: number[];
}

export interface DeviceData {
  name: string;
  value: number;
  percentage: number;
  fill: string;
}

export interface ContentItem {
  path: string;
  title: string;
  views: number;
  uniqueVisitors?: number;
  totalShare?: number;
  relativeScale?: number;
  percentShare?: number;
}

export interface ChannelItem {
  source?: string;
  campaign?: string;
  views: number;
  totalShare?: number;
  relativeScale?: number;
  percentShare?: number;
}

export interface CountryItem {
  code: string;
  flag: string;
  views: number;
  totalShare?: number;
  relativeScale?: number;
  percentShare?: number;
}

export interface LiveVisitorItem {
  id: string;
  visitorHash: string;
  hashMask: string;
  title: string;
  path: string;
  isEngaged: boolean;
  pagesVisited: number;
  timeAgo: string;
  lastSeenAt: string;
}

export interface RecentDraftBlog {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduledAt: string | null;
  updatedAt: string;
}

export interface DashboardStatsResponse {
  range: "24h" | "7d" | "30d" | "90d";
  summary: SummaryData;
  funnel: FunnelData;
  insights: InsightItem[];
  sparklines: SparklinesData;
  liveVisitors: LiveVisitorItem[];
  timeSeries: TimeSeriesPoint[];
  devices: DeviceData[];
  topContent: {
    blogs: ContentItem[];
    pages: ContentItem[];
  };
  acquisition: {
    referrers: ChannelItem[];
    campaigns: ChannelItem[];
    countries: CountryItem[];
  };
  editorial: {
    recentDraftBlogs: RecentDraftBlog[];
    recentPages: any[];
  };
  unreadSubmissionsCount?: number;
  unapprovedCommentsCount?: number;
}
