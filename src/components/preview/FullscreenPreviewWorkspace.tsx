"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import Link from "next/link";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

export type ViewportMode = "desktop" | "tablet" | "mobile";

export interface PreviewItemData {
  id: string;
  title: string;
  slug: string;
  status: string;
  previewSecret?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface FullscreenPreviewWorkspaceProps {
  id: string;
  titleIcon?: ReactNode;
  fetchEndpoint: string;
  editorUrl: string;
  backUrl: string;
  channelName: string;
  getItemPath: (slug: string) => string;
  itemTypeLabel?: string;
}

export function FullscreenPreviewWorkspace({
  id,
  titleIcon,
  fetchEndpoint,
  editorUrl,
  backUrl,
  channelName,
  getItemPath,
  itemTypeLabel = "Content",
}: FullscreenPreviewWorkspaceProps) {
  const [data, setData] = useState<PreviewItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch metadata to obtain slug & previewSecret
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(fetchEndpoint)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? `${itemTypeLabel} not found`
              : `Failed to load ${itemTypeLabel.toLowerCase()} preview metadata`
          );
        }
        return res.json();
      })
      .then((item: PreviewItemData) => {
        if (!isMounted) return;
        setData(item);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "An unexpected error occurred");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, fetchEndpoint, itemTypeLabel]);

  // Listen for BroadcastChannel updates from editor
  useEffect(() => {
    if (!id) return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (event) => {
        if (
          event.data?.type === "BLOG_DRAFT_UPDATED" ||
          event.data?.type === "PAGE_DRAFT_UPDATED"
        ) {
          // If slug changed, update data
          if (event.data.slug && data && event.data.slug !== data.slug) {
            setData((prev) => (prev ? { ...prev, slug: event.data.slug } : null));
          }
          setIframeLoading(true);
          setIframeKey((prev) => prev + 1);
          setLastSyncTime(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        } else if (event.data?.type && event.data?.content) {
          // In-memory real-time postMessage forward
          iframeRef.current?.contentWindow?.postMessage(event.data, "*");
          setLastSyncTime(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported in this environment", e);
    }

    return () => {
      channel?.close();
    };
  }, [id, channelName, data]);

  const handleReload = () => {
    setIframeLoading(true);
    setIframeKey((prev) => prev + 1);
    setLastSyncTime(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-zinc-400 animate-pulse">
          Initializing Full-Screen Live Preview...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/90 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Preview Unavailable</h2>
          <p className="text-xs text-zinc-400 mb-6">
            {error || `${itemTypeLabel} could not be found.`}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={backUrl}
              className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors font-bold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const frontendUrl = (
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");

  const itemPath = getItemPath(data.slug);
  const normalizedPath = itemPath.startsWith("/") ? itemPath : `/${itemPath}`;
  const previewSecret = data.previewSecret || "";
  const iframeSrc = `${frontendUrl}${normalizedPath}?preview=true&secret=${encodeURIComponent(
    previewSecret
  )}`;
  const livePublicUrl = `${frontendUrl}${normalizedPath}`;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070709] text-white select-none">
      {/* Top Preview Toolbar */}
      <header className="h-14 bg-zinc-950/90 border-b border-white/10 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={editorUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Return to Editor"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editor</span>
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            {titleIcon}
            <span className="text-xs font-semibold text-zinc-200 truncate max-w-[240px] md:max-w-[400px]">
              {data.title || `Untitled ${itemTypeLabel}`}
            </span>
          </div>
        </div>

        {/* Center: 3 Responsive Viewport Breakpoints */}
        <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewport === "desktop"
                ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Desktop View (Full Width)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport("tablet")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewport === "tablet"
                ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport("mobile")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewport === "mobile"
                ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Mobile View (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Actions & Sync Status */}
        <div className="flex items-center gap-2">
          {/* Live Sync Pill */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400"
            title={`Last synced: ${lastSyncTime}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Synced</span>
          </div>

          {/* Reload Iframe */}
          <button
            type="button"
            onClick={handleReload}
            className="p-2 rounded-lg text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Refresh Preview Iframe"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${iframeLoading ? "animate-spin text-amber-400" : ""}`}
            />
          </button>

          {/* Open Real Live URL (if published) */}
          {data.status === "published" && (
            <a
              href={livePublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="Open Public Live URL in New Tab"
            >
              <span className="hidden sm:inline">Live Site</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          )}
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 overflow-hidden relative flex items-center justify-center p-0 md:p-4 bg-[#0a0a0d]">
        {/* Viewport Frame with 3 Breakpoints */}
        <div
          className={`h-full transition-all duration-300 ease-out relative flex flex-col bg-white overflow-hidden shadow-2xl ${
            viewport === "desktop"
              ? "w-full rounded-none md:rounded-xl ring-0 md:ring-1 md:ring-white/10"
              : viewport === "tablet"
                ? "w-[768px] max-w-full rounded-xl ring-1 ring-white/15"
                : "w-[390px] max-w-full rounded-xl ring-1 ring-white/15"
          }`}
        >
          {/* Iframe Loading Overlay */}
          {iframeLoading && (
            <div className="absolute inset-0 bg-[#0c0c0e] z-20 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-xs font-semibold text-zinc-400">
                Loading {itemTypeLabel} Preview...
              </span>
            </div>
          )}

          {/* Live Preview Iframe */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0 bg-white"
            title={`${itemTypeLabel} Full Screen Live Preview`}
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </main>
    </div>
  );
}
