"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
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
  EditorDraftBanner,
  EditorTopBar,
  ExitConfirmModal,
  DiscardDraftModal,
} from "@/components/editor-shell";
import { ScreenLoader } from "@/components/ui/screen-loader";
import { useEmergencyDraft, getEmergencyBackup } from "@/hooks/useEmergencyDraft";

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

  // Tracks the serialized content string that matches the DB/saved version
  const [savedBaselineString, setSavedBaselineString] = useState<string>("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Operation states
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [reloadingIframe, setReloadingIframe] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Dialog states
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const schemaEditorRef = useRef<SchemaEditorRef>(null);
  const router = useRouter();

  const targetOrigin = process.env.NEXT_PUBLIC_FRONTEND_URL || "";

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
        let initialContent = data.draftContent ?? data.content ?? {};

        // Seamless auto-load from emergency local backup if newer, without blocking prompts
        const dbTime = new Date(data.updatedAt).getTime();
        const backup = getEmergencyBackup<any>(`emergency_draft_${pageId}`, dbTime);
        if (backup) {
          initialContent = backup.data;
        }

        setSchemaData(initialContent);
        setLoadedPageId(data.id);
        setSavedBaselineString(JSON.stringify(initialContent));

        if (data.draftContent) {
          try {
            const date = new Date(data.updatedAt);
            setLastSavedAt(
              date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            );
          } catch {
            // fallback
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching page:", err);
        toast.add({
          title: "Couldn't load this page",
          description: "Something went wrong while opening the editor. Please refresh and try again.",
          type: "error",
        });
      });
  }, [pageId]);

  // Calculate accurate dirty states
  // isUnsavedChanges: user has typed new edits that haven't been saved to draft or published
  const isUnsavedChanges =
    Boolean(page && schemaData && savedBaselineString) &&
    JSON.stringify(schemaData) !== savedBaselineString;

  // isDirtyFromLive: content differs from live published content (needs publish)
  const isDirtyFromLive =
    Boolean(page && schemaData) &&
    (JSON.stringify(schemaData) !== JSON.stringify(page?.content) ||
      page?.status !== "published");

  const hasCloudDraft = Boolean(page?.draftContent);

  const { clearBackup } = useEmergencyDraft({
    key: `emergency_draft_${pageId}`,
    isDirty: isUnsavedChanges,
    getPayload: () => schemaData,
  });

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
      setPage((prev) => ({
        ...updatedPage,
        previewSecret: updatedPage.previewSecret || prev?.previewSecret || "",
      }));
      setSchemaData(contentPayload);
      setSavedBaselineString(JSON.stringify(contentPayload));
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
      clearBackup();

      // Re-send the saved content to the preview iframe so it stays in sync
      const config = getSchemaConfig(page.slug);
      if (config) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: config.previewType, content: contentPayload },
          targetOrigin,
        );
      }

      // Broadcast to any open full screen preview tab
      if (pageId) {
        try {
          const channel = new BroadcastChannel(`page_preview_${pageId}`);
          channel.postMessage({
            type: "PAGE_DRAFT_UPDATED",
            id: pageId,
            content: contentPayload,
          });
          channel.close();
        } catch {}
      }

      toast.add({
        title: "Draft saved",
        description: "Your changes are safely saved. The live website hasn't been updated yet.",
        type: "success",
      });
    } catch (error: any) {
      console.error("Save draft error:", error);
      toast.add({
        title: "Couldn't save draft",
        description: "Please check your connection and try again.",
        type: "error",
      });
    } finally {
      setSavingDraft(false);
    }
  }

  // Action 1B: Save Draft and immediately exit to Webpages
  async function handleSaveDraftAndExit() {
    await handleSaveDraft();
    router.push("/webpages");
  }

  // Action 2: Publish Changes Live
  async function handlePublish() {
    if (!page) return;

    // Validate form schema before publishing
    if (schemaEditorRef.current) {
      const isValid = await schemaEditorRef.current.validate();
      if (!isValid) {
        toast.add({
          title: "Some fields need attention",
          description: "Please fix the highlighted fields before publishing.",
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
      setPage((prev) => ({
        ...updatedPage,
        previewSecret: updatedPage.previewSecret || prev?.previewSecret || "",
      }));
      setSchemaData(contentPayload);
      setSavedBaselineString(JSON.stringify(contentPayload));
      setLastSavedAt(null);
      clearBackup();

      toast.add({
        title: "Page is now live!",
        description: "Your changes are published and visible on the website.",
        type: "success",
      });
    } catch (error: any) {
      console.error("Publish error:", error);
      toast.add({
        title: "Couldn't publish",
        description: "Something went wrong. Please try again in a moment.",
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
      setPage((prev) => ({
        ...updatedPage,
        previewSecret: updatedPage.previewSecret || prev?.previewSecret || "",
      }));
      clearBackup();

      // Revert editor schema data back to live published content
      const revertedContent = updatedPage.content || {};
      setSchemaData(revertedContent);
      setSavedBaselineString(JSON.stringify(revertedContent));
      setLastSavedAt(null);
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
        title: "Draft discarded",
        description: "The editor is back to the current live version.",
        type: "info",
      });
    } catch (error: any) {
      console.error("Discard draft error:", error);
      toast.add({
        title: "Couldn't discard draft",
        description: "Something went wrong. Please try again.",
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

  // Send initial data when iframe loads (delay to let React mount inside iframe)
  function handleIframeLoad() {
    setIframeLoading(false);
    setReloadingIframe(false);
    const schemaConfig = getSchemaConfig(page?.slug);
    if (page && schemaConfig && schemaData) {
      // Small delay ensures the iframe's React app has mounted its postMessage listener
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: schemaConfig.previewType, content: schemaData },
          targetOrigin,
        );
      }, 500);
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
      {/* Draft Info Banner — shown at very top when a cloud draft is active */}
      <EditorDraftBanner
        hasDraft={hasCloudDraft}
        lastSavedAt={lastSavedAt}
        onDiscard={() => setShowDiscardConfirm(true)}
        isDiscarding={discarding}
      />

      {/* Top Header Bar */}
      <EditorTopBar
        title={page.title}
        slug={page.slug}
        status={page.status}
        hasCloudDraft={hasCloudDraft}
        isDirty={isUnsavedChanges}
        lastSavedAt={lastSavedAt}
        onBack={() => {
          if (isUnsavedChanges) {
            setShowExitConfirm(true);
          } else {
            router.push("/webpages");
          }
        }}
        backTitle="Back to Webpages"
        viewLiveUrl={`${targetOrigin}${
          page.slug === "/"
            ? ""
            : page.slug.startsWith("/")
              ? page.slug
              : `/${page.slug}`
        }`}
        onPreview={() => {
          if (!pageId) return;
          window.open(`/webpages/preview/${pageId}`, `page_preview_${pageId}`);
        }}
        onSaveDraft={handleSaveDraft}
        isSavingDraft={savingDraft}
        canSaveDraft={isUnsavedChanges}
        onPublish={handlePublish}
        isPublishing={publishing}
        canPublish={isDirtyFromLive || hasCloudDraft || isUnsavedChanges}
        publishLabel={page.status === "published" ? "Publish Changes" : "Publish Page"}
      />

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
              }?preview=true${page.previewSecret ? `&secret=${encodeURIComponent(page.previewSecret)}` : ""}`}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Exit Confirmation Dialog */}
      <ExitConfirmModal
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        onStay={() => setShowExitConfirm(false)}
        onExitWithoutSave={() => router.push("/webpages")}
        onSaveAndExit={handleSaveDraftAndExit}
        isSubmitting={savingDraft}
      />

      {/* Discard Draft Confirmation Dialog */}
      <DiscardDraftModal
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirmDiscard={handleDiscardDraft}
        isDiscarding={discarding}
      />
    </div>
  );
}
