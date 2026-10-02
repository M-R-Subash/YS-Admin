"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { SWRConfig, useSWRConfig } from "swr";
import { swrGlobalConfig } from "@/lib/swr-config";

const VISIT_THROTTLE_MS = 15 * 60 * 1000; // Throttle to at most once per 15 minutes per session

function VisitTracker() {
  const { data: session, status } = useSession();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (status === "authenticated" && session?.user && typeof window !== "undefined") {
      const userIdentifier = session.user.id || session.user.email || "current";
      const key = `cms_visit_${userIdentifier}`;
      const lastPing = parseInt(sessionStorage.getItem(key) || "0", 10);
      const now = Date.now();

      if (!lastPing || now - lastPing > VISIT_THROTTLE_MS) {
        sessionStorage.setItem(key, String(now));
        fetch("/api/users/visit", { method: "POST" })
          .then((res) => {
            if (res.ok) {
              mutate("/api/users");
              mutate("/api/account/sessions");
            }
          })
          .catch((err) => {
            console.error("Visit ping error:", err);
          });
      }
    }
  }, [status, session, mutate]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={swrGlobalConfig}>
        <VisitTracker />
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
