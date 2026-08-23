"use client";

import { Image as ImageIcon, Trash2, Pencil, UploadCloud, Loader2, X} from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadBlockProps {
  value: { url?: string; alt?: string; title?: string } | string | undefined;
  onChange: (value: { url: string; alt?: string; title?: string } | undefined) => void;
}

export function ImageUploadBlock({ value, onChange }: ImageUploadBlockProps) {
  // Normalize value to an object if it's a string from legacy data
  const normalizedValue = typeof value === "string" ? { url: value } : value;
  
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [altInput, setAltInput] = useState(normalizedValue?.alt || "");
  const [titleInput, setTitleInput] = useState(normalizedValue?.title || "");

  const [activeTab, setActiveTab] = useState<"upload" | "media">("upload");
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  // Upload Tab States
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async (cursor?: string) => {
    setIsLoadingMedia(true);
    try {
      const url = new URL("/api/cloudinary/images", window.location.origin);
      if (cursor) url.searchParams.append("next_cursor", cursor);
      
      const res = await fetch(url.toString());
      const data = await res.json();
      
      if (cursor) {
        setMediaItems(prev => [...prev, ...(data.images || [])]);
      } else {
        setMediaItems(data.images || []);
      }
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      console.error("Error fetching media:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (isMediaModalOpen && activeTab === "media" && mediaItems.length === 0) {
      fetchMedia();
    }
  }, [isMediaModalOpen, activeTab]);

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
        // Switch to media tab and put the new image at the top
        setMediaItems([data, ...mediaItems]);
        setActiveTab("media");
        setSelectedMedia(data);
      } else {
        console.error("Cloudinary upload failed", data);
      }
    } catch (err) {
      console.error("Error uploading image:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative w-full">
      {/* Inline Block Preview */}
      {normalizedValue?.url ? (
        <div className="relative group w-full h-40 rounded-sm overflow-hidden border border-border bg-black/5 flex items-center justify-center">
          <Image
            src={normalizedValue.url}
            alt={normalizedValue.alt || "Preview"}
            fill
            className="object-contain"
          />
          
          <div 
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10"
            onClick={() => setIsMediaModalOpen(true)}
          >
            <span className="text-white text-sm font-medium">Replace Image</span>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
              className="p-1.5 bg-black/70 hover:bg-black text-white rounded-md transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
              className="p-1.5 bg-black/70 hover:bg-red-500 text-white rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsMediaModalOpen(true)}
          className="w-full h-40 border-2 border-dashed border-border hover:border-black hover:bg-black/5 transition-colors rounded-sm flex flex-col items-center justify-center cursor-pointer gap-2 group"
        >
          <ImageIcon className="w-6 h-6 text-black/40 group-hover:text-black transition-colors" />
          <span className="text-sm font-bold text-black/30 group-hover:text-black transition-colors">Select or Upload Image</span>
        </div>
      )}

      {/* Main Media Library Modal */}
      <Dialog open={isMediaModalOpen} onOpenChange={setIsMediaModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[85vw] w-full h-[85vh] p-0 flex flex-col overflow-hidden bg-background border-border">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-xl font-bold">Media Library</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden h-full">
            {/* Left Content Area */}
            <div className={`flex flex-col h-full border-r border-border transition-all ${selectedMedia && activeTab === 'media' ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
              
              {/* Custom Tabs Header */}
              <div className="flex px-6 pt-4 gap-6 border-b border-border bg-card shrink-0">
                <button 
                  onClick={() => setActiveTab("upload")}
                  className={`pb-3 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === 'upload' ? 'border-black text-black' : 'border-transparent text-black/50 hover:text-black'}`}
                >
                  Upload Files
                </button>
                <button 
                  onClick={() => setActiveTab("media")}
                  className={`pb-3 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === 'media' ? 'border-black text-black' : 'border-transparent text-black/50 hover:text-foreground'}`}
                >
                  Media Library
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/10 relative">
                
                {/* Upload Tab */}
                {activeTab === "upload" && (
                  <div className="h-full flex flex-col items-center justify-center">
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
                      className={`w-full max-w-2xl h-80 border-2 border-dashed transition-colors rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer ${
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
                )}

                {/* Media Library Tab */}
                {activeTab === "media" && (
                  <div className="flex flex-col h-full relative">
                    {isLoadingMedia && mediaItems.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                        <Loader2 className="w-10 h-10 text-black animate-spin mb-4" />
                        <span className="text-sm font-semibold text-black uppercase tracking-wider">Loading Media...</span>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {mediaItems.map((item: any) => (
                        <div 
                          key={item.public_id}
                          onClick={() => setSelectedMedia(item)}
                          className={`relative aspect-video cursor-pointer border-2 rounded-md overflow-hidden bg-gray-200 transition-all ${selectedMedia?.public_id === item.public_id ? 'border-black shadow-md shadow-black/20 scale-[0.98]' : 'border-transparent hover:border-black/30 hover:shadow-sm'}`}
                        >
                          <Image
                            src={item.secure_url}
                            alt={item.public_id}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                    
                    {isLoadingMedia && mediaItems.length > 0 && (
                      <div className="w-full flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-muted animate-spin" />
                      </div>
                    )}

                    {nextCursor && !isLoadingMedia && (
                      <div className="w-full flex justify-center py-8">
                        <button 
                          onClick={() => fetchMedia(nextCursor)}
                          className="px-6 py-2 bg-card border border-border text-foreground font-semibold text-sm rounded-md shadow-sm hover:bg-black/10 hover:border-black hover:text-black transition-all"
                        >
                          Load More
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Right Sidebar (Details) */}
            <div 
              className={`shrink-0 bg-card border-border flex flex-col h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                selectedMedia && activeTab === 'media' 
                  ? 'w-[320px] border-l opacity-100 translate-x-0' 
                  : 'w-0 border-l-0 opacity-0 translate-x-10'
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
                    
                    <div className="w-full aspect-square relative bg-gray-200 border border-border rounded-md overflow-hidden mb-4">
                      <Image src={selectedMedia.secure_url} alt="Selected" fill className="object-contain" />
                    </div>
                    
                    <div className="flex flex-col gap-3 text-sm text-foreground/80 mb-6">
                      <div className="flex flex-col mb-4">
                        <span className="font-semibold text-foreground truncate break-all">{selectedMedia.public_id}</span>
                        <span className="text-xs text-black/50">
                          {(() => {
                            const d = new Date(selectedMedia.created_at);
                            return `${String(d.getDate()).padStart(2, '0')} - ${String(d.getMonth() + 1).padStart(2, '0')} - ${d.getFullYear()}`;
                          })()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-t border-border/50">
                        <span className="text-black">Size</span>
                        <span className="font-medium">{formatBytes(selectedMedia.bytes)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-border/50">
                        <span className="text-black">Format</span>
                        <span className="font-medium uppercase">{selectedMedia.format}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-y border-border/50">
                        <span className="text-black">Dimensions</span>
                        <span className="font-medium">{selectedMedia.width} × {selectedMedia.height} px</span>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Footer Action */}
                  <div className="p-5 bg-background border-t border-border shrink-0">
                    <button
                      onClick={() => {
                        onChange({ 
                          ...normalizedValue, 
                          url: selectedMedia.secure_url, 
                          alt: altInput, 
                          title: titleInput 
                        });
                        setIsMediaModalOpen(false);
                      }}
                      className="w-full py-2.5 bg-black text-white font-bold text-sm rounded-md shadow-sm hover:bg-black/90 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                      Select Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Metadata Edit Modal (For inline edits) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-156">
          <DialogHeader>
            <DialogTitle>Edit Image Metadata</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {normalizedValue?.url && (
              <div className="relative w-full h-72 rounded-sm overflow-hidden bg-black/5 border border-border">
                <Image src={normalizedValue.url} alt="Preview" fill className="object-contain" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="font-semibold text-lg">Image Title</Label>
              <Input 
                id="title" 
                value={titleInput} 
                onChange={(e) => setTitleInput(e.target.value)} 
                placeholder="e.g. Hero Background Image"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="alt" className="font-semibold text-lg">Alt Text</Label>
              <Input 
                id="alt" 
                value={altInput} 
                onChange={(e) => setAltInput(e.target.value)} 
                placeholder="e.g. A glowing brain bulb"
              />
            </div>
          </div>
          <DialogFooter>
            <button 
              onClick={() => {
                onChange({ ...normalizedValue, url: normalizedValue?.url || "", alt: altInput, title: titleInput });
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 bg-black text-white font-semibold rounded-sm hover:bg-black/90 transition-colors text-sm cursor-pointer"
            >
              OK / Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
