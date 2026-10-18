import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma, { mapDbToPageData } from "@/lib/prisma";
import { fetchWithMemoryCache } from "@/lib/server/memory-cache";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

const ALLOWED_RANGES = ["24h", "7d", "30d", "90d"] as const;
type DashboardRange = (typeof ALLOWED_RANGES)[number];

function calculateTrend(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? null : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function getCountryFlag(countryCode: string): string {
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

function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr + "T00:00:00Z");
  const end = new Date(endDateStr + "T00:00:00Z");
  while (curr <= end) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export async function GET(request: Request) {
  try {
    // 1. Strict Authentication & User ID Verification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Strict Range Parameter Whitelisting (prevents cache poisoning / pollution)
    const { searchParams } = new URL(request.url);
    const rawRange = (searchParams.get("range") || "7d").toLowerCase();
    if (!ALLOWED_RANGES.includes(rawRange as DashboardRange)) {
      return NextResponse.json(
        { message: "Invalid range parameter. Supported ranges: 24h, 7d, 30d, 90d" },
        { status: 400 }
      );
    }
    const rangeParam = rawRange as DashboardRange;
    const daysCount = rangeParam === "24h" ? 1 : rangeParam === "30d" ? 30 : rangeParam === "90d" ? 90 : 7;

    const isUserAdmin = session.user.role === "ADMIN";
    const cacheKey = `dashboard-stats-v6:${rangeParam}:${isUserAdmin ? "admin" : "editor"}`;

    const stats = await fetchWithMemoryCache(
      cacheKey,
      async () => {
        const now = new Date();
        const todayUtcStr = now.toISOString().split("T")[0];

        // 3. Current Period Boundaries (Inclusive start, exclusive end for zero microsecond edge loss)
        const startDate = subDays(new Date(todayUtcStr + "T00:00:00Z"), daysCount - 1)
          .toISOString()
          .split("T")[0];
        const endDate = todayUtcStr;

        const startOfPeriod = new Date(startDate + "T00:00:00.000Z");
        const startOfNextDay = new Date(new Date(endDate + "T00:00:00.000Z").getTime() + 24 * 60 * 60 * 1000);

        // 4. Previous Period Boundaries (for genuine comparison)
        const prevEndDate = subDays(new Date(startDate + "T00:00:00Z"), 1)
          .toISOString()
          .split("T")[0];
        const prevStartDate = subDays(new Date(prevEndDate + "T00:00:00Z"), daysCount - 1)
          .toISOString()
          .split("T")[0];

        const startOfPrevPeriod = new Date(prevStartDate + "T00:00:00.000Z");
        const startOfNextPrevDay = new Date(new Date(prevEndDate + "T00:00:00.000Z").getTime() + 24 * 60 * 60 * 1000);

        // Active window for live sessions: visitors active in the last 15 minutes
        const activeNowThreshold = new Date(Date.now() - 5 * 60 * 1000);
        const liveStreamThreshold = new Date(Date.now() - 15 * 60 * 1000);

        // =========================================================================
        // QUERY BLOCK 1: Fast Aggregate Counts & Recent Editorial Fetch
        // (Mitigates DB connection pool exhaustion by bounding concurrency)
        // =========================================================================
        const [
          publishedPagesCount,
          totalBlogsCount,
          totalCommentsCount,
          unapprovedCommentsCount,
          totalSubmissionsCount,
          unreadSubmissionsCount,
          subscribersCount,
          currentPeriodSubsCount,
          prevPeriodSubsCount,
          activeNowCount,
          recentDraftBlogs,
          recentPagesRaw,
          currentPeriodSubmissionsCount,
        ] = await Promise.all([
          prisma.page.count({ where: { isTrashed: false, status: "published" } }),
          prisma.blog.count({ where: { isTrashed: false } }),
          isUserAdmin
            ? prisma.comment.count({ where: { isTrashed: false, parentId: null } })
            : Promise.resolve(0),
          isUserAdmin
            ? prisma.comment.count({ where: { isTrashed: false, isApproved: false } })
            : Promise.resolve(0),
          isUserAdmin
            ? prisma.formSubmission.count({ where: { isTrashed: false } })
            : Promise.resolve(0),
          isUserAdmin
            ? prisma.formSubmission.count({ where: { isTrashed: false, isRead: false } })
            : Promise.resolve(0),
          prisma.subscriber.count({ where: { status: "active" } }),
          // Real subscriber signups in current period (indexed count for O(1) memory)
          prisma.subscriber.count({
            where: {
              status: "active",
              createdAt: {
                gte: startOfPeriod,
                lt: startOfNextDay,
              },
            },
          }),
          // Real subscriber signups in previous period
          prisma.subscriber.count({
            where: {
              status: "active",
              createdAt: {
                gte: startOfPrevPeriod,
                lt: startOfNextPrevDay,
              },
            },
          }),
          prisma.analyticsVisitorSession.count({
            where: { lastSeenAt: { gte: activeNowThreshold } },
          }),
          prisma.blog.findMany({
            where: { isTrashed: false, status: { in: ["draft", "scheduled"] } },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              scheduledAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
          }),
          prisma.page.findMany({
            where: { isTrashed: false },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              isTrashed: true,
              createdAt: true,
              updatedAt: true,
              seo: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  profilePicture: true,
                },
              },
            },
            orderBy: { updatedAt: "desc" },
            take: 10,
          }),
          isUserAdmin
            ? prisma.formSubmission.count({
                where: {
                  isTrashed: false,
                  createdAt: {
                    gte: startOfPeriod,
                    lt: startOfNextDay,
                  },
                },
              })
            : Promise.resolve(0),
        ]);

        const subscribersTrend = calculateTrend(currentPeriodSubsCount, prevPeriodSubsCount);

        // =========================================================================
        // QUERY BLOCK 2: Analytics Time Series & Database GroupBy Aggregations
        // (Postgres calculates sums and array cardinality directly in C)
        // =========================================================================
        const currentSubsGroupedQuery =
          rangeParam === "24h"
            ? prisma.$queryRaw<Array<{ key: number; count: number }>>`
                SELECT 
                  EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC')::int AS key,
                  COUNT(*)::int AS count
                FROM "Subscriber"
                WHERE status::text = 'active'
                  AND "createdAt" >= ${startOfPeriod}
                  AND "createdAt" < ${startOfNextDay}
                GROUP BY 1
              `
            : prisma.$queryRaw<Array<{ key: string; count: number }>>`
                SELECT 
                  TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS key,
                  COUNT(*)::int AS count
                FROM "Subscriber"
                WHERE status::text = 'active'
                  AND "createdAt" >= ${startOfPeriod}
                  AND "createdAt" < ${startOfNextDay}
                GROUP BY 1
              `;

        const prevSubsGroupedQuery =
          rangeParam === "24h"
            ? prisma.$queryRaw<Array<{ key: number; count: number }>>`
                SELECT 
                  EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC')::int AS key,
                  COUNT(*)::int AS count
                FROM "Subscriber"
                WHERE status::text = 'active'
                  AND "createdAt" >= ${startOfPrevPeriod}
                  AND "createdAt" < ${startOfNextPrevDay}
                GROUP BY 1
              `
            : prisma.$queryRaw<Array<{ key: string; count: number }>>`
                SELECT 
                  TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS key,
                  COUNT(*)::int AS count
                FROM "Subscriber"
                WHERE status::text = 'active'
                  AND "createdAt" >= ${startOfPrevPeriod}
                  AND "createdAt" < ${startOfNextPrevDay}
                GROUP BY 1
              `;

        const [
          currentDailyRecords,
          prevDailyRecords,
          todayVisitorSessions,
          yesterdayVisitorSessions,
          currentSubsGrouped,
          prevSubsGrouped,
          recentLiveSessionsRaw,
          topBlogsGrouped,
          topPagesGrouped,
          topReferrersGrouped,
          topCampaignsGrouped,
          topCountriesGrouped,
        ] = await Promise.all([
          prisma.analyticsDaily.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: { date: "asc" },
          }),
          prisma.analyticsDaily.findMany({
            where: { date: { gte: prevStartDate, lte: prevEndDate } },
            orderBy: { date: "asc" },
          }),
          // Accurate 24h query: views computed from session visitedPaths cardinality
          rangeParam === "24h"
            ? prisma.$queryRaw<Array<{ hour: number; visitors: number; views: number; engaged: number }>>`
                SELECT 
                  EXTRACT(HOUR FROM "lastSeenAt")::int AS hour,
                  COUNT(*)::int AS visitors,
                  COALESCE(SUM(GREATEST(cardinality("visitedPaths"), 1)), COUNT(*))::int AS views,
                  COUNT(*) FILTER (WHERE "isEngaged" = true)::int AS engaged
                FROM "AnalyticsVisitorSession"
                WHERE "lastSeenAt" >= ${new Date(todayUtcStr + "T00:00:00Z")}
                  AND "lastSeenAt" < ${startOfNextDay}
                GROUP BY 1
              `
            : Promise.resolve([]),
          rangeParam === "24h"
            ? prisma.$queryRaw<Array<{ hour: number; visitors: number; views: number; engaged: number }>>`
                SELECT 
                  EXTRACT(HOUR FROM "lastSeenAt")::int AS hour,
                  COUNT(*)::int AS visitors,
                  COALESCE(SUM(GREATEST(cardinality("visitedPaths"), 1)), COUNT(*))::int AS views,
                  COUNT(*) FILTER (WHERE "isEngaged" = true)::int AS engaged
                FROM "AnalyticsVisitorSession"
                WHERE "lastSeenAt" >= ${new Date(prevEndDate + "T00:00:00Z")}
                  AND "lastSeenAt" < ${new Date(startDate + "T00:00:00Z")}
                GROUP BY 1
              `
            : Promise.resolve([]),
          currentSubsGroupedQuery,
          prevSubsGroupedQuery,
          // Filter live sessions strictly to active visitors in the last 15m
          prisma.analyticsVisitorSession.findMany({
            where: { lastSeenAt: { gte: liveStreamThreshold } },
            orderBy: { lastSeenAt: "desc" },
            take: 8,
            select: {
              visitorHash: true,
              lastPath: true,
              visitedPaths: true,
              isEngaged: true,
              lastSeenAt: true,
            },
          }),
          prisma.analyticsPage.groupBy({
            by: ["path", "title"],
            where: {
              date: { gte: startDate, lte: endDate },
              OR: [
                { resourceType: "blog" },
                { path: { startsWith: "/blogs/" } },
                { path: { startsWith: "/blog/" } },
              ],
            },
            _sum: { views: true, uniqueVisitors: true },
            orderBy: { _sum: { views: "desc" } },
            take: 12,
          }),
          prisma.analyticsPage.groupBy({
            by: ["path", "title"],
            where: {
              date: { gte: startDate, lte: endDate },
              NOT: [
                { resourceType: "blog" },
                { path: { startsWith: "/blogs/" } },
                { path: { startsWith: "/blog/" } },
              ],
            },
            _sum: { views: true, uniqueVisitors: true },
            orderBy: { _sum: { views: "desc" } },
            take: 12,
          }),
          prisma.analyticsReferrer.groupBy({
            by: ["source"],
            where: { date: { gte: startDate, lte: endDate } },
            _sum: { views: true },
            orderBy: { _sum: { views: "desc" } },
            take: 10,
          }),
          prisma.analyticsReferrer.groupBy({
            by: ["utmCampaign"],
            where: {
              date: { gte: startDate, lte: endDate },
              utmCampaign: { not: "" },
            },
            _sum: { views: true },
            orderBy: { _sum: { views: "desc" } },
            take: 10,
          }),
          prisma.analyticsCountry.groupBy({
            by: ["countryCode"],
            where: { date: { gte: startDate, lte: endDate } },
            _sum: { views: true },
            orderBy: { _sum: { views: "desc" } },
            take: 10,
          }),
        ]);

        // =========================================================================
        // 5. Aggregate Current & Previous Period Totals (Unit-Consistent Math)
        // =========================================================================
        let totalViews = 0;
        let dailyUniquesSum = 0;
        let engagedVisits = 0;
        let desktopViews = 0;
        let mobileViews = 0;
        let tabletViews = 0;

        for (const rec of currentDailyRecords) {
          totalViews += rec.totalViews;
          dailyUniquesSum += rec.uniqueVisitors;
          engagedVisits += rec.engagedVisits;
          desktopViews += rec.desktopViews;
          mobileViews += rec.mobileViews;
          tabletViews += rec.tabletViews;
        }

        let prevTotalViews = 0;
        let prevDailyUniquesSum = 0;
        let prevEngagedVisits = 0;

        for (const rec of prevDailyRecords) {
          prevTotalViews += rec.totalViews;
          prevDailyUniquesSum += rec.uniqueVisitors;
          prevEngagedVisits += rec.engagedVisits;
        }

        // Consistent units: engaged sessions divided by total unique sessions
        const engagementRate = dailyUniquesSum > 0 ? Math.min(100, Math.round((engagedVisits / dailyUniquesSum) * 100)) : 0;
        const prevEngagementRate = prevDailyUniquesSum > 0 ? Math.min(100, Math.round((prevEngagedVisits / prevDailyUniquesSum) * 100)) : 0;

        // Bounce rate is the genuine complement of session engagement
        const bounceRate = Math.max(0, 100 - engagementRate);
        const prevBounceRate = Math.max(0, 100 - prevEngagementRate);

        const viewsTrend = calculateTrend(totalViews, prevTotalViews);
        const visitorsTrend = calculateTrend(dailyUniquesSum, prevDailyUniquesSum);
        const engagementRateTrend = calculateTrend(engagementRate, prevEngagementRate);
        const bounceRateTrend = calculateTrend(bounceRate, prevBounceRate);

        const pagesPerVisit = dailyUniquesSum > 0 ? Number((totalViews / dailyUniquesSum).toFixed(2)) : 1.0;
        const prevPagesPerVisit = prevDailyUniquesSum > 0 ? Number((prevTotalViews / prevDailyUniquesSum).toFixed(2)) : 1.0;
        const pagesPerVisitTrend = calculateTrend(pagesPerVisit, prevPagesPerVisit);

        // =========================================================================
        // 6. Zero-Filled Time Series Array (100% Measured Data, Zero Fake Multipliers)
        // =========================================================================
        let timeSeries: Array<{
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
        }> = [];

        const currentSubsMap = new Map<number | string, number>();
        for (const s of currentSubsGrouped as Array<{ key: number | string; count: number }>) {
          currentSubsMap.set(rangeParam === "24h" ? Number(s.key) : String(s.key), Number(s.count) || 0);
        }

        const prevSubsMap = new Map<number | string, number>();
        for (const s of prevSubsGrouped as Array<{ key: number | string; count: number }>) {
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

          timeSeries = Array.from({ length: 24 }, (_, hour) => {
            const sessionVisitors = hourlyVisitorsMap.get(hour) ?? 0;
            const sessionViews = hourlyViewsMap.get(hour) ?? 0;
            const sessionEngaged = hourlyEngagedMap.get(hour) ?? 0;

            const prevVisitors = yesterdayHourlyVisitorsMap.get(hour) ?? 0;
            const prevViews = yesterdayHourlyViewsMap.get(hour) ?? 0;
            const prevEngaged = yesterdayHourlyEngagedMap.get(hour) ?? 0;

            // Actual subscriber signups during this specific hour (O(1) Map lookup)
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
        } else {
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

          timeSeries = allDates.map((dateStr, index) => {
            const match = dailyMap.get(dateStr);
            const prevDateStr = prevDates[index] || prevDates[prevDates.length - 1];
            const prevMatch = prevDailyMap.get(prevDateStr);

            const dateObj = new Date(dateStr + "T00:00:00Z");
            const prevDateObj = new Date(prevDateStr + "T00:00:00Z");

            // Actual subscriber signups on this specific calendar date (O(1) Map lookup)
            const subsAtDay = currentSubsMap.get(dateStr) ?? 0;
            const prevSubsAtDay = prevSubsMap.get(prevDateStr) ?? 0;

            return {
              date: dateStr,
              label: format(dateObj, "MMM d"),
              totalViews: match?.totalViews ?? 0,
              uniqueVisitors: match?.uniqueVisitors ?? 0,
              engagedVisits: match?.engagedVisits ?? 0,
              subscribers: subsAtDay, // Real measured daily signups!
              prevTotalViews: prevMatch?.totalViews ?? 0,
              prevUniqueVisitors: prevMatch?.uniqueVisitors ?? 0,
              prevEngagedVisits: prevMatch?.engagedVisits ?? 0,
              prevSubscribers: prevSubsAtDay, // Real measured previous daily signups!
              prevLabel: format(prevDateObj, "MMM d"),
            };
          });
        }

        // =========================================================================
        // 7. Audience Conversion Funnel (Consistent Session Population)
        // =========================================================================
        const totalConversions = currentPeriodSubsCount + currentPeriodSubmissionsCount;
        const funnelRetentionRate = dailyUniquesSum > 0 ? Math.min(100, Math.round((engagedVisits / dailyUniquesSum) * 100)) : 0;
        const funnelConversionRate = dailyUniquesSum > 0 ? Number(((totalConversions / dailyUniquesSum) * 100).toFixed(2)) : 0;
        const dropOffVisitorsToEngaged = Math.max(0, 100 - funnelRetentionRate);

        // =========================================================================
        // 8. Device Split
        // =========================================================================
        const totalDeviceViews = desktopViews + mobileViews + tabletViews;
        const devices = [
          {
            name: "Desktop",
            value: desktopViews,
            percentage: totalDeviceViews > 0 ? Math.round((desktopViews / totalDeviceViews) * 100) : 0,
            fill: "var(--color-desktop, #3b82f6)",
          },
          {
            name: "Mobile",
            value: mobileViews,
            percentage: totalDeviceViews > 0 ? Math.round((mobileViews / totalDeviceViews) * 100) : 0,
            fill: "var(--color-mobile, #10b981)",
          },
          {
            name: "Tablet",
            value: tabletViews,
            percentage: totalDeviceViews > 0 ? Math.round((tabletViews / totalDeviceViews) * 100) : 0,
            fill: "var(--color-tablet, #8b5cf6)",
          },
        ];

        // =========================================================================
        // 9. Top Content & Acquisition Channels (With Total Share & Relative Scale)
        // =========================================================================
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

        // =========================================================================
        // 10. Live Visitor Activity (Strictly Filtered to Active Sessions in Last 15m)
        // =========================================================================
        const liveVisitors = recentLiveSessionsRaw.map((s, idx) => {
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

        // =========================================================================
        // 11. Dynamic Executive Intelligence Insights
        // =========================================================================
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

        // =========================================================================
        // 12. Micro-Sparklines Payload for KPI Cards
        // =========================================================================
        const sparklines = {
          views: timeSeries.map((t) => t.totalViews),
          visitors: timeSeries.map((t) => t.uniqueVisitors),
          engagement: timeSeries.map((t) => t.engagedVisits),
          subscribers: timeSeries.map((t) => t.subscribers),
        };

        const recentPages = recentPagesRaw.map(mapDbToPageData);

        return {
          range: rangeParam,
          summary: {
            totalViews,
            viewsTrend,
            uniqueVisitors: dailyUniquesSum,
            visitorsTrend,
            engagementRate,
            engagementRateTrend,
            subscribersCount,
            subscribersTrend,
            currentPeriodSubsCount,
            publishedPagesCount,
            totalBlogsCount,
            activeNow: activeNowCount,
            // Reading Depth & Efficiency
            pagesPerVisit,
            pagesPerVisitTrend,
            bounceRate,
            bounceRateTrend,
            engagedVisitsCount: engagedVisits,
          },
          funnel: {
            visitors: dailyUniquesSum,
            engaged: engagedVisits,
            conversions: totalConversions,
            retentionRate: funnelRetentionRate,
            conversionRate: funnelConversionRate,
            dropOffVisitorsToEngaged,
            subscribersGained: currentPeriodSubsCount,
            submissionsGained: currentPeriodSubmissionsCount,
          },
          insights,
          sparklines,
          liveVisitors,
          timeSeries,
          devices,
          topContent: {
            blogs: topBlogs,
            pages: topPages,
          },
          acquisition: {
            referrers: topReferrers,
            campaigns: topCampaigns,
            countries: topCountries,
          },
          editorial: {
            recentDraftBlogs,
            recentPages,
          },
          // Legacy Compatibility
          publishedPagesCount,
          totalBlogsCount,
          totalCommentsCount,
          unapprovedCommentsCount,
          totalSubmissionsCount,
          unreadSubmissionsCount,
          recentPages,
        };
      },
      10000 // 10s TTL
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard stats fetch error:", error);
    // Secure generic 500 error response (no internal stack trace or DB details leaked)
    return NextResponse.json(
      { message: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}