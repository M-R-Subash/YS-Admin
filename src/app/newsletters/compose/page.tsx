"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  Send,
  ArrowLeft,
  Sparkles,
  Eye,
  Loader2,
  Smartphone,
  Monitor,
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/global-modal";
import dynamic from "next/dynamic";
import { BRAND_LOGO_URL, formatEmailBody } from "@/lib/newsletter/templates";
import { cn } from "@/lib/utils";

const BlogEditor = dynamic(() => import("@/components/blog/BlogEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] flex flex-col gap-3 p-5 bg-card rounded-xl border border-border animate-pulse">
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Metrics {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribedSubscribers: number;
  returnedSubscribers: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  avgDeliveryRate: number;
  senderEmail?: string;
  replyTo?: string;
}

export default function ComposeBlastPage() {
  const router = useRouter();

  const [blastSubject, setBlastSubject] = useState("");
  const [blastContent, setBlastContent] = useState("");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingBlast, setIsSendingBlast] = useState(false);
  const [isConfirmBlastOpen, setIsConfirmBlastOpen] = useState(false);

  const { data: metricsData, mutate: mutateMetrics } = useSWR<{
    metrics: Metrics;
  }>("/api/newsletters/metrics", fetcher, {
    revalidateOnFocus: false,
  });

  const metrics = metricsData?.metrics || {
    totalSubscribers: 0,
    activeSubscribers: 0,
    unsubscribedSubscribers: 0,
    returnedSubscribers: 0,
    totalCampaigns: 0,
    totalEmailsSent: 0,
    avgDeliveryRate: 100,
  };

  // Quick Starter Templates
  function applyStarterTemplate(type: "announcement" | "release" | "digest") {
    if (type === "announcement") {
      setBlastSubject("Exciting Announcement from YS Innovations");
      setBlastContent(
        `<p>Dear Readers,</p>\n<p>We are thrilled to share an important milestone with our community today.</p>\n<p>Over the past few months, our team has been working on transforming our core digital experiences to deliver higher reliability and cutting-edge engineering standards.</p>\n<p><a href="https://ysinnovations.com">Explore what's new on our platform &rarr;</a></p>\n<p>Thank you for being part of our journey.</p>\n<p>Warm regards,<br>The YS Innovations Team</p>`
      );
    } else if (type === "release") {
      setBlastSubject("Product Update: Major Performance & Feature Releases");
      setBlastContent(
        `<p>Hello everyone,</p>\n<p>Here is what we shipped this week:</p>\n<ul>\n  <li><strong>Lightning Fast Loading:</strong> Optimized server components for 40% faster render speeds.</li>\n  <li><strong>Enhanced Architecture:</strong> High-reliability newsletter automation with instant 1-click unsubscribe.</li>\n  <li><strong>Refined UI:</strong> Streamlined layouts and smoother interactions.</li>\n</ul>\n<p><a href="https://ysinnovations.com/blogs">Read the full changelog on our blog &rarr;</a></p>`
      );
    } else if (type === "digest") {
      setBlastSubject("Engineering Digest: Architecture & High-Scale Systems");
      setBlastContent(
        `<p>Welcome to this week's curated engineering digest.</p>\n<p>Today we dive deep into resilient system design, rate-limiting patterns, and building modern web apps that scale effortlessly.</p>\n<p><strong>Featured Insights:</strong></p>\n<p>&bull; How we achieve zero-downtime database synchronization.<br>&bull; Optimizing serverless cold starts.<br>&bull; Clean architecture patterns in modern TypeScript.</p>\n<p><a href="https://ysinnovations.com/blogs">Explore our latest engineering articles &rarr;</a></p>`
      );
    }
    toast.add({ title: "Template applied to editor", type: "success" });
  }

  // Send Test Email
  async function handleSendTest() {
    if (!blastSubject.trim() || !blastContent.trim()) {
      toast.add({
        title: "Please fill in both subject and message body",
        type: "error",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/newsletters/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testRecipientEmail.trim() || undefined,
          subject: blastSubject.trim(),
          bodyHtml: formatEmailBody(blastContent),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");

      toast.add({
        title: data.message || "Test email delivered to your inbox!",
        type: "success",
      });
    } catch (err: any) {
      toast.add({
        title: err.message || "Error sending test email",
        type: "error",
      });
    } finally {
      setIsSendingTest(false);
    }
  }

  // Dispatch Custom Blast
  async function handleDispatchBlast() {
    setIsSendingBlast(true);
    try {
      const res = await fetch("/api/newsletters/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: blastSubject.trim(),
          bodyHtml: formatEmailBody(blastContent),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch campaign");

      toast.add({
        title: `Campaign dispatched to ${metrics.activeSubscribers} active subscribers!`,
        type: "success",
      });
      setIsConfirmBlastOpen(false);
      mutateMetrics();
      router.push("/newsletters/campaigns");
    } catch (err: any) {
      toast.add({
        title: err.message || "Failed to dispatch campaign",
        type: "error",
      });
    } finally {
      setIsSendingBlast(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminTopBar
        breadcrumbs={[
          { label: "Newsletter", href: "/newsletters" },
          { label: "Compose Blast", href: "/newsletters/compose" },
        ]}
      />

      <main className="flex-1 w-full px-[15px] md:px-[20px] lg:px-[30px] py-6 space-y-6">
        {/* Title Bar & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Link href="/newsletters">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                Compose Email Blast
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground ml-1">
              Broadcast direct announcements, product news, and company updates to all active readers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{metrics.activeSubscribers} Active Recipients</span>
            </div>

            <Button
              size="sm"
              onClick={() => setIsConfirmBlastOpen(true)}
              disabled={
                isSendingBlast ||
                !blastSubject.trim() ||
                !blastContent.trim() ||
                metrics.activeSubscribers === 0
              }
              className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs rounded-sm hover:opacity-90"
            >
              <Send className="w-3.5 h-3.5" />
              Send Blast Now
            </Button>
          </div>
        </div>

        {/* Studio Grid: Left Writing Canvas + Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Writing Studio (7 Cols) */}
          <div className="lg:col-span-7 rounded-sm border border-border bg-card p-5 space-y-4 shadow-xs">
            {/* Sender and Audience Information Card */}
            <div className="p-3 rounded-sm bg-muted/40 border border-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Configured Sender:</span>
                <strong className="text-foreground font-semibold">
                  {metrics.senderEmail || "Active SMTP Provider"}
                </strong>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Batch engine &bull; 1-click unsubscribe included
              </span>
            </div>

            {/* Quick Starter Templates */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Starter Templates
                </span>
                {(blastSubject || blastContent) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBlastSubject("");
                      setBlastContent("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-rose-500 cursor-pointer font-medium"
                  >
                    Clear Editor
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyStarterTemplate("announcement")}
                  className="px-2.5 py-1 text-xs font-medium rounded-sm bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                >
                  📢 Announcement
                </button>
                <button
                  type="button"
                  onClick={() => applyStarterTemplate("release")}
                  className="px-2.5 py-1 text-xs font-medium rounded-sm bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                >
                  🚀 Product Release
                </button>
                <button
                  type="button"
                  onClick={() => applyStarterTemplate("digest")}
                  className="px-2.5 py-1 text-xs font-medium rounded-sm bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                >
                  📚 Engineering Digest
                </button>
              </div>
            </div>

            {/* Subject Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Email Subject Line <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {blastSubject.length} chars
                </span>
              </div>
              <Input
                placeholder="e.g. Exciting Announcement from YS Innovations!"
                value={blastSubject}
                onChange={(e) => setBlastSubject(e.target.value)}
                className="h-10 text-xs rounded-sm"
              />
            </div>

            {/* Message Body with Blog Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Email Message Body <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Slash commands &bull; Headings, images &amp; links supported
                </span>
              </div>
              <div className="min-h-[440px]">
                <BlogEditor
                  value={blastContent}
                  outputFormat="html"
                  onChange={(html) => setBlastContent(html)}
                  placeholder="Compose your newsletter announcement here... Type '/' for formatting commands or drop images directly into the editor."
                />
              </div>
            </div>

            {/* Test Recipient Input & Send Preview */}
            <div className="p-3.5 rounded-sm bg-muted/20 border border-border space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground block">
                Send Inbox Test Preview (defaults to your admin email):
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="e.g. test-account@company.com"
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  className="h-9 text-xs bg-background flex-1 rounded-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isSendingTest || !blastSubject.trim() || !blastContent.trim()}
                  className="h-9 px-3.5 text-xs gap-1.5 shrink-0 cursor-pointer hover:bg-muted font-medium rounded-sm"
                >
                  {isSendingTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>Send Test Email</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Real-time Live Preview (5 Cols) */}
          <div className="lg:col-span-5 rounded-sm border border-border bg-card p-5 space-y-4 shadow-xs sticky top-20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-500" />
                Live Inbox Preview
              </h3>
              {/* Device Mode Switcher */}
              <div className="flex items-center p-0.5 rounded-sm bg-muted border border-border">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={cn(
                    "p-1.5 rounded-xs transition-colors cursor-pointer text-muted-foreground",
                    previewDevice === "desktop"
                      ? "bg-card text-foreground shadow-2xs"
                      : "hover:text-foreground"
                  )}
                  title="Desktop Preview"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={cn(
                    "p-1.5 rounded-xs transition-colors cursor-pointer text-muted-foreground",
                    previewDevice === "mobile"
                      ? "bg-card text-foreground shadow-2xs"
                      : "hover:text-foreground"
                  )}
                  title="Mobile Preview"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Email Canvas Shell */}
            <div
              className={cn(
                "rounded-xl border border-border/80 bg-[#050505] p-3 sm:p-4 overflow-hidden shadow-inner text-white transition-all mx-auto",
                previewDevice === "mobile" ? "max-w-[360px]" : "max-w-full"
              )}
            >
              <div className="bg-[#0a0c10] rounded-xl border border-[#1f242d] overflow-hidden shadow-2xl">
                {/* Email Header */}
                <div className="p-4 bg-gradient-to-r from-[#0a0c10] to-[#121622] border-b border-[#1f242d] flex items-center justify-between">
                  <img
                    src={BRAND_LOGO_URL}
                    alt="YS Innovations"
                    className="h-6 sm:h-7 w-auto object-contain"
                  />
                  <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 tracking-wider">
                    ANNOUNCEMENT
                  </span>
                </div>

                {/* Email Subject preview */}
                <div className="px-5 pt-3.5 pb-3 border-b border-[#1f242d]/80 bg-[#0c0f16]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Subject Line
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {blastSubject || "Your Subject Line Will Appear Here"}
                  </h4>
                </div>

                {/* Body Preview */}
                <div className="p-4 sm:p-5 text-xs leading-relaxed text-gray-300 min-h-[220px] max-h-[380px] overflow-y-auto bg-[#0a0c10]">
                  {blastContent ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatEmailBody(blastContent),
                      }}
                      className="space-y-3 whitespace-pre-wrap leading-relaxed [&_p]:mb-3 [&_p]:leading-relaxed [&_a]:text-amber-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-white [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-gray-200"
                    />
                  ) : (
                    <p className="text-gray-500 italic">
                      Type your message on the left to see the live formatted preview here...
                    </p>
                  )}
                </div>

                {/* Email Footer */}
                <div className="p-3.5 bg-[#06070a] border-t border-[#1f242d] text-center text-[10px] text-gray-500 space-y-1">
                  <p className="font-bold text-[#F5A817] tracking-tight">
                    YS Innovations
                  </p>
                  <p className="italic text-gray-400 text-[9px]">
                    Innovate Today, Lead Tomorrow!
                  </p>
                  <p className="text-gray-500 pt-0.5">
                    You received this email because you subscribed at ysinnovations.com.
                  </p>
                  <p className="text-rose-400/80 underline pt-0.5 cursor-pointer">
                    Unsubscribe from our updates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CONFIRMATION: Send Blast using ConfirmModal */}
      <ConfirmModal
        open={isConfirmBlastOpen}
        onOpenChange={setIsConfirmBlastOpen}
        variant="warning"
        title="Dispatch Email Blast?"
        description={
          <div className="space-y-2 text-xs">
            <p>
              You are about to broadcast{" "}
              <strong>&ldquo;{blastSubject}&rdquo;</strong> to{" "}
              <strong>{metrics.activeSubscribers} active subscribers</strong>.
            </p>
            <p className="text-muted-foreground">
              The batch engine will safely dispatch emails in chunks with automatic 1-click unsubscribe links.
            </p>
          </div>
        }
        confirmText="Confirm & Send"
        onConfirm={handleDispatchBlast}
        loading={isSendingBlast}
      />
    </div>
  );
}
