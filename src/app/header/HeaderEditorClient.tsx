"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { headerSchema, headerZodSchema } from "@/lib/schemas/header/header-validation";
import { EditorRenderer } from "@/components/EditorRenderer";
import { saveHeaderData } from "./actions";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { toast } from "@/components/ui/toast";

export default function HeaderEditorClient({ initialData }: { initialData: any }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { control, handleSubmit, watch, reset, formState: { isDirty } } = useForm({
    resolver: zodResolver(headerZodSchema as any),
    defaultValues: initialData,
  });

  const formData = watch();

  // Live preview postMessage to main.zoro
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "HEADER_UPDATE", data: formData },
        "*"
      );
    }
  }, [formData]);

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    const result = await saveHeaderData(data);
    setIsSaving(false);
    if (result.success) {
      setSaved(true);
      reset(data);
      toast.add({ title: "Header published successfully", type: "success" });
      setTimeout(() => setSaved(false), 2500);
    } else {
      toast.add({ title: "Failed to save header", type: "error" });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
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
            className="p-2 rounded-sm bg-black border border-black hover:bg-card-hover transition-all text-muted shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-black tracking-tight">
              Global Header
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving || !isDirty}
            className="px-4 py-4 text-xs font-bold bg-black hover:bg-black/90 text-white rounded-sm shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? "Publishing..." : "Publish Changes"}
          </button>
        </div>
      </header>

      {/* Editor + Preview */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        {/* Left: Editor Panel */}
        <ResizablePanel 
          defaultSize="30" 
          minSize="20" 
          maxSize="60"    
          className="border-r border-border bg-black/3 dark:bg-white/3 flex flex-col overflow-hidden"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col h-full bg-transparent overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-black/3 dark:bg-white/3 backdrop-blur z-10 shrink-0">
              <div>
                <h2 className="text-xs font-bold text-black uppercase tracking-wider">
                  Header Settings
                </h2>
                <p className="text-[11px] text-black/50 font-medium mt-0.5">
                  Dynamic schema-driven input controls
                </p>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto pb-5 space-y-6">
              <EditorRenderer schema={headerSchema} control={control} />
            </div>
          </form>
        </ResizablePanel>

        <ResizableHandle className="w-1.5 bg-transparent hover:bg-black transition-colors relative z-10" />

        {/* Right: Live Preview Iframe */}
        <ResizablePanel 
          defaultSize="70"
          className="overflow-hidden bg-black/6 dark:bg-white/6 relative flex items-center justify-center p-4 lg:p-4"
        >
          <div className="w-full h-full bg-white shadow-xl rounded-xl overflow-hidden ring-1 ring-border relative">
            <iframe
              ref={iframeRef}
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/?editor=header`}
              className="w-full h-full border-0"
              title="Main Site Preview"
              onLoad={(e) => {
                (e.target as HTMLIFrameElement).contentWindow?.postMessage(
                  { type: "HEADER_UPDATE", data: formData },
                  "*"
                );
              }}
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
