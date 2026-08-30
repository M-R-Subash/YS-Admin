"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/editor") || pathname?.startsWith("/blogs/edit") || pathname?.startsWith("/blogs/create") || pathname?.startsWith("/header") || pathname?.startsWith("/footer") || pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
