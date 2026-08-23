"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2Icon, RefreshCcwIcon, PlusIcon, Loader2, X, UploadCloud, DownloadIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "@/components/ui/toast";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      setImages(images.filter((img) => img.public_id !== deleteId));
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
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "default_preset");

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setImages([data, ...images]);
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
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Media Library</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Top Header - Always visible because it's shrink-0 inside the flex column */}
      <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0 shadow-sm z-20">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Cloudinary Media
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage images uploaded to your cloud storage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchImages()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            <RefreshCcwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-bold shadow-sm cursor-pointer"
          >
            <PlusIcon className="size-4" />
            Add Media
          </button>
        </div>
      </div>

      {/* Main Content Area - Fills remaining space, overflows hidden on parent, internal scroll for grid */}
      <div className="flex flex-1 overflow-hidden relative bg-muted/10">
        {/* Left: Image Grid */}
        <div className={`flex flex-col h-full transition-all duration-300 ${selectedMedia ? 'w-[calc(100%-320px)] border-r border-border' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
                <div className="p-6 bg-card border rounded-2xl flex flex-col items-center justify-center max-w-sm w-full text-center shadow-sm">
                  <p className="text-muted-foreground mb-4">No images found in Cloudinary.</p>
                  <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-bold shadow-sm cursor-pointer"
                  >
                    Upload First Image
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {images.map((img) => (
                    <div 
                      key={img.public_id}
                      onClick={() => setSelectedMedia(img)}
                      className={`relative aspect-square cursor-pointer border-2 rounded-xl overflow-hidden bg-gray-200 transition-all group ${selectedMedia?.public_id === img.public_id ? 'border-black shadow-md shadow-black/20 scale-[0.98]' : 'border-transparent hover:border-black/30 hover:shadow-sm'}`}
                    >
                      <Image
                        src={img.secure_url}
                        alt={img.public_id}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 pointer-events-none">
                        <div className="text-[10px] text-white/90 font-mono break-all line-clamp-2 leading-tight">
                          {img.public_id}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(img.public_id);
                          }}
                          className="self-end p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors pointer-events-auto shadow-sm"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {nextCursor && (
                  <div className="flex justify-center mt-8 mb-4">
                    <button 
                      onClick={() => fetchImages(nextCursor)}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-bold text-sm rounded-lg shadow-sm hover:bg-black/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isLoadingMore ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Attachment Details */}
        <div 
          className={`shrink-0 bg-card flex flex-col h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            selectedMedia ? 'w-[320px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10'
          }`}
        >
            {selectedMedia && (
              <div className="flex flex-col h-full w-[320px]">
                <div className="p-5 border-b border-border flex-1 overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-black">Attachment Details</h3>
                    <button onClick={() => setSelectedMedia(null)} className="p-1 hover:bg-black/5 rounded-md transition-colors">
                      <X className="w-5 h-5 text-black/60 hover:text-black" />
                    </button>
                  </div>
                  
                  <div className="w-full aspect-square relative bg-muted border border-border rounded-xl overflow-hidden mb-4">
                    <Image src={selectedMedia.secure_url} alt="Selected" fill sizes="320px" className="object-contain" />
                  </div>
                  
                  <div className="flex flex-col gap-3 text-sm text-foreground/80 mb-6">
                    <div className="flex flex-col mb-4">
                      <span className="font-semibold text-foreground break-all">{selectedMedia.public_id}</span>
                      <span className="text-xs text-black/50">
                        {selectedMedia.created_at ? (() => {
                          const d = new Date(selectedMedia.created_at);
                          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                        })() : "Unknown Date"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-border/50">
                      <span className="text-black font-medium">Size</span>
                      <span className="font-medium text-muted-foreground">{formatBytes(selectedMedia.bytes)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-border/50">
                      <span className="text-black font-medium">Format</span>
                      <span className="font-medium uppercase text-muted-foreground">{selectedMedia.format}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-y border-border/50">
                      <span className="text-black font-medium">Dimensions</span>
                      <span className="font-medium text-muted-foreground">{selectedMedia.width} × {selectedMedia.height} px</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <a 
                      href={selectedMedia.secure_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium text-sm"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      View Original Image
                    </a>
                  </div>
                </div>

                {/* Sidebar Footer Action */}
                <div className="p-5 bg-background border-t border-border shrink-0">
                  <button
                    onClick={() => setDeleteId(selectedMedia.public_id)}
                    className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 font-bold text-sm rounded-lg hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Media Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-background border-border">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-xl font-bold">Upload New Media</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="h-[300px] flex flex-col items-center justify-center">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]);
                }}
              />
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault(); setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
                }}
                className={`w-full h-full border-2 border-dashed transition-colors rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer ${
                  isDragging ? "border-black bg-black/10" : "border-border hover:border-black hover:bg-black/5 bg-background"
                } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-10 h-10 text-black animate-spin" />
                    <span className="text-sm font-bold text-black uppercase tracking-wider">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-muted/20 rounded-full">
                      <UploadCloud className={`w-8 h-8 ${isDragging ? "text-black" : "text-black/50"}`} />
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="text-lg font-medium text-foreground">
                        Drop files to upload
                      </span>
                      <span className="text-sm font-medium text-muted">or</span>
                      <button type="button" className="px-4 py-2 bg-black text-white font-semibold rounded-md shadow-sm hover:bg-black/90 cursor-pointer">
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-2xl bg-white p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground mt-3">
              This action cannot be undone. This will permanently delete this image from your Cloudinary storage. Any webpage currently using this image will have a broken link!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel disabled={isDeleting} className="px-6 py-3 text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {   
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 text-base"
            >
              {isDeleting ? "Deleting..." : "Permanent Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
