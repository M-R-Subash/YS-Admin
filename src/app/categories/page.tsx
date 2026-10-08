"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  FolderPlus,
  Sparkles,
  Globe,
  CheckCircle2,
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { clientConfig } from "@/lib/config/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { slugify } from "@/lib/slugify";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  focusKeyword: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  postCount: number;
  createdAt: string;
}

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Create Category Form State
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catSlugManual, setCatSlugManual] = useState(false);
  const [catDesc, setCatDesc] = useState("");
  const [showSeoFields, setShowSeoFields] = useState(false);
  const [catMetaTitle, setCatMetaTitle] = useState("");
  const [catMetaDesc, setCatMetaDesc] = useState("");
  const [catFocusKeyword, setCatFocusKeyword] = useState("");
  const [catNoIndex, setCatNoIndex] = useState(false);
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Edit Category Modal State
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editTab, setEditTab] = useState<"general" | "seo">("general");
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaDesc, setEditMetaDesc] = useState("");
  const [editFocusKeyword, setEditFocusKeyword] = useState("");
  const [editCanonicalUrl, setEditCanonicalUrl] = useState("");
  const [editNoIndex, setEditNoIndex] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete State
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SWR Fetcher
  const {
    data: categories,
    isLoading: loadingCategories,
    mutate: mutateCategories,
  } = useSWR<CategoryItem[]>("/api/categories");

  // Handle Category Name Change with auto-slugging
  const handleCatNameChange = (val: string) => {
    setCatName(val);
    if (!catSlugManual) {
      setCatSlug(slugify(val));
    }
  };

  // Handle Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catName.trim();
    if (!cleanName) {
      toast.add({ title: "Category name is required", type: "error" });
      return;
    }

    setIsCreatingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          slug: catSlug.trim() || slugify(cleanName),
          description: catDesc.trim() || null,
          metaTitle: catMetaTitle.trim() || null,
          metaDesc: catMetaDesc.trim() || null,
          focusKeyword: catFocusKeyword.trim() || null,
          noIndex: catNoIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      toast.add({
        title: "Category Created",
        description: `"${data.name}" has been created with SEO settings.`,
        type: "success",
      });

      setCatName("");
      setCatSlug("");
      setCatSlugManual(false);
      setCatDesc("");
      setCatMetaTitle("");
      setCatMetaDesc("");
      setCatFocusKeyword("");
      setCatNoIndex(false);
      setShowSeoFields(false);
      mutateCategories();
    } catch (err: any) {
      toast.add({
        title: "Creation Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsCreatingCat(false);
    }
  };

  // Open Edit Category Modal
  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setEditTab("general");
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditDesc(cat.description || "");
    setEditMetaTitle(cat.metaTitle || "");
    setEditMetaDesc(cat.metaDesc || "");
    setEditFocusKeyword(cat.focusKeyword || "");
    setEditCanonicalUrl(cat.canonicalUrl || "");
    setEditNoIndex(Boolean(cat.noIndex));
  };

  // Save Edit Category
  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const cleanName = editName.trim();
    if (!cleanName) {
      toast.add({ title: "Category name is required", type: "error" });
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          slug: editSlug.trim() || slugify(cleanName),
          description: editDesc.trim() || null,
          metaTitle: editMetaTitle.trim() || null,
          metaDesc: editMetaDesc.trim() || null,
          focusKeyword: editFocusKeyword.trim() || null,
          canonicalUrl: editCanonicalUrl.trim() || null,
          noIndex: editNoIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update category");
      }

      toast.add({
        title: "Category Updated",
        description: `"${data.name}" updated successfully.`,
        type: "success",
      });

      setEditingCategory(null);
      mutateCategories();
    } catch (err: any) {
      toast.add({
        title: "Update Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Confirm Delete Category
  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      toast.add({
        title: "Category Deleted",
        description: data.message || `Category "${deletingCategory.name}" was deleted.`,
        type: "success",
      });

      setDeletingCategory(null);
      mutateCategories();
    } catch (err: any) {
      toast.add({
        title: "Delete Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const rawCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  // Filter Categories by search
  const filteredCategories = useMemo(() => {
    if (!rawCategories.length) return [];
    if (!searchQuery.trim()) return rawCategories;
    const q = searchQuery.toLowerCase().trim();
    return rawCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.focusKeyword && c.focusKeyword.toLowerCase().includes(q))
    );
  }, [rawCategories, searchQuery]);

  const totalCatCount = rawCategories.length;
  const siteUrl = clientConfig.app.frontendUrl;

  return (
    <>
      {/* Top Bar with Breadcrumbs */}
      <AdminTopBar
        breadcrumbs={[
          { label: "Blogs", href: "/blogs" },
          { label: "Categories" },
        ]}
      />

      <div className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Column: Create Category Card */}
          <div className="w-full lg:w-105 shrink-0 bg-card border rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <FolderPlus className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Add New Category</h2>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {totalCatCount} total
              </Badge>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Name <span className="text-red-500">*</span></span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Technology, AI Tools"
                  value={catName}
                  onChange={(e) => handleCatNameChange(e.target.value)}
                  className="h-8.5 text-xs"
                  disabled={isCreatingCat}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  The display name shown on article badges and archive pages.
                </p>
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Slug</span>
                  <span className="text-[10px] text-muted-foreground">
                    {catSlugManual ? "manual" : "auto-generated"}
                  </span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. technology"
                  value={catSlug}
                  onChange={(e) => {
                    setCatSlugManual(true);
                    setCatSlug(e.target.value);
                  }}
                  className="h-8.5 text-xs font-mono"
                  disabled={isCreatingCat}
                />
                <p className="text-[11px] text-muted-foreground">
                  URL-friendly slug (e.g. <span className="font-mono">/category/{catSlug || "..."}</span>).
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Description <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Textarea
                  placeholder="Brief description for header overview and archives..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="text-xs min-h-16 resize-y"
                  disabled={isCreatingCat}
                />
              </div>

              {/* Collapsible SEO Section */}
              <div className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowSeoFields(!showSeoFields)}
                  className="w-full flex items-center justify-between text-xs font-bold text-foreground cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>Search Engine Optimization (SEO)</span>
                  </span>
                  <span className="text-[11px] text-primary hover:underline">
                    {showSeoFields ? "Hide SEO" : "Customize SEO"}
                  </span>
                </button>

                {showSeoFields && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="font-semibold text-foreground">Meta Title</label>
                        <span className={`text-[10px] ${catMetaTitle.length > 60 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                          {catMetaTitle.length}/60 chars
                        </span>
                      </div>
                      <Input
                        type="text"
                        placeholder={catName ? `${catName} Articles & Guides | YS Innovations` : "Custom SEO title..."}
                        value={catMetaTitle}
                        onChange={(e) => setCatMetaTitle(e.target.value)}
                        className="h-8 text-xs"
                        disabled={isCreatingCat}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="font-semibold text-foreground">Meta Description</label>
                        <span className={`text-[10px] ${catMetaDesc.length > 160 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                          {catMetaDesc.length}/160 chars
                        </span>
                      </div>
                      <Textarea
                        placeholder="Snippet shown in Google search results (140-160 chars recommended)..."
                        value={catMetaDesc}
                        onChange={(e) => setCatMetaDesc(e.target.value)}
                        className="text-xs min-h-13.75 resize-y"
                        disabled={isCreatingCat}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Focus Keyword</label>
                      <Input
                        type="text"
                        placeholder="e.g. digital marketing, ai tools"
                        value={catFocusKeyword}
                        onChange={(e) => setCatFocusKeyword(e.target.value)}
                        className="h-8 text-xs"
                        disabled={isCreatingCat}
                      />
                    </div>

                    {/* Live Google Search Preview Card */}
                    <div className="rounded-lg border border-border/70 p-2.5 bg-background space-y-1 text-left">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                        <Globe className="size-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{siteUrl}/category/{catSlug || slugify(catName) || "topic"}</span>
                      </div>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                        {catMetaTitle || (catName ? `${catName} - Guides & Articles` : "Category Title")}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {catMetaDesc || catDesc || "Explore comprehensive articles, tutorials, and latest industry insights in this category."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="cat-noindex-toggle"
                        checked={catNoIndex}
                        onCheckedChange={(checked) => setCatNoIndex(Boolean(checked))}
                      />
                      <label htmlFor="cat-noindex-toggle" className="text-xs text-foreground cursor-pointer select-none">
                        NoIndex <span className="text-[10px] text-muted-foreground">(hide category from Google Search)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isCreatingCat || !catName.trim()}
                className="w-full h-9 text-xs font-semibold gap-1.5 cursor-pointer text-white"
              >
                {isCreatingCat ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" />
                    Add Category
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right Column: Category Table & Search */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-8.5 text-xs font-semibold px-3 bg-background border border-border rounded-md flex items-center gap-1.5 shadow-2xs">
                  <FolderTree className="size-3.5 text-primary" />
                  <span>{totalCatCount} Categories</span>
                </div>
              </div>

              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search categories or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs w-full"
                />
              </div>
            </div>

            {/* Categories Table */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
              {loadingCategories ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <FolderTree className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">No categories found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? `No category matches "${searchQuery}".`
                      : "Create your first category using the form on the left."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Slug</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-center">SEO</th>
                        <th className="py-3 px-4 text-center">Articles</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredCategories.map((cat) => {
                        const hasCustomSeo = Boolean(cat.metaTitle || cat.metaDesc || cat.focusKeyword);
                        return (
                          <tr
                            key={cat.id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="py-3 px-4 font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <FolderTree className="size-3.5 text-primary shrink-0" />
                                <span>{cat.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                              {cat.slug}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                              {cat.description || (
                                <span className="italic text-muted-foreground/60">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hasCustomSeo ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="size-2.5" />
                                  Custom SEO
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-muted-foreground inline-flex items-center gap-1"
                                >
                                  Default
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-medium">
                              <Badge
                                variant="secondary"
                                className="text-[11px] font-semibold px-2 py-0.5"
                              >
                                {cat.postCount} {cat.postCount === 1 ? "post" : "posts"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(cat)}
                                  className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                  title="Edit Category & SEO"
                                >
                                  <Edit2 className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingCategory(cat)}
                                  className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10"
                                  title="Delete Category"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Category & SEO Modal */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderTree className="size-4 text-primary" />
              <span>Edit Category & SEO</span>
            </DialogTitle>
          </DialogHeader>

          {/* Edit Tabs: General & SEO */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setEditTab("general")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                editTab === "general"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              General Details
            </button>
            <button
              type="button"
              onClick={() => setEditTab("seo")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                editTab === "seo"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3 text-amber-500" />
              SEO & Social Preview
            </button>
          </div>

          <form onSubmit={handleSaveEditCategory} className="space-y-4">
            {editTab === "general" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Name</label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8.5 text-xs"
                    disabled={isSavingEdit}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Slug</label>
                  <Input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                    disabled={isSavingEdit}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Description</label>
                  <Textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="text-xs min-h-20"
                    disabled={isSavingEdit}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-foreground">Meta Title</label>
                    <span className={`text-[10px] ${editMetaTitle.length > 60 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                      {editMetaTitle.length}/60 chars
                    </span>
                  </div>
                  <Input
                    type="text"
                    placeholder="Custom SEO title..."
                    value={editMetaTitle}
                    onChange={(e) => setEditMetaTitle(e.target.value)}
                    className="h-8.5 text-xs"
                    disabled={isSavingEdit}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-foreground">Meta Description</label>
                    <span className={`text-[10px] ${editMetaDesc.length > 160 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                      {editMetaDesc.length}/160 chars
                    </span>
                  </div>
                  <Textarea
                    placeholder="Snippet shown in search engines..."
                    value={editMetaDesc}
                    onChange={(e) => setEditMetaDesc(e.target.value)}
                    className="text-xs min-h-15"
                    disabled={isSavingEdit}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Focus Keyword</label>
                    <Input
                      type="text"
                      placeholder="e.g. digital marketing"
                      value={editFocusKeyword}
                      onChange={(e) => setEditFocusKeyword(e.target.value)}
                      className="h-8 text-xs"
                      disabled={isSavingEdit}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Canonical URL</label>
                    <Input
                      type="text"
                      placeholder="https://..."
                      value={editCanonicalUrl}
                      onChange={(e) => setEditCanonicalUrl(e.target.value)}
                      className="h-8 text-xs"
                      disabled={isSavingEdit}
                    />
                  </div>
                </div>

                {/* Google Search Live Preview */}
                <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                    <Globe className="size-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{siteUrl}/category/{editSlug || "topic"}</span>
                  </div>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                    {editMetaTitle || (editName ? `${editName} - Guides & Articles` : "Category Title")}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {editMetaDesc || editDesc || "Explore comprehensive articles, tutorials, and latest industry insights in this category."}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="edit-cat-noindex"
                    checked={editNoIndex}
                    onCheckedChange={(checked) => setEditNoIndex(Boolean(checked))}
                  />
                  <label htmlFor="edit-cat-noindex" className="text-xs text-foreground cursor-pointer select-none">
                    NoIndex <span className="text-[10px] text-muted-foreground">(hide category from Google Search)</span>
                  </label>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCategory(null)}
                disabled={isSavingEdit}
                className="text-xs h-8.5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingEdit || !editName.trim()}
                className="text-xs h-8.5 font-semibold cursor-pointer"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Alert Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent className="text-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-red-600 flex items-center gap-2">
              <span>Delete Category?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete category <strong>&ldquo;{deletingCategory?.name}&rdquo;</strong>?
              </p>
              <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                Articles tagged with this category will NOT be deleted. The category reference will simply be unlinked from them.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs h-8.5 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDeleteCategory}
              className="text-xs h-8.5 bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
