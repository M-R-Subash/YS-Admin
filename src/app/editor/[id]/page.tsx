"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ExternalLink, RotateCw, Undo2, Check, Cloud } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { PageData } from "@/types";
import SchemaEditor, { SchemaEditorRef } from "@/components/admin/SchemaEditor";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { homepageUiSchema } from "@/lib/schemas/homepage/homepage-ui-schema";
import { homepageSchema } from "@/lib/schemas/homepage/homepage-validation";
import { careersUiSchema } from "@/lib/schemas/careers/careers-ui-schema";
import { careersSchema } from "@/lib/schemas/careers/careers-validation";
import { contactUiSchema } from "@/lib/schemas/contact/contact-ui-schema";
import { contactSchema } from "@/lib/schemas/contact/contact-validation";
import { servicesUiSchema } from "@/lib/schemas/services/services-ui-schema";
import { servicesSchema } from "@/lib/schemas/services/services-validation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScreenLoader } from "@/components/ui/screen-loader";

const SCHEMA_REGISTRY: Record<string, any> = {
  "/": {
    schema: homepageSchema,
    uiSchema: homepageUiSchema,
    previewType: "PREVIEW_UPDATE_HOMEPAGE",
  },
  "/careers": {
    schema: careersSchema,
    uiSchema: careersUiSchema,
    previewType: "PREVIEW_UPDATE_CAREERS",
  },
  "/contact": {
    schema: contactSchema,
    uiSchema: contactUiSchema,
    previewType: "PREVIEW_UPDATE_CONTACT",
  },
  "/services/digital-marketing": {
    schema: servicesSchema,
    uiSchema: servicesUiSchema,
    previewType: "PREVIEW_UPDATE_DIGITAL_MARKETING",
  },
};

function getSchemaConfig(slug: string | undefined) {
  if (!slug) return null;
  if (SCHEMA_REGISTRY[slug]) return SCHEMA_REGISTRY[slug];
  if (
    slug.startsWith("/services/") ||
    slug === "/digital-marketing" ||
    slug === "/app-development" ||
    !["/", "/careers", "/contact"].includes(slug)
  ) {
    return {
      schema: servicesSchema,
      uiSchema: servicesUiSchema,
      previewType: "PREVIEW_UPDATE_PAGE",
    };
  }
  return null;
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [pageId, setPageId] = useState<string>("");
  const [page, setPage] = useState<PageData | null>(null);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [loadedPageId, setLoadedPageId] = useState<string | null>(null);

  // Operation states
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [reloadingIframe, setReloadingIframe] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Dialog states
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Emergency LocalStorage backup state
  const [localBackupFound, setLocalBackupFound] = useState<{
    content: any;
    timestamp: number;
  } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const schemaEditorRef = useRef<SchemaEditorRef>(null);
  const router = useRouter();

  const targetOrigin =
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";

  // Resolve page params promise
  useEffect(() => {
    params.then((p) => setPageId(p.id));
  }, [params]);

  // Fetch page data from backend API
  useEffect(() => {
    if (!pageId) return;

    fetch(`/api/pages/${pageId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load page");
        return res.json();
      })
      .then((data: PageData) => {
        setPage(data);
        // Approach B: Load draftContent if available, otherwise live content
        const initialContent = data.draftContent ?? data.content ?? {};
        setSchemaData(initialContent);
        setLoadedPageId(data.id);

        // Check for 10s emergency local storage backup
        try {
          const rawLocal = localStorage.getItem(`emergency_draft_${pageId}`);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            const dbTime = new Date(data.updatedAt).getTime();
            // If local storage is newer than DB timestamp and differs from initial content
            if (
              parsed.timestamp &&
              parsed.timestamp > dbTime &&
              JSON.stringify(parsed.content) !== JSON.stringify(initialContent)
            ) {
              setLocalBackupFound(parsed);
            } else if (
              JSON.stringify(parsed.content) === JSON.stringify(initialContent)
            ) {
              localStorage.removeItem(`emergency_draft_${pageId}`);
            }
          }
        } catch (err) {
          console.warn("Could not check local storage backup", err);
        }
      })
      .catch((err) => {
        console.error("Error fetching page:", err);
        toast.add({
          title: "Failed to load page",
          description: err.message,
          type: "error",
        });
      });
  }, [pageId]);

  // Calculate dirty states
  // Has uncommitted changes compared to DB's latest version (draft or live)
  const currentDbContent = page?.draftContent ?? page?.content;
  const isUnsavedChanges =
    Boolean(page && schemaData) &&
    JSON.stringify(schemaData) !== JSON.stringify(currentDbContent);

  // Content differs from live published content (needs publish)
  const isDirtyFromLive =
    Boolean(page && schemaData) &&
    (JSON.stringify(schemaData) !== JSON.stringify(page?.content) ||
      page?.status !== "published");

  const hasCloudDraft = Boolean(page?.draftContent);

  // Emergency LocalStorage auto-save every 10 seconds
  useEffect(() => {
    if (!pageId || !schemaData || !page || !isUnsavedChanges) return;

    const interval = setInterval(() => {
      try {
        const backup = {
          pageId,
          content: schemaData,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `emergency_draft_${pageId}`,
          JSON.stringify(backup),
        );
      } catch (err) {
        console.warn("Failed to write emergency backup to localStorage", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [pageId, schemaData, page, isUnsavedChanges]);

  // Prevent accidental tab close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUnsavedChanges]);

  // Action 1: Save Draft to Cloud Database
  async function handleSaveDraft() {
    if (!page) return;
    setSavingDraft(true);
    const contentPayload = schemaEditorRef.current?.getData() ?? schemaData;

    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-draft",
          content: contentPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save draft");
      }

      const updatedPage: PageData = await res.json();
      setPage(updatedPage);
      setSchemaData(contentPayload);
      localStorage.removeItem(`emergency_draft_${page.id}`);
      setLocalBackupFound(null);

      toast.add({
        title: "Draft Saved",
        description: "Saved draft to cloud. Live website remains unchanged.",
        type: "success",
      });
    } catch (error: any) {
      console.error("Save draft error:", error);
      toast.add({
        title: "Save Draft Failed",
        description: error.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setSavingDraft(false);
    }
  }

  // Action 2: Publish Changes Live
  async function handlePublish() {
    if (!page) return;

    // Validate form schema before publishing
    if (schemaEditorRef.current) {
      const isValid = await schemaEditorRef.current.validate();
      if (!isValid) {
        toast.add({
          title: "Validation Error",
          description: "Please fix the highlighted errors before publishing.",
          type: "error",
        });
        return;
      }
    }

    setPublishing(true);
    const contentPayload = schemaEditorRef.current?.getData() ?? schemaData;

    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          content: contentPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to publish page");
      }

      const updatedPage: PageData = await res.json();
      setPage(updatedPage);
      setSchemaData(contentPayload);
      localStorage.removeItem(`emergency_draft_${page.id}`);
      setLocalBackupFound(null);

      toast.add({
        title: "Page Published Live!",
        description: "Content is now live on the public site and ISR cache updated.",
        type: "success",
      });
    } catch (error: any) {
      console.error("Publish error:", error);
      toast.add({
        title: "Publish Failed",
        description: error.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setPublishing(false);
    }
  }

  // Action 3: Discard Draft
  async function handleDiscardDraft() {
    if (!page) return;
    setDiscarding(true);

    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discard-draft",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to discard draft");
      }

      const updatedPage: PageData = await res.json();
      setPage(updatedPage);
      localStorage.removeItem(`emergency_draft_${page.id}`);
      setLocalBackupFound(null);

      // Revert editor schema data back to live published content
      const revertedContent = updatedPage.content || {};
      setSchemaData(revertedContent);
      schemaEditorRef.current?.resetData(revertedContent);

      // Notify iframe preview of reverted content
      const schemaConfig = getSchemaConfig(page.slug);
      if (schemaConfig) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: schemaConfig.previewType, content: revertedContent },
          targetOrigin,
        );
      }

      setShowDiscardConfirm(false);
      toast.add({
        title: "Draft Discarded",
        description: "Reverted editor to the live published content.",
        type: "info",
      });
    } catch (error: any) {
      console.error("Discard draft error:", error);
      toast.add({
        title: "Discard Failed",
        description: error.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setDiscarding(false);
    }
  }

  // Iframe toolbar: ONLY Reload (per strict user instruction)
  const handleReloadIframe = useCallback(() => {
    setReloadingIframe(true);
    setIframeLoading(true);
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = "";
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 50);
    }
  }, []);

  // Send initial data when iframe loads
  function handleIframeLoad() {
    setIframeLoading(false);
    setReloadingIframe(false);
    const schemaConfig = getSchemaConfig(page?.slug);
    if (page && schemaConfig && schemaData) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: schemaConfig.previewType, content: schemaData },
        targetOrigin,
      );
    }
  }

  if (!page || loadedPageId !== pageId) {
    return (
      <ScreenLoader
        delayMs={0}
        text="Loading Page Editor..."
        subtitle="Loading schema, draft state, and live preview..."
      />
    );
  }

  const schemaConfig = getSchemaConfig(page.slug);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Emergency LocalStorage Backup Bar */}
      {localBackupFound && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              <strong>Emergency Local Backup Found:</strong> You have uncommitted changes
              from {new Date(localBackupFound.timestamp).toLocaleTimeString()}. Would you like to restore them?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSchemaData(localBackupFound.content);
                schemaEditorRef.current?.resetData(localBackupFound.content);
                if (schemaConfig) {
                  iframeRef.current?.contentWindow?.postMessage(
                    {
                      type: schemaConfig.previewType,
                      content: localBackupFound.content,
                    },
                    targetOrigin,
                  );
                }
                setLocalBackupFound(null);
                toast.add({
                  title: "Local backup restored",
                  description: "Editor updated from local snapshot.",
                  type: "success",
                });
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xs cursor-pointer shadow-xs transition-colors"
            >
              Restore Backup
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(`emergency_draft_${pageId}`);
                setLocalBackupFound(null);
                toast.add({ title: "Local backup dismissed", type: "info" });
              }}
              className="px-2.5 py-1 bg-transparent hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold rounded-xs cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card shrink-0 shadow-sm z-10">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (isUnsavedChanges) {
                setShowExitConfirm(true);
              } else {
                router.push("/webpages");
              }
            }}
            className="p-2 rounded-sm bg-black border border-black hover:bg-zinc-800 transition-all text-white shadow-sm cursor-pointer"
            title="Back to Webpages"
          >
            <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-bold text-black tracking-tight">
                {page.title}
              </h1>
              {/* Draft / Live Badges */}
              {hasCloudDraft ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Draft
                </span>
              ) : page.status === "published" ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-300 shadow-xs">
                  Draft
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 font-medium">Slug : {page.slug}</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* External Live Site Link */}
          <a
            href={`${targetOrigin}${
              page.slug === "/"
                ? ""
                : page.slug.startsWith("/")
                  ? page.slug
                  : `/${page.slug}`
            }?v=${encodeURIComponent(page.updatedAt || "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-sm transition-all shadow-xs"
          >
            <span>View Live</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
          </a>

          {/* Discard Draft Button (Visible when cloud draft exists) */}
          {hasCloudDraft && (
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              disabled={discarding || savingDraft || publishing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{discarding ? "Discarding..." : "Discard Draft"}</span>
            </button>
          )}

          {/* Save Draft Button (Cloud DB) */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing || !isUnsavedChanges}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-sm border transition-all ${
              savingDraft || publishing || !isUnsavedChanges
                ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                : "bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 shadow-xs cursor-pointer"
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{savingDraft ? "Saving..." : "Save Draft"}</span>
          </button>

          {/* Publish Changes Button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || savingDraft || (!isDirtyFromLive && !hasCloudDraft)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-sm shadow-sm transition-all ${
              publishing || savingDraft || (!isDirtyFromLive && !hasCloudDraft)
                ? "bg-black/40 text-white/70 cursor-not-allowed"
                : "bg-black hover:bg-zinc-800 text-white cursor-pointer hover:scale-[1.01]"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {publishing
                ? "Publishing..."
                : page.status === "published"
                  ? "Publish Changes"
                  : "Publish Page"}
            </span>
          </button>
        </div>
      </header>

      {/* Editor + Preview Split Panels */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        {/* Left: Schema Editor Panel */}
        <ResizablePanel
          defaultSize="25"
          minSize="20"
          maxSize="60"
          className="overflow-y-auto border-r border-border bg-black/3 dark:bg-white/3 flex flex-col"
        >
          {schemaConfig ? (
            <SchemaEditor
              ref={schemaEditorRef}
              initialData={page.draftContent ?? page.content}
              iframeRef={iframeRef}
              onDataChange={setSchemaData}
              uiSchema={schemaConfig.uiSchema}
              zodSchema={schemaConfig.schema}
              previewEventType={schemaConfig.previewType}
              title={page.title}
            />
          ) : (
            <div className="p-6 text-sm text-zinc-500">
              No schema editor configuration found for slug &quot;{page.slug}&quot;.
            </div>
          )}
        </ResizablePanel>

        {/* Resizer Handle */}
        <ResizableHandle withHandle />

        {/* Right: Live Preview Panel */}
        <ResizablePanel
          defaultSize="75"
          className="overflow-hidden bg-zinc-950 relative flex items-center justify-center p-4"
        >
          <div className="w-full h-full bg-zinc-900 shadow-2xl rounded-xl overflow-hidden ring-1 ring-border relative">
            {/* Minimal Iframe Toolbar (ONLY Reload, per instructions) */}
            <div className="absolute top-3 right-3 z-20 flex items-center bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={handleReloadIframe}
                disabled={reloadingIframe}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                title="Reload Live Preview"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${
                    reloadingIframe ? "animate-spin text-amber-400" : ""
                  }`}
                />
                <span>Reload</span>
              </button>
            </div>

            {/* Iframe Loading Spinner */}
            {iframeLoading && (
              <div className="absolute inset-0 bg-[#050505] z-10 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#F5A817] border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-zinc-400">
                  Loading Live Preview...
                </span>
              </div>
            )}

            {/* Live Preview Iframe */}
            <iframe
              ref={iframeRef}
              src={`${targetOrigin}${
                page.slug === "/"
                  ? ""
                  : page.slug.startsWith("/")
                    ? page.slug
                    : `/${page.slug}`
              }?preview=true&secret=${page.previewSecret || ""}`}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that have not been saved to draft or published.
              Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
              Stay Here
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push("/webpages")}
              className="bg-black hover:bg-zinc-800 text-white"
            >
              Exit Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Draft Confirmation Dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Draft Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the current cloud draft and restore the
              editor to the live published version. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardDraft}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {discarding ? "Discarding..." : "Discard Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
