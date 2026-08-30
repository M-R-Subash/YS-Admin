import type { Metadata } from "next";
import "./globals.css";
import { AdminLayoutWrapper } from "@/components/AdminLayoutWrapper";
import { Toaster } from "@/components/ui/toast";
import { Providers } from "@/components/Providers";

import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "YS CMS — Admin",
  description: "Content management dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>
          <TooltipProvider>
            <AdminLayoutWrapper>
              {children}
            </AdminLayoutWrapper>
          </TooltipProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
