"use client";

import { Laptop, ShieldCheck, Info, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { ActiveSessionsCard } from "@/components/profile/ActiveSessionsCard";

export default function AccountSessionsPage() {
  return (
    <>
      <AdminTopBar
        breadcrumbs={[
          { label: "Account Settings", href: "/account" },
          { label: "Active Sessions" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-6 py-6 px-3.75 md:px-5 lg:px-7.5 w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Active Sessions & Devices
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold text-primary bg-primary/10 border-primary/20"
            >
              Device Telemetry
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Review and manage all devices, browsers, and IP addresses currently authenticated to your account.
          </p>
        </div>

        {/* Session Security Advice Notice */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Laptop className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-foreground">
                Session Token Protection
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Each signed-in device holds a cryptographically signed stateful refresh token. If you notice any suspicious device or unusual location, revoke it immediately to force that device to sign out.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shrink-0">
            <ShieldCheck className="size-3.5" />
            <span>Stateful Token Protection Active</span>
          </div>
        </div>

        {/* Full-width Active Sessions Card */}
        <ActiveSessionsCard />

        {/* Security FAQs & Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/70 bg-card p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Info className="size-4 text-primary" />
              <span>How Session Invalidation Works</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Revoking a session immediately deletes that device&apos;s refresh token in the database. When that device makes its next API request, the system detects the revoked token and terminates their session immediately.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <ShieldAlert className="size-4 text-amber-500" />
              <span>Lost or Compromised Device?</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your laptop or mobile phone is lost or stolen, click &quot;Revoke all other sessions&quot; above, and then immediately update your password on the{" "}
              <a href="/account/security" className="text-primary hover:underline font-semibold">
                Security & Password
              </a>{" "}
              page.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
