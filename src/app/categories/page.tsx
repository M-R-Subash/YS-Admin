"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  FolderTree,
  Tag as TagIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  ExternalLink,
  FileText,
  Hash,
  AlertTriangle,
  FolderPlus,
} from "lucide-react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/button";
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
  postCount: number;
  createdAt: string;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt: string;
}

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "tags">("categories");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Category Form State
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catSlugManual, setCatSlugManual] = useState(false);
  const [catDesc, setCatDesc] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Create Tag Form State
  const [tagName, setTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Edit Category Modal State
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete State
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SWR Fetchers
  const {
    data: categories,
    isLoading: loadingCategories,
    mutate: mutateCategories,
  } = useSWR<CategoryItem[]>("/api/categories");

  const {
    data: tags,
    isLoading: loadingTags,
    mutate: mutateTags,
  } = useSWR<TagItem[]>("/api/tags");

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      toast.add({
        title: "Category Created",
        description: `"${data.name}" has been created.`,
        type: "success",
      });

      setCatName("");
      setCatSlug("");
      setCatSlugManual(false);
      setCatDesc("");
      mutateCategories();
    } catch (err: any) {
      toast.add({
        title: "Error creating category",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsCreatingCat(false);
    }
  };

  // Handle Create Tag
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tagName.trim();
    if (!cleanName) {
      toast.add({ title: "Tag name is required", type: "error" });
      return;
    }

    setIsCreatingTag(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create tag");
      }

      toast.add({
        title: "Tag Created",
        description: `Tag "${data.name}" is ready to use.`,
        type: "success",
      });

      setTagName("");
      mutateTags();
    } catch (err: any) {
      toast.add({
        title: "Error creating tag",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditDesc(cat.description || "");
  };

  // Handle Save Edit Category
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update category");
      }

      toast.add({
        title: "Category Updated",
        description: `"${data.name}" has been updated.`,
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

  // Handle Delete Category
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
        description: data.message || `"${deletingCategory.name}" was removed.`,
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

  // Handle Delete Tag
  const handleConfirmDeleteTag = async () => {
    if (!deletingTag) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/tags/${deletingTag.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete tag");
      }

      toast.add({
        title: "Tag Deleted",
        description: data.message || `Tag "${deletingTag.name}" was removed.`,
        type: "success",
      });

      setDeletingTag(null);
      mutateTags();
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

  // Filtered lists
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tags, searchQuery]);

  const totalCatCount = categories?.length ?? 0;
  const totalTagCount = tags?.length ?? 0;

  return (
    <>
      <AdminTopBar breadcrumbs="Categories & Tags" />

      <div className="flex flex-1 flex-col gap-5 py-5 px-[15px] md:px-[20px] lg:px-[30px] w-full">
        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* Left Column: Create Form */}
          <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 bg-card border rounded-xl p-5 shadow-xs lg:sticky lg:top-20">
            {activeTab === "categories" ? (
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Add New Category</h2>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {totalCatCount} total
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Name</label>
                  <Input
                    placeholder="e.g. Technology"
                    value={catName}
                    onChange={(e) => handleCatNameChange(e.target.value)}
                    className="h-9 text-xs"
                    disabled={isCreatingCat}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">The display name of the category.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">Slug</label>
                    <span className="text-[10px] text-muted-foreground font-mono">auto-generated</span>
                  </div>
                  <Input
                    placeholder="e.g. technology"
                    value={catSlug}
                    onChange={(e) => {
                      setCatSlugManual(true);
                      setCatSlug(e.target.value);
                    }}
                    className="h-9 text-xs font-mono"
                    disabled={isCreatingCat}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    URL-friendly slug (e.g. /category/technology).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Description (Optional)</label>
                  <Textarea
                    placeholder="Brief description for SEO or archives..."
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                    disabled={isCreatingCat}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isCreatingCat || !catName.trim()}
                  className="w-full h-9 text-xs font-semibold gap-1.5 cursor-pointer"
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
            ) : (
              <form onSubmit={handleCreateTag} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <TagIcon className="size-4 text-purple-500" />
                    <h2 className="text-sm font-bold text-foreground">Add New Tag</h2>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {totalTagCount} total
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Tag Name</label>
                  <Input
                    placeholder="e.g. React 19"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="h-9 text-xs"
                    disabled={isCreatingTag}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tags help readers discover closely related articles and search terms.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isCreatingTag || !tagName.trim()}
                  className="w-full h-9 text-xs font-semibold gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isCreatingTag ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      Add Tag
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Right Column: Taxonomy Table & Search */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Tabs & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-xs">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("categories");
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "categories"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FolderTree className="size-3.5 text-primary" />
                  Categories ({totalCatCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("tags");
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "tags"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Hash className="size-3.5 text-purple-500" />
                  Tags ({totalTagCount})
                </button>
              </div>

              {/* Right Side: Quick Stats Badges + Search Bar */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="hidden md:flex items-center gap-2">
                  <div className="h-8.5 text-xs font-semibold px-3 bg-background border border-border rounded-md flex items-center gap-1.5 shadow-2xs">
                    <FolderTree className="size-3.5 text-primary" />
                    <span>{totalCatCount} Categories</span>
                  </div>
                  <div className="h-8.5 text-xs font-semibold px-3 bg-background border border-border rounded-md flex items-center gap-1.5 shadow-2xs">
                    <Hash className="size-3.5 text-purple-500" />
                    <span>{totalTagCount} Tags</span>
                  </div>
                </div>

                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8.5 h-8.5 text-xs w-full"
                  />
                </div>
              </div>
            </div>

            {/* Content Lists */}
            {activeTab === "categories" ? (
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
                          <th className="py-3 px-4 text-center">Articles</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredCategories.map((cat) => (
                          <tr
                            key={cat.id}
                            className="hover:bg-muted/40 transition-colors group"
                          >
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                <FolderTree className="size-3.5 text-primary shrink-0" />
                                <span>{cat.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge
                                variant="outline"
                                className="font-mono text-[11px] bg-muted/30 text-muted-foreground px-2 py-0.5 rounded"
                              >
                                {cat.slug}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                              {cat.description || (
                                <span className="italic text-muted-foreground/60">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Link
                                href={`/blogs?category=${encodeURIComponent(cat.name)}`}
                                className="inline-flex items-center gap-1.5 font-bold hover:underline text-primary"
                                title="Filter blogs with this category"
                              >
                                <Badge
                                  variant="secondary"
                                  className="text-[11px] px-2 py-0.5 font-bold cursor-pointer hover:bg-primary/20 transition-colors"
                                >
                                  {cat.postCount} {cat.postCount === 1 ? "post" : "posts"}
                                </Badge>
                              </Link>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(cat)}
                                  className="size-7 cursor-pointer hover:text-primary"
                                  title="Edit category"
                                >
                                  <Edit2 className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingCategory(cat)}
                                  className="size-7 cursor-pointer hover:text-destructive hover:bg-destructive/10"
                                  title="Delete category"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
                {loadingTags ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : filteredTags.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                      <Hash className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">No tags found</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? `No tag matches "${searchQuery}".`
                        : "Tags are automatically created when typed in the Blog Editor or added here."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Tag</th>
                          <th className="py-3 px-4">Slug</th>
                          <th className="py-3 px-4 text-center">Articles</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredTags.map((t) => (
                          <tr
                            key={t.id}
                            className="hover:bg-muted/40 transition-colors group"
                          >
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              <span className="inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                                <Hash className="size-3 text-purple-500 shrink-0" />
                                {t.name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge
                                variant="outline"
                                className="font-mono text-[11px] bg-muted/30 text-muted-foreground px-2 py-0.5 rounded"
                              >
                                {t.slug}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge
                                variant="secondary"
                                className="text-[11px] px-2 py-0.5 font-bold"
                              >
                                {t.postCount} {t.postCount === 1 ? "post" : "posts"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingTag(t)}
                                className="size-7 cursor-pointer hover:text-destructive hover:bg-destructive/10"
                                title="Delete tag"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      <Dialog
        open={Boolean(editingCategory)}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveEditCategory} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="size-4 text-primary" />
                Edit Category
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Category Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Slug</label>
                <Input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Updating this slug will safely update URLs across all linked articles.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description</label>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCategory(null)}
                className="h-8.5 text-xs cursor-pointer"
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingEdit || !editName.trim()}
                className="h-8.5 text-xs font-semibold cursor-pointer"
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

      {/* Delete Category Confirmation Modal */}
      <AlertDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="size-5" />
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Category?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete category{" "}
                <span className="font-bold text-foreground">
                  &ldquo;{deletingCategory?.name}&rdquo;
                </span>
                ?
              </p>
              <p className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-md font-medium text-[11px]">
                Articles tagged with this category will <strong>NOT</strong> be deleted.
                The category reference will simply be unlinked from them.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setDeletingCategory(null)}
              className="text-xs h-8.5 cursor-pointer"
            >
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

      {/* Delete Tag Confirmation Modal */}
      <AlertDialog
        open={Boolean(deletingTag)}
        onOpenChange={(open) => !open && setDeletingTag(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="size-5" />
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Tag?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete tag{" "}
              <span className="font-bold text-foreground">&ldquo;{deletingTag?.name}&rdquo;</span>?
              It will be unlinked from all articles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setDeletingTag(null)}
              className="text-xs h-8.5 cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDeleteTag}
              className="text-xs h-8.5 bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Tag"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
