import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AdminLayoutWrapper } from "@/components/AdminLayoutWrapper";
import { Toaster } from "@/components/ui/toast";
import { Providers } from "@/components/Providers";

import { TooltipProvider } from "@/components/ui/tooltip";
import { config } from "@/lib/config";

const appName = config.app.name;

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: config.app.description,
};

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full antialiased ${bricolage.variable}`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>
          <TooltipProvider>
            <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
          </TooltipProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
