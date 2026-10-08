"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2Icon, RefreshCcwIcon, PlusIcon, Loader2, X, UploadCloud, DownloadIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "@/components/ui/toast";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { CopyButton } from "@/components/ui/copy-button";
import { clientConfig } from "@/lib/config/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CloudinaryImage {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  created_at: string;
  bytes: number;
}

export default function MediaPage() {
  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<CloudinaryImage | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages(cursor?: string) {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const url = new URL("/api/cloudinary/images", window.location.origin);
      if (cursor) url.searchParams.append("next_cursor", cursor);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.images) {
        if (cursor) {
          setImages((prev) => [...prev, ...data.images]);
        } else {
          setImages(data.images);
        }
        setNextCursor(data.next_cursor || null);
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
      toast.add({ title: "Error", description: "Failed to load images.", type: "error" });
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await fetch("/api/cloudinary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: deleteId }),
      });
      setImages((prev) => prev.filter((img) => img.public_id !== deleteId));
      if (selectedMedia?.public_id === deleteId) {
        setSelectedMedia(null);
      }
      toast.add({ title: "Deleted", description: "Image permanently deleted.", type: "success" });
    } catch (err) {
      console.error("Failed to delete image:", err);
      toast.add({ title: "Error", description: "Failed to delete image.", type: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  const handleUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", clientConfig.cloudinary.uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${clientConfig.cloudinary.cloudName}/image/upload`, {
          method: "POST",
          body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setImages((prev) => [data, ...prev]);
        setIsUploadModalOpen(false);
        setSelectedMedia(data);
        toast.add({ title: "Success", description: "Image uploaded successfully.", type: "success" });
      } else {
        console.error("Cloudinary upload failed", data);
        toast.add({ title: "Error", description: "Failed to upload image.", type: "error" });
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.add({ title: "Error", description: "Failed to upload image.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="flex flex-col h-dvh w-full overflow-hidden bg-background">
        <AdminTopBar breadcrumbs="Media Library" />

        {/* Responsive Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-4 sm:py-5 px-4 sm:px-6 md:px-8 border-b border-border shrink-0 bg-background shadow-2xs z-20">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Cloudinary Media
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage images uploaded to your cloud storage.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => fetchImages()}
              disabled={loading}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-xs sm:text-sm font-semibold disabled:opacity-50 cursor-pointer"
              title="Refresh media list"
            >
              <RefreshCcwIcon
                className={`size-3.5 sm:size-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-black/90 dark:hover:bg-white/90 transition-colors text-xs sm:text-sm font-bold shadow-xs cursor-pointer active:scale-98"
            >
              <PlusIcon className="size-3.5 sm:size-4" />
              <span>Add Media</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative bg-muted/10">
          {/* Left: Image Grid Container */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
              {loading && images.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4">
                  {[...Array(24)].map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
                  <div className="p-6 bg-card border border-border rounded-2xl flex flex-col items-center justify-center max-w-sm w-full text-center shadow-xs">
                    <p className="text-sm text-muted-foreground mb-4 font-medium">
                      No images found in Cloudinary.
                    </p>
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-black/90 dark:hover:bg-white/90 transition-colors text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Upload First Image
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4">
                    {images.map((img) => {
                      const isSelected = selectedMedia?.public_id === img.public_id;
                      return (
                        <div
                          key={img.public_id}
                          onClick={() => setSelectedMedia(img)}
                          className={`relative aspect-square cursor-pointer border-2 rounded-xl overflow-hidden bg-muted transition-all active:scale-[0.98] group ${
                            isSelected
                              ? "border-black dark:border-white shadow-md shadow-black/10 dark:shadow-white/10 scale-[0.98]"
                              : "border-transparent hover:border-black/30 dark:hover:border-white/30 hover:shadow-xs"
                          }`}
                        >
                          <Image
                            src={img.secure_url}
                            alt={img.public_id}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className="object-cover"
                          />

                          {/* Desktop Hover Overlay (hidden on small touch screens) */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex flex-col justify-between p-2.5 sm:p-3 pointer-events-none">
                            <div className="text-[10px] text-white/90 font-mono break-all line-clamp-2 leading-tight">
                              {img.public_id}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(img.public_id);
                              }}
                              className="self-end p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors pointer-events-auto shadow-xs cursor-pointer"
                              title="Delete Image"
                            >
                              <Trash2Icon className="size-3.5 sm:size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {nextCursor && (
                    <div className="flex justify-center mt-8 mb-4">
                      <button
                        onClick={() => fetchImages(nextCursor)}
                        disabled={isLoadingMore}
                        className="flex items-center gap-2 px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs sm:text-sm rounded-lg shadow-xs hover:bg-black/90 dark:hover:bg-white/90 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isLoadingMore && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        <span>{isLoadingMore ? "Loading..." : "Load More"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Backdrop for Details Drawer */}
          {selectedMedia && (
            <div
              onClick={() => setSelectedMedia(null)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
              aria-hidden="true"
            />
          )}

          {/* Right Sidebar: Attachment Details (Drawer on mobile/tablet, Sidebar on desktop) */}
          <aside
            className={`
              fixed inset-y-0 right-0 z-50 w-full sm:w-90 md:w-95 bg-card border-l border-border shadow-2xl flex flex-col h-full overflow-hidden transition-transform duration-300 ease-in-out
              lg:static lg:z-auto lg:shadow-none lg:w-[320px] lg:shrink-0 lg:border-l lg:border-border
              ${selectedMedia ? "translate-x-0" : "translate-x-full lg:hidden"}
            `}
          >
            {selectedMedia && (
              <div className="flex flex-col h-full w-full">
                {/* Details Scrollable Body */}
                <div className="p-4 sm:p-5 border-b border-border flex-1 overflow-y-auto space-y-4">
                  <div className="flex justify-between items-center pb-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                      Attachment Details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedMedia(null)}
                      className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Close details"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Image Preview */}
                  <div className="w-full aspect-square relative bg-muted/40 border border-border rounded-xl overflow-hidden">
                    <Image
                      src={selectedMedia.secure_url}
                      alt="Selected"
                      fill
                      sizes="360px"
                      className="object-contain p-2"
                    />
                  </div>

                  {/* Metadata Fields */}
                  <div className="space-y-3 text-sm text-foreground/80">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground text-xs font-mono break-all leading-snug block">
                        {selectedMedia.public_id}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {selectedMedia.created_at
                          ? (() => {
                              const d = new Date(selectedMedia.created_at);
                              return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
                            })()
                          : "Unknown Date"}
                      </span>
                    </div>

                    <div className="divide-y divide-border/60 text-xs font-medium">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground">Size</span>
                        <span className="text-muted-foreground font-mono">
                          {formatBytes(selectedMedia.bytes)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground">Format</span>
                        <span className="uppercase text-muted-foreground font-mono">
                          {selectedMedia.format}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground">Dimensions</span>
                        <span className="text-muted-foreground font-mono">
                          {selectedMedia.width} × {selectedMedia.height} px
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary URL Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <CopyButton
                      value={selectedMedia.secure_url}
                      withText
                      idleText="Copy Image URL"
                      copiedText="URL Copied!"
                      label="Image URL"
                      className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs rounded-lg justify-center shadow-xs cursor-pointer active:scale-98"
                    />
                    <a
                      href={selectedMedia.secure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-semibold text-xs cursor-pointer"
                    >
                      <DownloadIcon className="w-3.5 h-3.5" />
                      <span>View Original Image</span>
                    </a>
                  </div>
                </div>

                {/* Sidebar Footer Action */}
                <div className="p-4 sm:p-5 bg-background border-t border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setDeleteId(selectedMedia.public_id)}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Upload Media Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 overflow-hidden bg-background border-border">
          <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Upload New Media
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 sm:p-6">
            <div className="h-55 sm:h-70 flex flex-col items-center justify-center">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0])
                    handleUpload(e.target.files[0]);
                }}
              />
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0])
                    handleUpload(e.dataTransfer.files[0]);
                }}
                className={`w-full h-full border-2 border-dashed transition-colors rounded-xl flex flex-col items-center justify-center gap-3 sm:gap-4 p-4 cursor-pointer ${
                  isDragging
                    ? "border-black bg-black/10 dark:border-white dark:bg-white/10"
                    : "border-border hover:border-black dark:hover:border-white hover:bg-muted/40 bg-background"
                } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-foreground animate-spin" />
                    <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                      Uploading...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="p-3 sm:p-4 bg-muted/40 rounded-full">
                      <UploadCloud
                        className={`w-6 h-6 sm:w-8 sm:h-8 ${
                          isDragging
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <span className="text-sm sm:text-base font-semibold text-foreground">
                        Drop files to upload
                      </span>
                      <span className="text-xs text-muted-foreground">or</span>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black font-semibold text-xs rounded-md shadow-xs hover:bg-black/90 dark:hover:bg-white/90 cursor-pointer"
                      >
                        Select Files
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="max-w-[92vw] sm:max-w-lg bg-card border border-border p-5 sm:p-6 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl font-bold text-foreground">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
              This action cannot be undone. This will permanently delete this
              image from your Cloudinary storage. Any webpage currently using
              this image will have a broken link!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 sm:mt-6 gap-2 sm:gap-3 flex-col sm:flex-row">
            <AlertDialogCancel
              disabled={isDeleting}
              className="px-4 py-2 text-xs sm:text-sm"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-xs sm:text-sm font-bold"
            >
              {isDeleting ? "Deleting..." : "Permanent Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
