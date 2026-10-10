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
  FileText,
  Mail,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  Check,
  Columns,
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import dynamic from "next/dynamic";
import { BRAND_LOGO_URL, formatEmailBody } from "@/lib/newsletter/templates";
import { cn } from "@/lib/utils";

const BlogEditor = dynamic(() => import("@/components/blog/BlogEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] flex flex-col gap-3 p-5 bg-card rounded-xl border border-border animate-pulse">
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

const STARTER_TEMPLATES = [
  {
    id: "announcement",
    name: "Community Announcement",
    icon: Sparkles,
    badge: "Milestone",
    description: "Company updates, mission milestones, and important team announcements",
    subject: "Exciting Announcement from YS Innovations",
    preheader: "An important milestone and what we are building for our community.",
    content: `<p>Dear Readers,</p>
<p>We are thrilled to share an important milestone with our community today.</p>
<p>Over the past few months, our team has been working on transforming our core digital experiences to deliver higher reliability and cutting-edge engineering standards.</p>
<p><a href="https://ysinnovations.com">Explore what's new on our platform &rarr;</a></p>
<p>Thank you for being part of our journey.</p>
<p>Warm regards,<br />The YS Innovations Team</p>`,
  },
  {
    id: "release",
    name: "Product Release & Changelog",
    icon: Zap,
    badge: "Changelog",
    description: "Software release notes, performance gains, and new features",
    subject: "Product Update: Major Performance & Feature Releases",
    preheader: "40% faster render speeds, high-reliability newsletter delivery, and refined UI.",
    content: `<p>Hello everyone,</p>
<p>Here is what we shipped this week:</p>
<ul>
  <li><strong>Lightning Fast Loading:</strong> Optimized server components for 40% faster render speeds.</li>
  <li><strong>Enhanced Architecture:</strong> High-reliability newsletter automation with instant 1-click unsubscribe.</li>
  <li><strong>Refined UI:</strong> Streamlined layouts and smoother interactions.</li>
</ul>
<p><a href="https://ysinnovations.com/blogs">Read the full changelog on our blog &rarr;</a></p>`,
  },
  {
    id: "digest",
    name: "Engineering & Tech Digest",
    icon: FileText,
    badge: "Curated",
    description: "Curated technical articles, deep dives, and system architecture",
    subject: "Engineering Digest: Architecture & High-Scale Systems",
    preheader: "Deep dives into resilient system design, DB sync, and TypeScript architecture.",
    content: `<p>Welcome to this week's curated engineering digest.</p>
<p>Today we dive deep into resilient system design, rate-limiting patterns, and building modern web apps that scale effortlessly.</p>
<p><strong>Featured Insights:</strong></p>
<p>&bull; How we achieve zero-downtime database synchronization.<br />&bull; Optimizing serverless cold starts.<br />&bull; Clean architecture patterns in modern TypeScript.</p>
<p><a href="https://ysinnovations.com/blogs">Explore our latest engineering articles &rarr;</a></p>`,
  },
  {
    id: "letter",
    name: "Minimal Founder Letter",
    icon: Mail,
    badge: "Personal",
    description: "Intimate, clean personal note from leadership",
    subject: "A quick note from our team",
    preheader: "Reflections on what we learned this quarter and what is next.",
    content: `<p>Hey everyone,</p>
<p>I wanted to take a moment to share a quick personal update on where we're focusing our attention this month.</p>
<p>Building high-quality digital products is a marathon, and your feedback has been the single most valuable compass guiding our roadmap.</p>
<p>If you have any thoughts, hit reply to this email &mdash; I read every single message.</p>
<p>Best,<br />Subash &amp; the Team</p>`,
  },
];

function buildFullEmailHtml(content: string, preheaderText?: string) {
  const formattedBody = formatEmailBody(content);
  if (!preheaderText?.trim()) return formattedBody;
  
  // Standard email hidden preheader snippet supported across Gmail, Apple Mail, Outlook
  const preheaderSnippet = `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${preheaderText.trim()}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;
  return `${preheaderSnippet}\n${formattedBody}`;
}

export default function ComposeBlastPage() {
  const router = useRouter();

  // Content state
  const [blastSubject, setBlastSubject] = useState("");
  const [blastPreheader, setBlastPreheader] = useState("");
  const [blastContent, setBlastContent] = useState("");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");

  // Studio configuration: default to full-width "write" tab
  const [activeTab, setActiveTab] = useState<"write" | "preview" | "split">("write");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Execution states
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingBlast, setIsSendingBlast] = useState(false);
  const [lastTestSentAt, setLastTestSentAt] = useState<string | null>(null);
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);

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

  function applyTemplate(tpl: (typeof STARTER_TEMPLATES)[0]) {
    setBlastSubject(tpl.subject);
    setBlastPreheader(tpl.preheader);
    setBlastContent(tpl.content);
    toast.add({
      title: `"${tpl.name}" applied to editor`,
      type: "success",
    });
  }

  function handleResetContent() {
    setBlastSubject("");
    setBlastPreheader("");
    setBlastContent("");
    toast.add({ title: "Draft cleared", type: "neutral" });
  }

  // Send Test Email
  async function handleSendTest() {
    if (!blastSubject.trim() || !blastContent.trim()) {
      toast.add({
        title: "Please enter both subject and email body first",
        type: "error",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const fullHtml = buildFullEmailHtml(blastContent, blastPreheader);
      const res = await fetch("/api/newsletters/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testRecipientEmail.trim() || undefined,
          subject: blastSubject.trim(),
          bodyHtml: fullHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deliver test email");

      const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastTestSentAt(timeString);
      toast.add({
        title: data.message || `Test email sent to ${testRecipientEmail.trim() || "your inbox"}!`,
        type: "success",
      });
    } catch (err: any) {
      toast.add({
        title: err.message || "Error dispatching test email",
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
      const fullHtml = buildFullEmailHtml(blastContent, blastPreheader);
      const res = await fetch("/api/newsletters/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: blastSubject.trim(),
          bodyHtml: fullHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch newsletter");

      toast.add({
        title: `Newsletter sent to ${metrics.activeSubscribers} active subscribers!`,
        type: "success",
      });
      setIsPreflightOpen(false);
      mutateMetrics();
      router.push("/newsletters/campaigns");
    } catch (err: any) {
      toast.add({
        title: err.message || "Failed to send newsletter",
        type: "error",
      });
    } finally {
      setIsSendingBlast(false);
    }
  }

  const isReadyToBlast =
    blastSubject.trim().length > 0 &&
    blastContent.trim().length > 0 &&
    metrics.activeSubscribers > 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AdminTopBar
          breadcrumbs={[
            { label: "Newsletter", href: "/newsletters" },
            { label: "Send Newsletter", href: "/newsletters/compose" },
          ]}
        />

        <main className="flex-1 w-full px-[15px] md:px-[20px] lg:px-[30px] py-4 space-y-4">
          {/* Streamlined Top Navigation Bar - No Redundant Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Link href="/newsletters">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back
                </Button>
              </Link>
              <div className="h-4 w-[1px] bg-border" />
              {/* Audience Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{metrics.activeSubscribers} Active Readers</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Clean View Tabs: Write vs Preview vs Split */}
              <div className="flex items-center p-0.5 rounded-sm bg-muted border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-xs transition-colors cursor-pointer flex items-center gap-1.5",
                    activeTab === "write"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Write Newsletter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-xs transition-colors cursor-pointer flex items-center gap-1.5",
                    activeTab === "preview"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("split")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 hidden md:flex",
                    activeTab === "split"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Side-by-side view"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Split</span>
                </button>
              </div>

              {/* Primary Action Button */}
              <Button
                size="sm"
                onClick={() => setIsPreflightOpen(true)}
                disabled={!isReadyToBlast || isSendingBlast}
                className="h-8.5 px-4 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs rounded-sm hover:opacity-90"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Newsletter</span>
              </Button>
            </div>
          </div>

          {/* Main Layout Area */}
          <div
            className={cn(
              "items-start gap-5",
              activeTab === "split"
                ? "grid grid-cols-1 lg:grid-cols-12"
                : "w-full space-y-5"
            )}
          >
            {/* WRITE AREA (Full width when activeTab === 'write') */}
            {(activeTab === "write" || activeTab === "split") && (
              <div
                className={cn(
                  "space-y-4",
                  activeTab === "split" ? "lg:col-span-7" : "w-full"
                )}
              >
                {/* Subject & Preheader Header Card */}
                <div className="rounded-sm border border-border bg-card p-4 space-y-3.5 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Subject Line Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                          Subject Line <span className="text-rose-500">*</span>
                        </label>
                        <span
                          className={cn(
                            "text-[10px] font-mono",
                            blastSubject.length > 60
                              ? "text-amber-500 font-semibold"
                              : "text-muted-foreground"
                          )}
                        >
                          {blastSubject.length}/60 chars
                        </span>
                      </div>
                      <Input
                        placeholder="e.g. Exciting Announcement from YS Innovations!"
                        value={blastSubject}
                        onChange={(e) => setBlastSubject(e.target.value)}
                        className="h-9 text-xs bg-background rounded-sm"
                      />
                    </div>

                    {/* Preheader (Preview Text) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                          Preview Snippet (Preheader)
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                          {blastPreheader.length} chars
                        </span>
                      </div>
                      <Input
                        placeholder="e.g. Highlights of what is shipping this month..."
                        value={blastPreheader}
                        onChange={(e) => setBlastPreheader(e.target.value)}
                        className="h-9 text-xs bg-background rounded-sm"
                      />
                    </div>
                  </div>

                  {/* Sender & Template Selector Tray */}
                  <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        From:{" "}
                        <strong className="text-foreground font-semibold">
                          {metrics.senderEmail || "YS Innovations <team@ysinnovations.com>"}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Templates Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7.5 px-2.5 text-xs gap-1.5 cursor-pointer rounded-sm hover:bg-muted font-medium"
                            />
                          }
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Starter Templates</span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72">
                          <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Choose Layout Preset
                          </div>
                          <DropdownMenuSeparator />
                          {STARTER_TEMPLATES.map((tpl) => {
                            const IconComponent = tpl.icon;
                            return (
                              <DropdownMenuItem
                                key={tpl.id}
                                onClick={() => applyTemplate(tpl)}
                                className="flex items-start gap-2.5 p-2 cursor-pointer"
                              >
                                <div className="p-1.5 rounded-sm bg-muted text-foreground mt-0.5 shrink-0">
                                  <IconComponent className="w-3.5 h-3.5 text-amber-500" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-foreground">
                                      {tpl.name}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {tpl.description}
                                  </p>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Clear Button */}
                      {(blastSubject || blastContent || blastPreheader) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetContent}
                          className="h-7.5 px-2 text-xs text-muted-foreground hover:text-rose-500 cursor-pointer rounded-sm"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Body Editor - mode="email" hides irrelevant extensions */}
                  <div className="min-h-[460px]">
                    <BlogEditor
                      value={blastContent}
                      outputFormat="html"
                      mode="email"
                      onChange={(html) => setBlastContent(html)}
                      placeholder="Write your newsletter message here... Paste links, drop images, or use bullet points."
                    />
                  </div>

                  {/* Switch to Preview Prompt */}
                  {activeTab === "write" && (
                    <div className="pt-3 border-t border-border flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("preview")}
                        className="text-xs h-8.5 gap-1.5 cursor-pointer font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                        <span>Continue to Full Preview &amp; Test &rarr;</span>
                      </Button>
                    </div>
                  )}
              </div>
            )}

            {/* PREVIEW AREA (Full width when activeTab === 'preview') */}
            {(activeTab === "preview" || activeTab === "split") && (
              <div
                className={cn(
                  "space-y-4",
                  activeTab === "split" ? "lg:col-span-5 sticky top-20" : "w-full"
                )}
              >
                {/* Full-Width Simulator Frame */}
                <div className="rounded-sm border border-border bg-card shadow-xs overflow-hidden w-full">
                  {/* macOS Window Top Chrome */}
                  <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      <span className="text-[11px] font-semibold text-muted-foreground ml-2">
                        Inbox Preview
                      </span>
                    </div>

                    {/* Device Switcher (Desktop vs Mobile) - Theme toggle removed as requested */}
                    <div className="flex items-center p-0.5 rounded-sm bg-background border border-border">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              onClick={() => setPreviewDevice("desktop")}
                              className={cn(
                                "p-1.5 rounded-xs transition-colors cursor-pointer",
                                previewDevice === "desktop"
                                  ? "bg-muted text-foreground shadow-2xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Monitor className="w-3.5 h-3.5" />
                            </button>
                          }
                        />
                        <TooltipContent>Desktop View</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              onClick={() => setPreviewDevice("mobile")}
                              className={cn(
                                "p-1.5 rounded-xs transition-colors cursor-pointer",
                                previewDevice === "mobile"
                                  ? "bg-muted text-foreground shadow-2xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                            </button>
                          }
                        />
                        <TooltipContent>Mobile (iPhone) View</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Envelope Header (Sender, To, Subject, Snippet) */}
                  <div className="p-4 bg-muted/20 border-b border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                          YS
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              YS Innovations
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              &lt;{metrics.senderEmail || "team@ysinnovations.com"}&gt;
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            To: <span className="text-foreground">subscriber@example.com</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        Just now
                      </span>
                    </div>
                  </div>

                  {/* Email Canvas Viewport - Always displays the designed dark branded email template */}
                  <div className="p-4 sm:p-6 bg-[#050505] min-h-[460px] max-h-[680px] overflow-y-auto">
                    <div
                      className={cn(
                        "transition-all mx-auto",
                        previewDevice === "mobile"
                          ? "max-w-[340px] rounded-[32px] border-[6px] border-zinc-800 p-2 shadow-2xl bg-zinc-950"
                          : "max-w-[620px] w-full"
                      )}
                    >
                      {/* Mobile Dynamic Island Bar */}
                      {previewDevice === "mobile" && (
                        <div className="w-20 h-3.5 bg-zinc-800 rounded-full mx-auto mb-2" />
                      )}

                      {/* Actual Designed Branded Email Template */}
                      <div className="bg-[#0a0c10] rounded-xl border border-[#1f242d] overflow-hidden shadow-2xl text-zinc-200">
                        {/* Brand Banner Header */}
                        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0a0c10] to-[#121622] border-b border-[#1f242d] flex items-center justify-between">
                          <img
                            src={BRAND_LOGO_URL}
                            alt="YS Innovations"
                            className="h-6 sm:h-7 w-auto object-contain"
                          />
                          <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 tracking-wider">
                            ANNOUNCEMENT
                          </span>
                        </div>

                        {/* Subject Header */}
                        <div className="px-5 pt-3.5 pb-2.5 border-b border-[#1f242d]/80 bg-[#0c0f16]">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                            Subject
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                            {blastSubject}
                          </h4>
                        </div>

                        {/* Body Render */}
                        <div className="p-5 sm:p-6 text-xs sm:text-sm leading-relaxed text-gray-300 min-h-[220px] bg-[#0a0c10]">
                          {blastContent ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: formatEmailBody(blastContent),
                              }}
                              className="space-y-3 whitespace-pre-wrap leading-relaxed [&_p]:mb-3 [&_p]:leading-relaxed [&_a]:text-amber-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-white [&_h2]:text-sm sm:[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h3]:text-xs sm:[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-200"
                            />
                          ) : (
                            <p className="text-gray-500 italic text-center py-16">
                              Type your newsletter message in the editor to preview the live formatted template here...
                            </p>
                          )}
                        </div>

                        {/* Email Footer */}
                        <div className="p-4 bg-[#06070a] border-t border-[#1f242d] text-center text-[10px] text-gray-500 space-y-1">
                          <p className="font-bold text-[#F5A817] tracking-tight">
                            YS Innovations
                          </p>
                          <p className="italic text-gray-400 text-[9px]">
                            Innovate Today, Lead Tomorrow!
                          </p>
                          <p className="text-gray-500 pt-0.5">
                            You received this email because you subscribed at ysinnovations.com.
                          </p>
                          <p className="text-rose-400 underline pt-0.5 cursor-pointer">
                            Unsubscribe from our updates
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instant Test Send Card (Always Full Width & Prominent) */}
                <div className="rounded-sm border border-border bg-card p-4 space-y-2.5 shadow-xs w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-500" />
                      Send Instant Test Email
                    </span>
                    {lastTestSentAt && (
                      <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Test delivered at {lastTestSentAt}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="e.g. your-email@company.com (leave blank for your admin email)"
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
                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span>Send Test Email</span>
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Verifies inbox delivery, subject display, and unsubscribe formatting before sending.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* PRE-FLIGHT VERIFICATION MODAL */}
        <Dialog open={isPreflightOpen} onOpenChange={setIsPreflightOpen}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                Send Newsletter - Verification
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review your campaign details before sending to active readers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              {/* Audience Check */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <strong className="text-foreground font-semibold">
                    Target Audience: {metrics.activeSubscribers} Active Subscribers
                  </strong>
                  <p className="text-[11px] text-muted-foreground">
                    Bounced accounts, unsubscribed readers, and invalid emails are automatically excluded.
                  </p>
                </div>
              </div>

              {/* Subject Line Check */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <strong className="text-foreground font-semibold">
                    Subject Line ({blastSubject.length} characters)
                  </strong>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    &ldquo;{blastSubject}&rdquo;
                  </p>
                </div>
              </div>

              {/* Preheader Check */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start gap-3">
                {blastPreheader ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                )}
                <div className="space-y-0.5">
                  <strong className="text-foreground font-semibold">
                    Preview Preheader
                  </strong>
                  <p className="text-[11px] text-muted-foreground">
                    {blastPreheader ? `&ldquo;${blastPreheader}&rdquo;` : "None set (inbox will display first line of email body)"}
                  </p>
                </div>
              </div>

              {/* Test Email Verification */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start gap-3">
                {lastTestSentAt ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                )}
                <div className="space-y-0.5">
                  <strong className="text-foreground font-semibold">
                    {lastTestSentAt ? "Inbox Test Verified" : "No Test Sent In This Session"}
                  </strong>
                  <p className="text-[11px] text-muted-foreground">
                    {lastTestSentAt
                      ? `Delivered at ${lastTestSentAt}.`
                      : "We recommend sending a test email to yourself to confirm inbox styling."}
                  </p>
                </div>
              </div>

              {/* Compliance & Safeguard */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <strong className="text-foreground font-semibold">
                    CAN-SPAM &amp; 1-Click Unsubscribe Guard
                  </strong>
                  <p className="text-[11px] text-muted-foreground">
                    Automatic 1-click unsubscribe headers &amp; physical footer included.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreflightOpen(false)}
                className="cursor-pointer text-xs h-8.5 rounded-sm"
              >
                Keep Editing
              </Button>
              <Button
                size="sm"
                onClick={handleDispatchBlast}
                disabled={isSendingBlast}
                className="cursor-pointer text-xs h-8.5 gap-1.5 bg-primary text-primary-foreground font-semibold rounded-sm shadow-xs"
              >
                {isSendingBlast ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Confirm &amp; Send Newsletter</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
