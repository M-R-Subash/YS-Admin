"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { SWRConfig } from "swr";
import { swrGlobalConfig } from "@/lib/swr-config";

function VisitTracker() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user && typeof window !== "undefined") {
      const userIdentifier = session.user.id || session.user.email || "current";
      const key = `cms_visit_${userIdentifier}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "true");
        fetch("/api/users/visit", { method: "POST" }).catch(() => {});
      }
    }
  }, [status, session]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <VisitTracker />
      <SWRConfig value={swrGlobalConfig}>{children}</SWRConfig>
    </SessionProvider>
  );
}
