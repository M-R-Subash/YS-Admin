"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

export interface AdminTopBarProps {
  /**
   * Custom breadcrumbs. Can be a simple string (e.g. "Dashboard" or "Webpages")
   * or an array of segments (e.g. [{ label: "Blogs", href: "/blogs" }, { label: "Edit" }]).
   * If omitted, breadcrumbs are auto-derived from the URL pathname.
   */
  breadcrumbs?: string | BreadcrumbSegment[];
  /** Optional extra action buttons placed on the right */
  actions?: React.ReactNode;
  /** Custom endpoint URL for the external View Site tab button */
  viewSiteUrl?: string;
  /** Custom label for the external View Site tab button */
  viewSiteLabel?: string;
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/webpages": "Webpages",
  "/blogs": "Blogs",
  "/comments": "Comments",
  "/users": "Users",
  "/media": "Media Library",
  "/redirections": "Redirections",
  "/notifications": "Notifications",
  "/account": "Account Settings",
};

export function AdminTopBar({
  breadcrumbs,
  actions,
  viewSiteUrl,
  viewSiteLabel,
  className,
}: AdminTopBarProps) {
  const pathname = usePathname();

  // Resolve breadcrumbs into a normalized segment array
  const resolvedCrumbs = useMemo<BreadcrumbSegment[]>(() => {
    if (typeof breadcrumbs === "string") {
      return [{ label: breadcrumbs }];
    }
    if (Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
      return breadcrumbs;
    }

    // Auto-detect based on current pathname
    if (pathname && ROUTE_LABELS[pathname]) {
      return [{ label: ROUTE_LABELS[pathname] }];
    }

    if (pathname) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length === 0) return [{ label: "Dashboard" }];

      return parts.map((part, idx) => {
        const href = "/" + parts.slice(0, idx + 1).join("/");
        const formatted = part
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          label: formatted,
          href: idx < parts.length - 1 ? href : undefined,
        };
      });
    }

    return [{ label: "Dashboard" }];
  }, [breadcrumbs, pathname]);

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";

  // Compute the perfect endpoint and label for the external tab button
  const targetSiteUrl = useMemo(() => {
    if (viewSiteUrl !== undefined) return viewSiteUrl;
    if (!frontendUrl) return "";
    if (pathname?.startsWith("/blogs")) {
      return `${frontendUrl}/blogs`;
    }
    return frontendUrl;
  }, [viewSiteUrl, frontendUrl, pathname]);

  const targetSiteLabel = useMemo(() => {
    if (viewSiteLabel !== undefined) return viewSiteLabel;
    if (pathname?.startsWith("/blogs")) {
      return "View Blogs";
    }
    return "View Site";
  }, [viewSiteLabel, pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-md flex h-14 sm:h-16 shrink-0 items-center justify-between px-[15px] md:px-[20px] lg:px-[30px] transition-[width,height] ease-linear border-b border-border shadow-2xs",
        className
      )}
    >
      {/* Left: Sidebar Trigger + Mobile/Tablet Logo + Separator + Page Name/Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1 text-foreground hover:bg-accent cursor-pointer" />

        {/* Mobile & Tablet Logo (visible on < lg where desktop sidebar is hidden) */}
        <Link
          href="/"
          className="flex lg:hidden items-center shrink-0 hover:opacity-80 transition-opacity"
          title="Dashboard"
        >
          <div className="relative size-7 shrink-0 rounded-sm overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5 border border-border">
            <Image
              src="/ys-icon.png"
              alt="YS Innovations"
              width={28}
              height={28}
              className="w-full h-full object-contain rounded-sm"
              priority
            />
          </div>
        </Link>

        <Separator
          orientation="vertical"
          className="mx-1 sm:mr-2 h-4 sm:h-5 data-vertical:h-4 sm:data-vertical:h-5 self-center data-vertical:self-center my-auto bg-border shrink-0"
        />

        {/* Page Name & Breadcrumb Navigation */}
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap items-center gap-1 sm:gap-1.5">
            {resolvedCrumbs.map((crumb, idx) => {
              const isLast = idx === resolvedCrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <BreadcrumbSeparator className="hidden sm:inline-flex text-muted-foreground/50 [&>svg]:size-3.5 sm:[&>svg]:size-4" />
                  )}
                  <BreadcrumbItem
                    className={isLast ? "min-w-0" : "hidden sm:inline-flex"}
                  >
                    {isLast ? (
                      <BreadcrumbPage
                        role="heading"
                        aria-level={1}
                        className="truncate max-w-[200px] xs:max-w-[260px] sm:max-w-xs md:max-w-sm lg:max-w-md text-base sm:text-lg md:text-xl font-bold sm:font-extrabold tracking-tight text-foreground leading-tight"
                      >
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink
                        href={crumb.href}
                        className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {crumb.label}
                      </span>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: Actions Slot + External Tab Button */}
      <div className="flex items-center gap-2 shrink-0">
        {actions}

        {targetSiteUrl && (
          <a
            href={targetSiteUrl}
            onClick={(e) => {
              e.preventDefault();
              window.open(`${targetSiteUrl}?nocache=${Date.now()}`, "_blank");
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-foreground bg-card hover:bg-accent border border-border rounded-sm transition-all shadow-xs cursor-pointer shrink-0"
            title={targetSiteLabel}
          >
            <span className="hidden sm:inline">{targetSiteLabel}</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        )}
      </div>
    </header>
  );
}
