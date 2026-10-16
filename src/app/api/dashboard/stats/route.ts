import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma, { mapDbToPageData } from "@/lib/prisma";
import { fetchWithMemoryCache } from "@/lib/server/memory-cache";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rangeParam = (searchParams.get("range") || "7d").toLowerCase();
    const daysCount = rangeParam === "24h" ? 1 : rangeParam === "30d" ? 30 : rangeParam === "90d" ? 90 : 7;

    const isUserAdmin = session.user.role === "ADMIN";
    const cacheKey = `dashboard-stats-v2:${rangeParam}:${isUserAdmin ? "admin" : "editor"}`;

    const stats = await fetchWithMemoryCache(
      cacheKey,
      async () => {
        const now = new Date();
        const todayUtcStr = now.toISOString().split("T")[0];

        // 1. Current Period Boundaries (UTC)
        const startDate = subDays(new Date(todayUtcStr + "T00:00:00Z"), daysCount - 1)
          .toISOString()
          .split("T")[0];
        const endDate = todayUtcStr;

        // 2. Previous Period Boundaries (for trends)
        const prevEndDate = subDays(new Date(startDate + "T00:00:00Z"), 1)
          .toISOString()
          .split("T")[0];
        const prevStartDate = subDays(new Date(prevEndDate + "T00:00:00Z"), daysCount - 1)
          .toISOString()
          .split("T")[0];

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        // 3. Parallel Queries
        const [
          publishedPagesCount,
          totalBlogsCount,
          totalCommentsCount,
          unapprovedCommentsCount,
          totalSubmissionsCount,
          unreadSubmissionsCount,
          subscribersCount,
          activeNowCount,
          currentDailyRecords,
          prevDailyRecords,
          pageRecords,
          referrerRecords,
          countryRecords,
          recentDraftBlogs,
          recentPagesRaw,
          todayVisitorSessions,
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
          prisma.analyticsVisitorSession.count({
            where: { lastSeenAt: { gte: fiveMinutesAgo } },
          }),
          prisma.analyticsDaily.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: { date: "asc" },
          }),
          prisma.analyticsDaily.findMany({
            where: { date: { gte: prevStartDate, lte: prevEndDate } },
          }),
          prisma.analyticsPage.findMany({
            where: { date: { gte: startDate, lte: endDate } },
          }),
          prisma.analyticsReferrer.findMany({
            where: { date: { gte: startDate, lte: endDate } },
          }),
          prisma.analyticsCountry.findMany({
            where: { date: { gte: startDate, lte: endDate } },
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
                  email: true,
                  profilePicture: true,
                },
              },
            },
            orderBy: { updatedAt: "desc" },
            take: 10,
          }),
          prisma.analyticsVisitorSession.findMany({
            where: {
              lastSeenAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
            select: { lastSeenAt: true, isEngaged: true },
          }),
        ]);

        // 4. Construct Zero-Filled Time Series Array
        let timeSeries: Array<{
          date: string;
          label: string;
          totalViews: number;
          uniqueVisitors: number;
          engagedVisits: number;
        }> = [];

        if (rangeParam === "24h") {
          const todayRecord = currentDailyRecords.find((r) => r.date === todayUtcStr);
          const totalViewsToday = todayRecord?.totalViews ?? 0;
          const totalVisitorsToday = todayRecord?.uniqueVisitors ?? 0;
          const totalEngagedToday = todayRecord?.engagedVisits ?? 0;

          const hourlyVisitorsMap = new Map<number, number>();
          const hourlyEngagedMap = new Map<number, number>();
          for (const s of todayVisitorSessions) {
            const h = new Date(s.lastSeenAt).getHours();
            hourlyVisitorsMap.set(h, (hourlyVisitorsMap.get(h) ?? 0) + 1);
            if (s.isEngaged) {
              hourlyEngagedMap.set(h, (hourlyEngagedMap.get(h) ?? 0) + 1);
            }
          }

          const activeHours = Array.from(hourlyVisitorsMap.keys());
          const fallbackHour = now.getHours();
          const targetHour = activeHours.length > 0 ? activeHours[0] : fallbackHour;

          timeSeries = Array.from({ length: 24 }, (_, hour) => {
            const sessionVisitors = hourlyVisitorsMap.get(hour) ?? 0;
            const sessionEngaged = hourlyEngagedMap.get(hour) ?? 0;

            let views = sessionVisitors;
            let visitors = sessionVisitors;
            let engaged = sessionEngaged;

            if (activeHours.length <= 1 && hour === targetHour) {
              views = Math.max(views, totalViewsToday);
              visitors = Math.max(visitors, totalVisitorsToday);
              engaged = Math.max(engaged, totalEngagedToday);
            }

            const d = new Date();
            d.setHours(hour, 0, 0, 0);
            const hourLabel = format(d, "h a");

            return {
              date: `${todayUtcStr}T${hour.toString().padStart(2, "0")}:00:00`,
              label: hourLabel,
              totalViews: views,
              uniqueVisitors: visitors,
              engagedVisits: engaged,
            };
          });
        } else {
          const allDates = getDateRangeArray(startDate, endDate);
          const dailyMap = new Map<string, (typeof currentDailyRecords)[0]>();
          for (const item of currentDailyRecords) {
            dailyMap.set(item.date, item);
          }

          timeSeries = allDates.map((dateStr) => {
            const match = dailyMap.get(dateStr);
            const dateObj = new Date(dateStr + "T00:00:00Z");
            return {
              date: dateStr,
              label: format(dateObj, "MMM d"),
              totalViews: match?.totalViews ?? 0,
              uniqueVisitors: match?.uniqueVisitors ?? 0,
              engagedVisits: match?.engagedVisits ?? 0,
            };
          });
        }

        // 5. Aggregate Current Period Totals
        let totalViews = 0;
        let uniqueVisitors = 0;
        let engagedVisits = 0;
        let desktopViews = 0;
        let mobileViews = 0;
        let tabletViews = 0;

        for (const rec of currentDailyRecords) {
          totalViews += rec.totalViews;
          uniqueVisitors += rec.uniqueVisitors;
          engagedVisits += rec.engagedVisits;
          desktopViews += rec.desktopViews;
          mobileViews += rec.mobileViews;
          tabletViews += rec.tabletViews;
        }

        const engagementRate = totalViews > 0 ? Math.round((engagedVisits / totalViews) * 100) : 0;

        // 6. Aggregate Previous Period Totals
        let prevTotalViews = 0;
        let prevUniqueVisitors = 0;
        let prevEngagedVisits = 0;

        for (const rec of prevDailyRecords) {
          prevTotalViews += rec.totalViews;
          prevUniqueVisitors += rec.uniqueVisitors;
          prevEngagedVisits += rec.engagedVisits;
        }

        const prevEngagementRate = prevTotalViews > 0 ? Math.round((prevEngagedVisits / prevTotalViews) * 100) : 0;

        // 7. Calculate Trends
        const viewsTrend = calculateTrend(totalViews, prevTotalViews);
        const visitorsTrend = calculateTrend(uniqueVisitors, prevUniqueVisitors);
        const engagementRateTrend = calculateTrend(engagementRate, prevEngagementRate);

        // 8. Device Split
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

        // 9. Aggregate Top Content (Blogs vs Pages)
        const blogsAggMap = new Map<string, { title: string; path: string; views: number }>();
        const pagesAggMap = new Map<string, { title: string; path: string; views: number }>();

        for (const row of pageRecords) {
          const isBlog = row.resourceType === "blog" || row.path.startsWith("/blogs/") || row.path.startsWith("/blog/");
          const targetMap = isBlog ? blogsAggMap : pagesAggMap;
          const existing = targetMap.get(row.path);

          if (existing) {
            existing.views += row.views;
            if (row.title && existing.title === existing.path) {
              existing.title = row.title;
            }
          } else {
            targetMap.set(row.path, {
              title: row.title || row.path,
              path: row.path,
              views: row.views,
            });
          }
        }

        const sortedBlogs = Array.from(blogsAggMap.values()).sort((a, b) => b.views - a.views);
        const maxBlogViews = sortedBlogs[0]?.views || 1;
        const topBlogs = sortedBlogs.slice(0, 6).map((item) => ({
          ...item,
          percentShare: Math.min(100, Math.round((item.views / maxBlogViews) * 100)),
        }));

        const sortedPages = Array.from(pagesAggMap.values()).sort((a, b) => b.views - a.views);
        const maxPageViews = sortedPages[0]?.views || 1;
        const topPages = sortedPages.slice(0, 6).map((item) => ({
          ...item,
          percentShare: Math.min(100, Math.round((item.views / maxPageViews) * 100)),
        }));

        // 10. Aggregate Referrers & Campaigns
        const referrerMap = new Map<string, number>();
        const campaignMap = new Map<string, number>();

        for (const row of referrerRecords) {
          referrerMap.set(row.source, (referrerMap.get(row.source) || 0) + row.views);
          if (row.utmCampaign && row.utmCampaign.length > 0) {
            campaignMap.set(row.utmCampaign, (campaignMap.get(row.utmCampaign) || 0) + row.views);
          }
        }

        const sortedReferrers = Array.from(referrerMap.entries())
          .map(([source, views]) => ({ source, views }))
          .sort((a, b) => b.views - a.views);
        const maxReferrerViews = sortedReferrers[0]?.views || 1;
        const topReferrers = sortedReferrers.slice(0, 6).map((r) => ({
          ...r,
          percentShare: Math.min(100, Math.round((r.views / maxReferrerViews) * 100)),
        }));

        const sortedCampaigns = Array.from(campaignMap.entries())
          .map(([campaign, views]) => ({ campaign, views }))
          .sort((a, b) => b.views - a.views);
        const maxCampaignViews = sortedCampaigns[0]?.views || 1;
        const topCampaigns = sortedCampaigns.slice(0, 6).map((c) => ({
          ...c,
          percentShare: Math.min(100, Math.round((c.views / maxCampaignViews) * 100)),
        }));

        // 11. Aggregate Countries
        const countryMap = new Map<string, number>();
        for (const row of countryRecords) {
          countryMap.set(row.countryCode, (countryMap.get(row.countryCode) || 0) + row.views);
        }

        const sortedCountries = Array.from(countryMap.entries())
          .map(([code, views]) => ({
            code,
            flag: getCountryFlag(code),
            views,
          }))
          .sort((a, b) => b.views - a.views);
        const maxCountryViews = sortedCountries[0]?.views || 1;
        const topCountries = sortedCountries.slice(0, 6).map((c) => ({
          ...c,
          percentShare: Math.min(100, Math.round((c.views / maxCountryViews) * 100)),
        }));

        const recentPages = recentPagesRaw.map(mapDbToPageData);

        return {
          range: rangeParam,
          summary: {
            totalViews,
            viewsTrend,
            uniqueVisitors,
            visitorsTrend,
            engagementRate,
            engagementRateTrend,
            subscribersCount,
            publishedPagesCount,
            totalBlogsCount,
            activeNow: activeNowCount,
          },
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
  } catch (error: any) {
    console.error("Dashboard stats fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard stats", error: error.message },
      { status: 500 }
    );
  }
}
