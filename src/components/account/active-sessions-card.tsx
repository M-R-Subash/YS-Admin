"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Trash2,
  LogOut,
  Loader2,
  ShieldCheck,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { formatDistanceToNow, parseISO } from "date-fns";

export interface SessionItem {
  id: string;
  device: {
    browser: string;
    os: string;
    deviceType: "desktop" | "mobile" | "tablet";
    label: string;
  };
  ipAddress: string;
  createdAt: string;
  lastActive: string;
  expiresAt: string;
  isCurrent: boolean;
}

export function ActiveSessionsCard() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<{ sessions: SessionItem[] }>("/api/account/sessions", {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);

  const sessions = data?.sessions || [];
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  const handleRefresh = async () => {
    if (isRefreshing || isValidating) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        mutate(),
        new Promise((resolve) => setTimeout(resolve, 650)), // Smooth minimum spin duration
      ]);
    } catch {
      // SWR handles error state
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/account/sessions/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to revoke session");

      toast.add({
        title: "Device Revoked",
        description: "That session has been logged out successfully.",
        type: "success",
      });
      mutate();
    } catch (err: any) {
      toast.add({
        title: "Revocation Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setIsRevokingOthers(true);
    try {
      const res = await fetch("/api/account/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_others" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to revoke other sessions");

      toast.add({
        title: "Other Devices Logged Out",
        description: `Successfully signed out ${result.revokedCount || 0} other device(s).`,
        type: "success",
      });
      mutate();
    } catch (err: any) {
      toast.add({
        title: "Action Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsRevokingOthers(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="size-5 text-primary" />;
      case "tablet":
        return <Tablet className="size-5 text-primary" />;
      default:
        return <Laptop className="size-5 text-primary" />;
    }
  };

  const formatTimeAgo = (isoDate?: string) => {
    if (!isoDate) return "recently";
    try {
      return formatDistanceToNow(parseISO(isoDate), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <div className="rounded-sm border border-border/80 bg-card p-6 shadow-xs transition-all">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Active Devices & Sessions
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono uppercase px-2 py-0.5">
              Max 3 Devices
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Devices currently logged into your account. If you spot an unrecognized session, revoke it immediately.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isValidating}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`size-3.5 mr-1.5 transition-transform duration-500 ${isRefreshing || isValidating ? "animate-spin text-primary" : ""}`} />
            {isRefreshing || isValidating ? "Refresh" : "Refresh"}
          </Button>

          {otherSessionsCount > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRevokeOthers}
              disabled={isRevokingOthers}
              className="h-8 px-3 text-xs font-semibold cursor-pointer rounded-sm"
            >
              {isRevokingOthers ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Revoking...
                </>
              ) : (
                <>
                  <LogOut className="size-3.5 mr-1.5" /> Log Out Others ({otherSessionsCount})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Session List */}
      <div className="pt-4 divide-y divide-border/40">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs">Loading active sessions...</p>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-xs text-destructive">
            Failed to load active sessions. Please try refreshing.
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No active sessions found.
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                s.isCurrent ? "bg-primary/5 -mx-4 px-4 rounded-sm border border-primary/20 my-1" : ""
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-sm bg-muted text-muted-foreground border border-border/60 shrink-0 mt-0.5">
                  {getDeviceIcon(s.device.deviceType)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {s.device.label}
                    </span>

                    {s.isCurrent ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0">
                        This Device
                      </Badge>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Active {formatTimeAgo(s.lastActive)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground/80">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Globe className="size-3 text-muted-foreground" />
                      {s.ipAddress}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-muted-foreground" />
                      Signed in {formatTimeAgo(s.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {s.isCurrent ? (
                  <span className="text-xs text-muted-foreground/70 font-medium px-2 py-1">
                    Current Active Session
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(s.id)}
                    disabled={revokingId === s.id}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer rounded-sm"
                  >
                    {revokingId === s.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="size-3.5 mr-1.5" /> Revoke
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
