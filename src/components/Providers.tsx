"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { swrGlobalConfig } from "@/lib/swr-config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={swrGlobalConfig}>{children}</SWRConfig>
    </SessionProvider>
  );
}
