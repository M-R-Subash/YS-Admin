"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { ChevronLeft, ChevronDown, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { Section, PageData } from "@/types";
import SchemaEditor from "@/components/admin/SchemaEditor";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { homepageUiSchema } from "@/lib/schemas/homepage/homepage-ui-schema";
import { homepageSchema } from "@/lib/schemas/homepage/homepage-validation";
import { careersUiSchema } from "@/lib/schemas/careers/careers-ui-schema";
import { careersSchema } from "@/lib/schemas/careers/careers-validation";
import { contactUiSchema } from "@/lib/schemas/contact/contact-ui-schema";
import { contactSchema } from "@/lib/schemas/contact/contact-validation";
import { servicesUiSchema } from "@/lib/schemas/services/services-ui-schema";
import { servicesSchema } from "@/lib/schemas/services/services-validation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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


const SECTION_DEFINITIONS: any[] = [];

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [pageId, setPageId] = useState<string>("");
  const [page, setPage] = useState<PageData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [schemaData, setSchemaData] = useState<any>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  // Initialize React Hook Form
  const { control, reset, watch, getValues, trigger, formState: { isDirty: formIsDirty } } = useForm<{
    content: Section[];
  }>({
    defaultValues: {
      content: [],
    },
  });

  // Manage field array for sections (read-only mapping)
  const { fields } = useFieldArray({
    control,
    name: "content",
  });

  // Resolve params promise
  useEffect(() => {
    params.then((p) => setPageId(p.id));
  }, [params]);

  const [editorReady, setEditorReady] = useState(false);

  // Fetch page data and reset form
  useEffect(() => {
    if (!pageId) return;
    setEditorReady(false);
    fetch(`/api/pages/${pageId}`)
      .then((res) => res.json())
      .then((data) => {
        setPage(data);
        if (getSchemaConfig(data.slug)) {
          setSchemaData(data.content);
        } else {
          reset({ content: data.content || [] });
        }
        setTimeout(() => {
          setEditorReady(true);
        }, 150);
      });
  }, [pageId, reset]);

  const isDirty = (page && getSchemaConfig(page.slug))
    ? JSON.stringify(schemaData) !== JSON.stringify(page?.content)
    : formIsDirty;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Send sections to iframe with 300ms debounce
  const sendToPreview = useCallback((updatedSections: Section[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "PREVIEW_UPDATE", sections: updatedSections },
        "*"
      );
    }, 300);
  }, []);

  // Sync content with preview when form fields change using subscription (avoids full page re-renders)
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.content) {
        sendToPreview(value.content as Section[]);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, sendToPreview]);

  const schemaEditorRef = useRef<{ validate: () => Promise<boolean> }>(null);

  // Save to database as published page
  async function savePage(status: "draft" | "published") {
    if (!page) return;
    
    let isValid = true;
    const schemaConfig = getSchemaConfig(page.slug);
    if (page.slug && schemaConfig) {
      if (schemaEditorRef.current) {
        isValid = await schemaEditorRef.current.validate();
      }
    } else {
      isValid = await trigger();
    }

    if (!isValid) {
      return;
    }

    setSaving(true);
    
    const contentPayload = (page.slug && schemaConfig) ? schemaData : getValues("content");
    const payloadBody = { status, content: contentPayload };

    await fetch(`/api/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadBody),
    });
    setPage({ ...page, status, content: contentPayload });
    if (!(page.slug && schemaConfig)) {
      reset({ content: contentPayload });
    }
    setSaving(false);
    setSaved(true);
    
    if (status === "published") {
      toast.add({ title: "Page published successfully", type: "success" });
    } else {
      toast.add({ title: "Page saved as draft", type: "success" });
    }

    setTimeout(() => setSaved(false), 2000);
  }

  const handlePublish = () => savePage("published");
  const handleSaveDraft = () => savePage("draft");

  // Toggle individual section collapse state
  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Collapse all sections
  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    fields.forEach((field) => {
      collapsed[field.id] = true;
    });
    setCollapsedSections(collapsed);
  };

  // Expand all sections
  const expandAll = () => {
    setCollapsedSections({});
  };

  const [iframeLoading, setIframeLoading] = useState(true);

  // Send initial data when iframe loads
  function handleIframeLoad() {
    setIframeLoading(false);
    const schemaConfig = getSchemaConfig(page?.slug);
    if (page && schemaConfig) {
      if (schemaData) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: schemaConfig.previewType, content: schemaData },
          "*"
        );
      }
    } else {
      const sections = getValues("content");
      if (sections && sections.length > 0) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "PREVIEW_UPDATE", sections },
          "*"
        );
      }
    }
  }

  if (!page || !editorReady) {
    return (
      <ScreenLoader
        delayMs={0}
        text="Loading Page Builder..."
        subtitle="Fetching page schema, blocks, and live preview..."
      />
    );
  }


  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (isDirty) {
                setShowExitConfirm(true);
              } else {
                router.push("/webpages");
              }
            }}
            className="p-2 rounded-sm bg-black border border-black hover:bg-card-hover transition-all text-white shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-black tracking-tight">
              {page.title}
            </h1>
            <p className="text-xs text-black font-medium">Slug : {page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}${
              page.slug === "/" ? "" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`
            }?nocache=${Date.now()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-sm transition-all shadow-xs"
          >
            <span>View Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-700" />
          </a>

          <button
            onClick={handlePublish}
            disabled={saving || (!isDirty && page.status === "published")}
            className={`px-4 py-2 text-xs font-bold rounded-sm shadow-md transition-all hover:scale-[1.02] ${
              saving || (!isDirty && page.status === "published")
                ? "bg-black/40 text-white/70 cursor-not-allowed opacity-60 hover:scale-100 shadow-none" 
                : "bg-black hover:bg-black/90 text-white cursor-pointer"
            }`}
          >
            {saving ? "Publishing..." : page.status === "published" ? "Publish Changes" : "Publish Page"}
          </button>
        </div>
      </header>

      {/* Editor + Preview */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        {/* Left: Editor Panel */}
        <ResizablePanel 
          defaultSize="25" 
          minSize="20" 
          maxSize="60"
          className="overflow-y-auto border-r border-border bg-black/3 dark:bg-white/3 flex flex-col"
        >
          {(() => {
            const schemaConfig = getSchemaConfig(page.slug);
            return page.slug && schemaConfig ? (
              <SchemaEditor 
                ref={schemaEditorRef}
                initialData={page.content} 
                iframeRef={iframeRef} 
                onDataChange={setSchemaData}
                uiSchema={schemaConfig.uiSchema}
                zodSchema={schemaConfig.schema}
                previewEventType={schemaConfig.previewType}
                title={page.title}
              />
            ) : (
            <form
              onSubmit={(e) => e.preventDefault()}
              className="p-5 flex-1 space-y-5"
            >
            {/* Global Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Page Blocks ({fields.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-[11px] font-bold text-accent hover:underline bg-transparent"
                >
                  Expand All
                </button>
                <span className="text-xs text-border">|</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-[11px] font-bold text-accent hover:underline bg-transparent"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {fields.map((field, index) => {
              const def = SECTION_DEFINITIONS.find(
                (d) => d.type === field.type
              );
              if (!def) return null;

              const isCollapsed = collapsedSections[field.id] || false;

              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow transition-shadow relative group/card"
                >
                  {/* Section Card Header */}
                  <div
                    onClick={() => toggleSection(field.id)}
                    className="px-5 py-3.5 bg-card-hover border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-card-hover/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {def.label}
                      </span>
                    </div>
                    {/* Minimize / Maximize Indicator */}
                    <div className="text-muted flex items-center gap-1">
                      <span className="text-[10px] font-semibold tracking-wider uppercase opacity-60">
                        {isCollapsed ? "Collapsed" : "Expanded"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transform transition-transform duration-200 ${
                          isCollapsed ? "" : "rotate-180"
                        }`}
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>

                  {/* Section Form Fields */}
                  <div className={isCollapsed ? "hidden" : "p-5 space-y-4"}>
                    {def.fields.map((f: any) => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                          {f.label}
                        </label>
                        <Controller
                          name={`content.${index}.data.${f.key}`}
                          control={control}
                          render={({ field: formField }) =>
                            f.type === "textarea" ? (
                              <textarea
                                {...formField}
                                value={formField.value || ""}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm font-medium resize-y focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all shadow-inner"
                              />
                            ) : (
                              <input
                                type="text"
                                {...formField}
                                value={formField.value || ""}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all shadow-inner"
                              />
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </form>
          );
        })()}
        </ResizablePanel>

        {/* Resizer Handle */}
        <ResizableHandle withHandle />

        {/* Right: Preview iframe */}
        <ResizablePanel 
          defaultSize="75"
          className="overflow-hidden bg-zinc-950 relative flex items-center justify-center p-4"
        >
          <div className="w-full h-full bg-zinc-900 shadow-xl rounded-xl overflow-hidden ring-1 ring-border relative">
            {iframeLoading && (
              <div className="absolute inset-0 bg-[#050505] z-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#F5A817] border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-zinc-400">Loading Live Preview...</span>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}${
                page.slug === "/" ? "" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`
              }?preview=true`}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to exit without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/webpages")}>Exit Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
