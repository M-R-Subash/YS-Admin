"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { blogQuickEditSchema, BlogQuickEditFormData } from "@/lib/schemas/seo-validation";
import { toast } from "@/components/ui/toast";
import { Loader2, ChevronDown } from "lucide-react";

interface BlogQuickEditModalProps {
  blogId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialData: any; // { title, slug, allowComments, featuredImage, authorId, seo: { ... } }
}

export function BlogQuickEditModal({
  blogId,
  isOpen,
  onClose,
  onSaved,
  initialData,
}: BlogQuickEditModalProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch users for the dropdown
  useEffect(() => {
    if (isOpen) {
      setIsLoadingUsers(true);
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.users)) {
            setUsers(data.users);
          }
        })
        .catch((err) => console.error("Failed to load users:", err))
        .finally(() => setIsLoadingUsers(false));
    }
  }, [isOpen]);

  // Build the initial values object so we can compare for dirty state
  const getDefaults = useMemo(() => {
    const hasCustom = !!initialData.seo?.authorName;
    const authorSelection = hasCustom ? "custom" : (initialData.authorId || "none");
    
    return {
      title: initialData.title || "",
      slug: initialData.slug || "",
      allowComments: initialData.allowComments ?? true,
      metaTitle: initialData.seo?.metaTitle || "",
      metaDesc: initialData.seo?.metaDesc || "",
      focusKeyword: initialData.seo?.focusKeyword || "",
      canonicalUrl: initialData.seo?.canonicalUrl || "",
      noIndex: initialData.seo?.noIndex || false,
      authorSelection,
      authorId: initialData.authorId || null,
      authorName: initialData.seo?.authorName || "",
      authorRole: initialData.seo?.authorRole || "",
      authorDescription: initialData.seo?.authorDescription || "",
    };
  }, [initialData]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<BlogQuickEditFormData>({
    resolver: zodResolver(blogQuickEditSchema) as any,
    defaultValues: getDefaults,
  });

  const metaTitle = watch("metaTitle") || "";
  const metaDesc = watch("metaDesc") || "";
  const authorSelection = watch("authorSelection") || "";

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      reset(getDefaults);
      setShowAdvanced(false);
    }
  }, [isOpen, getDefaults, reset]);

  const onSubmit: SubmitHandler<BlogQuickEditFormData> = async (data) => {
    setIsSaving(true);
    try {
      const isCustom = data.authorSelection === "custom";
      const isNone = data.authorSelection === "none" || !data.authorSelection;
      const payload = {
        ...data,
        authorId: (isCustom || isNone) ? null : data.authorSelection,
        authorName: isCustom ? data.authorName : null,
        authorRole: isCustom ? data.authorRole : null,
        authorDescription: isCustom ? data.authorDescription : null,
      };

      const res = await fetch(`/api/blogs/${blogId}/seo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 400 && errorText.toLowerCase().includes("slug")) {
          setError("slug", { type: "manual", message: errorText });
          toast.add({ title: "Validation Error", description: "Please fix the errors in the form before saving.", type: "error" });
          return;
        }
        throw new Error(errorText || "Failed to save");
      }

      toast.add({ title: "Success", description: "Blog metadata saved successfully!", type: "success" });
      if (onSaved) onSaved();
      onClose();
    } catch (error: any) {
      toast.add({ title: "Failed to save", description: error.message || "Something went wrong.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-[#F8F9FA] border-0 shadow-2xl p-0">
        <div className="bg-white px-6 py-4 border-b border-[#E5E7EB] sticky top-0 z-10">
          <DialogTitle className="text-xl font-bold text-[#111827]">
            Blog Quick Edit
          </DialogTitle>
          <p className="text-sm text-[#6B7280] mt-1">
            Quickly update metadata and settings for this blog post.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any)} className="p-6 space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider">
              Basic Info
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#374151] font-medium">Page Title</Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} id="title" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                  )}
                />
                {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-[#374151] font-medium">URL Slug</Label>
                <Controller
                  name="slug"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} id="slug" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                  )}
                />
                {errors.slug && <p className="text-red-500 text-xs">{errors.slug.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white border border-[#D1D5DB] rounded-lg mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="allowComments" className="text-[#374151] font-medium">Allow Comments</Label>
                <p className="text-xs text-[#6B7280]">Enable or disable user comments on this blog post.</p>
              </div>
              <Controller
                name="allowComments"
                control={control}
                render={({ field }) => (
                  <Switch 
                    id="allowComments" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
            </div>
          </div>

          <div className="w-full h-px bg-[#E5E7EB]"></div>

          {/* Author Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider">
              Author Settings
            </h3>
            
            <div className="space-y-2">
              <Label className="text-[#374151] font-medium">Select Author</Label>
              <Controller
                name="authorSelection"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full h-10 bg-white border-[#D1D5DB] cursor-pointer">
                      <SelectValue placeholder="No Author / Anonymous">
                        {field.value === 'none' ? 'No Author / Anonymous' : 
                         field.value === 'custom' ? 'Custom Author (Override)' : 
                         users.find(u => u.id === field.value)?.name || 'Select Author'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} sideOffset={4}>
                      <SelectItem value="none" className="cursor-pointer py-2.5 text-sm">No Author / Anonymous</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="cursor-pointer py-2.5 text-sm">
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="cursor-pointer py-2.5 text-sm">Custom Author (Override)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-[#6B7280]">
                Choose an existing user as the author, or select &quot;Custom Author&quot; to manually set custom details.
              </p>
            </div>

            {/* Custom Author Fields */}
            {authorSelection === "custom" && (
              <div className="p-4 bg-white border border-[#D1D5DB] rounded-lg space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorName" className="text-[#374151] font-medium">Author Name</Label>
                    <Controller
                      name="authorName"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} value={field.value || ""} id="authorName" placeholder="e.g. Jane Doe" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorRole" className="text-[#374151] font-medium">Author Role / Title</Label>
                    <Controller
                      name="authorRole"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} value={field.value || ""} id="authorRole" placeholder="e.g. Guest Writer, SEO Specialist" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorDescription" className="text-[#374151] font-medium">Author Bio / Description</Label>
                  <Controller
                    name="authorDescription"
                    control={control}
                    render={({ field }) => (
                      <Textarea {...field} value={field.value || ""} id="authorDescription" placeholder="Write a short bio about this author..." className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black min-h-20 resize-y" />
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-[#E5E7EB]"></div>

          {/* Standard SEO */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider">
              Standard SEO
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="metaTitle" className="text-[#374151] font-medium">Meta Title (40-60 characters)</Label>
                <span className={`text-xs ${metaTitle.length > 60 ? 'text-red-500 font-bold' : 'text-[#6B7280]'}`}>
                  {metaTitle.length}/60
                </span>
              </div>
              <Controller
                name="metaTitle"
                control={control}
                render={({ field }) => (
                  <Input {...field} value={field.value || ""} id="metaTitle" placeholder="Keep it under 60 characters..." className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="metaDesc" className="text-[#374151] font-medium">Meta Description (150-160 characters)</Label>
                <span className={`text-xs ${metaDesc.length > 160 ? 'text-red-500 font-bold' : 'text-[#6B7280]'}`}>
                  {metaDesc.length}/160
                </span>
              </div>
              <Controller
                name="metaDesc"
                control={control}
                render={({ field }) => (
                  <Textarea {...field} value={field.value || ""} id="metaDesc" placeholder="Keep it under 160 characters..." className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black min-h-20 resize-y" />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="focusKeyword" className="text-[#374151] font-medium">Focus Keyword</Label>
              <Controller
                name="focusKeyword"
                control={control}
                render={({ field }) => (
                  <Input {...field} value={field.value || ""} id="focusKeyword" placeholder="e.g. digital marketing agency" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                )}
              />
              {metaTitle && metaDesc && watch("focusKeyword") && (
                <div className="text-xs mt-1">
                  {metaTitle.toLowerCase().includes(watch("focusKeyword")!.toLowerCase()) ? (
                    <span className="text-green-600">✓ Keyword found in Meta Title</span>
                  ) : (
                    <span className="text-red-500">✗ Keyword not in Meta Title</span>
                  )}
                  <span className="mx-2">•</span>
                  {metaDesc.toLowerCase().includes(watch("focusKeyword")!.toLowerCase()) ? (
                    <span className="text-green-600">✓ Keyword found in Meta Description</span>
                  ) : (
                    <span className="text-red-500">✗ Keyword not in Meta Description</span>
                  )}
                </div>
              )}
            </div>

            {/* noIndex toggle */}
            <div className="flex items-center justify-between p-4 bg-white border border-[#D1D5DB] rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="noIndex" className="text-[#374151] font-medium">Hide from Search Engines</Label>
                <p className="text-xs text-[#6B7280]">Adds noindex, nofollow to robots meta tag.</p>
              </div>
              <Controller
                name="noIndex"
                control={control}
                render={({ field }) => (
                  <Switch 
                    id="noIndex" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
            </div>
          </div>

          {/* Advanced Accordion */}
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full px-4 py-3 bg-white hover:bg-gray-50 transition text-sm font-semibold text-[#374151]"
            >
              <span>Advanced</span>
              <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="px-4 py-4 bg-white border-t border-[#E5E7EB] space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="canonicalUrl" className="text-[#374151] font-medium">Canonical URL</Label>
                  <Controller
                    name="canonicalUrl"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} value={field.value || ""} id="canonicalUrl" placeholder="https://original-source.com/article" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                    )}
                  />
                  <p className="text-xs text-[#6B7280]">Use this if the article was originally published elsewhere (e.g. Medium, LinkedIn) to avoid duplicate content penalties.</p>
                  {errors.canonicalUrl && <p className="text-red-500 text-xs">{errors.canonicalUrl.message}</p>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 bg-[#F8F9FA] pt-4 pb-2 border-t border-[#E5E7EB] -mx-6 px-6 mt-8">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !isDirty} 
              className="bg-black hover:bg-black/90 text-white disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
