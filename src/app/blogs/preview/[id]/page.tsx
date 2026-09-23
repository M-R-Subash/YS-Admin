"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ArrowLeft,
  ExternalLink,
  FileText,
  AlertCircle,
} from "lucide-react";

type ViewportMode = "desktop" | "tablet" | "mobile";

interface BlogPreviewData {
  id: string;
  title: string;
  slug: string;
  status: string;
  previewSecret?: string;
  updatedAt?: string;
}

export default function BlogPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [blog, setBlog] = useState<BlogPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch blog metadata to obtain slug & previewSecret
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/blogs/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Blog post not found"
              : "Failed to load blog preview metadata"
          );
        }
        return res.json();
      })
      .then((data: BlogPreviewData) => {
        if (!isMounted) return;
        setBlog(data);
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
  }, [id]);

  // Listen for BroadcastChannel updates from BlogForm.tsx
  useEffect(() => {
    if (!id) return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`blog_preview_${id}`);
      channel.onmessage = (event) => {
        if (event.data?.type === "BLOG_DRAFT_UPDATED") {
          // If the slug changed, update local blog state
          if (event.data.slug && blog && event.data.slug !== blog.slug) {
            setBlog((prev) => (prev ? { ...prev, slug: event.data.slug } : null));
          }
          // Reload iframe to fetch updated staged draft
          setIframeLoading(true);
          setIframeKey((prev) => prev + 1);
          setLastSyncTime(
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported in this environment", e);
    }

    return () => {
      channel?.close();
    };
  }, [id, blog]);

  const handleReload = () => {
    setIframeLoading(true);
    setIframeKey((prev) => prev + 1);
    setLastSyncTime(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-zinc-400 animate-pulse">
          Initializing Responsive Live Preview...
        </p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/90 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Preview Unavailable</h2>
          <p className="text-xs text-zinc-400 mb-6">{error || "Blog could not be found."}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/blogs"
              className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Blogs
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

  const cleanSlug = blog.slug.startsWith("/") ? blog.slug.slice(1) : blog.slug;
  const previewSecret = blog.previewSecret || "";
  const iframeSrc = `${frontendUrl}/blogs/${cleanSlug}?preview=true&secret=${encodeURIComponent(previewSecret)}`;
  const livePublicUrl = `${frontendUrl}/blogs/${cleanSlug}`;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070709] text-white select-none">
      {/* Top Preview Toolbar */}
      <header className="h-14 bg-zinc-950/90 border-b border-white/10 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/blogs/edit/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Return to Editor"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editor</span>
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
            <span className="text-xs font-semibold text-zinc-200 truncate max-w-[240px] md:max-w-[400px]">
              {blog.title || "Untitled Blog Post"}
            </span>
          </div>
        </div>

        {/* Center: Responsive Viewport Switcher */}
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
            <RotateCw className={`w-3.5 h-3.5 ${iframeLoading ? "animate-spin text-amber-400" : ""}`} />
          </button>

          {/* Open Real Live URL (if published) */}
          {blog.status === "published" && (
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
        {/* Viewport Frame */}
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
              <span className="text-xs font-semibold text-zinc-400">Loading Preview...</span>
            </div>
          )}

          {/* Live Preview Iframe */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0 bg-white"
            title="Blog Live Preview"
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </main>
    </div>
  );
}
