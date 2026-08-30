  "use client";

  import { useEffect, useState } from "react";
  import { useRouter } from "next/navigation";
  import { useForm, Controller, SubmitHandler } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogFooter,
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Switch } from "@/components/ui/switch";
  import { Button } from "@/components/ui/button";
  import { ImageUploadBlock } from "@/components/ImageUploadBlock";
  import { blogSeoQuickEditSchema, BlogSeoQuickEditFormData } from "@/lib/schemas/seo-validation";
  import { toast } from "@/components/ui/toast";
  import { Loader2 } from "lucide-react";

  interface BlogQuickEditModalProps {
    blogId: string;
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
    initialData: any; // { title, slug, allowComments, seo: { ... } }
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

    // Set default values based on initialData
    const {
      control,
      handleSubmit,
      watch,
      reset,
      setError,
      formState: { errors },
    } = useForm<BlogSeoQuickEditFormData>({
      resolver: zodResolver(blogSeoQuickEditSchema) as any,
      defaultValues: {
        title: initialData.title || "",
        slug: initialData.slug || "",
        metaTitle: initialData.seo?.metaTitle || "",
        metaDesc: initialData.seo?.metaDesc || "",
        focusKeyword: initialData.seo?.focusKeyword || "",
        ogImage: initialData.seo?.ogImage || "",
        ogTitle: initialData.seo?.ogTitle || "",
        ogDesc: initialData.seo?.ogDesc || "",
        canonicalUrl: initialData.seo?.canonicalUrl || "",
        structuredData: initialData.seo?.structuredData
          ? JSON.stringify(initialData.seo.structuredData, null, 2)
          : "",
        noIndex: initialData.seo?.noIndex || false,
        allowComments: initialData.allowComments ?? true,
      },
    });

    const metaTitle = watch("metaTitle") || "";
    const metaDesc = watch("metaDesc") || "";

    // Reset form when modal opens with new data
    useEffect(() => {
      if (isOpen) {
        reset({
          title: initialData.title || "",
          slug: initialData.slug || "",
          metaTitle: initialData.seo?.metaTitle || "",
          metaDesc: initialData.seo?.metaDesc || "",
          focusKeyword: initialData.seo?.focusKeyword || "",
          ogImage: initialData.seo?.ogImage || "",
          ogTitle: initialData.seo?.ogTitle || "",
          ogDesc: initialData.seo?.ogDesc || "",
          canonicalUrl: initialData.seo?.canonicalUrl || "",
          structuredData: initialData.seo?.structuredData
            ? JSON.stringify(initialData.seo.structuredData, null, 2)
            : "",
          noIndex: initialData.seo?.noIndex || false,
          allowComments: initialData.allowComments ?? true,
        });
      }
    }, [isOpen, initialData, reset]);

    const onSubmit: SubmitHandler<BlogSeoQuickEditFormData> = async (data) => {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/blogs/${blogId}/seo`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorText = await res.text();
          if (res.status === 400 && errorText.toLowerCase().includes("slug")) {
            setError("slug", { type: "manual", message: errorText });
            toast.add({ title: "Validation Error", description: "Please fix the errors in the form before saving.", type: "error" });
            return;
          }
          throw new Error(errorText || "Failed to save SEO metadata");
        }

        toast.add({ title: "Success", description: "SEO Metadata saved successfully!", type: "success" });
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
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-[#F8F9FA] border-0 shadow-2xl p-0">
          <div className="bg-white px-6 py-4 border-b border-[#E5E7EB] sticky top-0 z-10">
            <DialogTitle className="text-xl font-bold text-[#111827]">
              SEO Quick Edit
            </DialogTitle>
            <p className="text-sm text-[#6B7280] mt-1">
              Update metadata for search engines and social media.
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

              <div className="space-y-2 pt-2">
                <Label className="text-[#374151] font-medium">Social Share Image (OG Image)</Label>
                <p className="text-xs text-[#6B7280] mb-2">Image displayed when sharing on Facebook, Twitter, LinkedIn.</p>
                <Controller
                  name="ogImage"
                  control={control}
                  render={({ field }) => (
                    <ImageUploadBlock 
                      value={{ url: field.value || "" }} 
                      onChange={(val) => field.onChange(val?.url || "")} 
                    />
                  )}
                />
              </div>
            </div>

            <div className="w-full h-px bg-[#E5E7EB]"></div>

            {/* Advanced SEO */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#374151] uppercase tracking-wider">
                Advanced SEO
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ogTitle" className="text-[#374151] font-medium">OG Title (Optional)</Label>
                  <Controller
                    name="ogTitle"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} value={field.value || ""} id="ogTitle" placeholder="Overrides Meta Title for Socials" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogDesc" className="text-[#374151] font-medium">OG Description (Optional)</Label>
                  <Controller
                    name="ogDesc"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} value={field.value || ""} id="ogDesc" placeholder="Overrides Meta Desc for Socials" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonicalUrl" className="text-[#374151] font-medium">Canonical URL</Label>
                <Controller
                  name="canonicalUrl"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value || ""} id="canonicalUrl" placeholder="https://..." className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black" />
                  )}
                />
                {errors.canonicalUrl && <p className="text-red-500 text-xs">{errors.canonicalUrl.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="structuredData" className="text-[#374151] font-medium">Structured Data (JSON-LD)</Label>
                <Controller
                  name="structuredData"
                  control={control}
                  render={({ field }) => (
                    <Textarea {...field} value={field.value || ""} id="structuredData" placeholder="{&#10;  &quot;@context&quot;: &quot;https://schema.org&quot;,&#10;  &quot;@type&quot;: &quot;WebPage&quot;&#10;}" className="bg-white border-[#D1D5DB] focus:border-black focus:ring-black font-mono text-xs min-h-30 resize-y" />
                  )}
                />
                {errors.structuredData && <p className="text-red-500 text-xs">{errors.structuredData.message}</p>}
              </div>

              <div className="flex items-center justify-between p-4 bg-white border border-[#D1D5DB] rounded-lg mt-4">
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

            <DialogFooter className="sticky bottom-0 bg-[#F8F9FA] pt-4 pb-2 border-t border-[#E5E7EB] -mx-6 px-6 mt-8">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-black hover:bg-black/90 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isSaving ? "Saving..." : "Save SEO Data"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
