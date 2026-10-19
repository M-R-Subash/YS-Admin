"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Search,
  Filter,
  Download,
  Shield,
  KeyRound,
  FileText,
  RefreshCw,
  Clock,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { formatDistanceToNow, format } from "date-fns";

export interface AuditLogItem {
  id: string;
  eventType: string;
  category: "AUTH" | "CONTENT" | "SECURITY" | "USER" | "MEDIA";
  action: string;
  actor: {
    name: string;
    email: string;
    avatar?: string;
    role: "ADMIN" | "EDITOR";
  };
  target: string;
  ipAddress: string;
  status: "SUCCESS" | "WARNING" | "FAILED";
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuditLogsResponse {
  logs: AuditLogItem[];
  total: number;
  stats: {
    totalEvents: number;
    securityEvents: number;
    contentEvents: number;
    retentionDays: number;
  };
}

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live PostgreSQL Audit Log query via API
  const apiUrl = isAdmin
    ? `/api/audit-logs?category=${selectedCategory}&search=${encodeURIComponent(searchQuery)}`
    : null;

  const { data, mutate, isLoading } = useSWR<AuditLogsResponse>(apiUrl, {
    revalidateOnFocus: true,
    dedupingInterval: 2500,
  });

  const logs = data?.logs || [];
  const stats = data?.stats || {
    totalEvents: logs.length,
    securityEvents: 0,
    contentEvents: 0,
    retentionDays: 90,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      "Event ID",
      "Timestamp",
      "Category",
      "Event Type",
      "Action",
      "Actor Name",
      "Actor Email",
      "Target",
      "IP Address",
      "Status",
    ];

    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.category,
      l.eventType,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.actor.name}"`,
      l.actor.email,
      `"${l.target.replace(/"/g, '""')}"`,
      l.ipAddress,
      l.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <AdminTopBar
        breadcrumbs={[
          { label: "Account Settings", href: "/account" },
          { label: "Audit Logs" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5 w-full max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                Audit Logs & Activity Trail
              </h2>
              <Badge
                variant="outline"
                className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
              >
                PostgreSQL Live Stream
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Trace administrative actions, authentication milestones, and content modifications across the CMS.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <RefreshCw
                className={`size-3.5 ${
                  isRefreshing || isLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Admin Access Check */}
        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex items-start gap-4">
            <Lock className="size-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Administrator Permission Required
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Company-wide audit logs and administrative traces are only visible to accounts with the <strong className="text-foreground">ADMIN</strong> role. As an Editor, you can manage your personal profile and passwords using the sub-navigation above.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Events</span>
                  <Layers className="size-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.totalEvents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Events captured in database trail
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Security Events</span>
                  <KeyRound className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.securityEvents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Logins, token refreshes, and credentials
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Content Edits</span>
                  <FileText className="size-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.contentEvents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Page and blog article mutations
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider">Retention</span>
                  <Shield className="size-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {stats.retentionDays} Days
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tamper-resistant audit archive
                </p>
              </div>
            </div>

            {/* Filters Toolbar */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by event, action, actor, target or IP address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9.5 text-xs bg-background/50"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
                    <Filter className="size-3" />
                    Filter:
                  </span>
                  {["ALL", "AUTH", "CONTENT", "SECURITY", "USER"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat
                          ? "bg-foreground text-background font-bold shadow-2xs"
                          : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {cat === "ALL" ? "All Categories" : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audit Log Data Table */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action & Context</th>
                      <th className="py-3 px-4">Client IP</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isLoading && logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground space-y-2">
                          <Loader2 className="size-6 mx-auto animate-spin text-primary" />
                          <p className="text-xs font-medium">Loading audit logs from database...</p>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground space-y-2">
                          <Layers className="size-8 mx-auto opacity-40 text-muted-foreground" />
                          <p className="text-sm font-semibold">No audit events match your search criteria</p>
                          <p className="text-xs">Try adjusting your category filter or search query.</p>
                        </td>
                      </tr>
                    ) : (
                      logs.map((item) => {
                        const date = new Date(item.timestamp);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            {/* Event Type & Category Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="font-mono font-bold text-foreground text-[11px]">
                                  {item.eventType}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`w-fit text-[9px] uppercase tracking-wider py-0 px-1.5 font-bold rounded-xs ${
                                    item.category === "SECURITY"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                      : item.category === "CONTENT"
                                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                      : item.category === "AUTH"
                                      ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  }`}
                                >
                                  {item.category}
                                </Badge>
                              </div>
                            </td>

                            {/* Actor Details */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-7 border border-border">
                                  {item.actor.avatar && (
                                    <AvatarImage src={item.actor.avatar} alt={item.actor.name} />
                                  )}
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {item.actor.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground text-xs">
                                    {item.actor.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.actor.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Action & Context */}
                            <td className="py-3.5 px-4 min-w-[260px]">
                              <p className="font-medium text-foreground text-xs">
                                {item.action}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                                Target: {item.target}
                              </p>
                            </td>

                            {/* Client IP */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Globe className="size-3 text-muted-foreground/70" />
                                <span>{item.ipAddress}</span>
                              </div>
                            </td>

                            {/* Timestamp */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {formatDistanceToNow(date, { addSuffix: true })}
                                </span>
                                <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                                  <Clock className="size-2.5" />
                                  {format(date, "MMM d, HH:mm:ss")}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {item.status === "SUCCESS" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="size-2.5" />
                                  Success
                                </Badge>
                              )}
                              {item.status === "WARNING" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-1"
                                >
                                  <AlertTriangle className="size-2.5" />
                                  Revoked
                                </Badge>
                              )}
                              {item.status === "FAILED" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold text-red-600 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"
                                >
                                  Failed
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="py-3 px-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground">{logs.length}</strong> of {stats.totalEvents} database audit entries
                </span>
                <span className="text-[11px] flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" />
                  Live PostgreSQL audit stream • Real-time database telemetry
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
