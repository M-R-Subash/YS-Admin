"use client";

import { useState, useMemo, useDeferredValue } from "react";
import useSWR from "swr";
import {
  FolderTree,
  Search,
  Loader2,
  Sparkles,
  Globe,
  Plus,
  RefreshCw,
} from "lucide-react";
import { CategoryCreateForm } from "./CategoryCreateForm";
import { DataTable } from "@/components/table/DataTable";
import { getCategoriesColumns, CategoryItem } from "./categories-columns";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { clientConfig } from "@/lib/config/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { slugify } from "@/lib/slugify";

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefreshCategories = async () => {
    setIsRefreshing(true);
    try {
      await mutateCategories();
      toast.add({
        title: "Categories refreshed",
        description: "Latest category list is up to date.",
        type: "success",
      });
    } catch {
      toast.add({
        title: "Refresh failed",
        description: "Failed to reload categories.",
        type: "error",
      });
    } finally {
      setIsRefreshing(false);
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

  const deferredSearch = useDeferredValue(searchQuery);
  const rawCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  // Filter Categories by search (deferred to keep UI responsive)
  const filteredCategories = useMemo(() => {
    if (!rawCategories.length) return [];
    if (!deferredSearch.trim()) return rawCategories;
    const q = deferredSearch.toLowerCase().trim();
    return rawCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.focusKeyword && c.focusKeyword.toLowerCase().includes(q))
    );
  }, [rawCategories, deferredSearch]);

  const columns = useMemo(
    () =>
      getCategoriesColumns({
        onEdit: openEditModal,
        onDelete: (cat) => setDeletingCategory(cat),
      }),
    []
  );

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
        {/* Full-width Category Table & Search Toolbar */}
        <div className="w-full space-y-4">
          {/* Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="h-8.5 text-xs font-semibold px-3 bg-background border border-border rounded-md flex items-center gap-1.5 shadow-2xs">
                <FolderTree className="size-3.5 text-primary" />
                <span>{totalCatCount} Categories</span>
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="sm:hidden h-8.5 px-3 text-xs font-semibold gap-1.5 cursor-pointer shrink-0 text-white"
              >
                <Plus className="size-3.5" />
                <span>Add Category</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
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

              <Button
                onClick={handleRefreshCategories}
                variant="outline"
                size="sm"
                className="h-8.5 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
                disabled={isRefreshing}
                title="Refresh Categories"
              >
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
                <span className="hidden md:inline">Refresh</span>
              </Button>

              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="hidden sm:inline-flex h-8.5 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer shrink-0 text-white"
              >
                <Plus className="size-3.5" />
                <span>Add Category</span>
              </Button>
            </div>
          </div>

          {/* Categories Table */}
          {loadingCategories ? (
            <div className="bg-card border rounded-xl p-6 space-y-3 shadow-xs">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="bg-card border rounded-xl text-center py-12 px-4 shadow-xs">
              <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                <FolderTree className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No categories found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                {searchQuery
                  ? `No category matches "${searchQuery}".`
                  : "Organize your articles by adding your first category."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer text-white"
                >
                  <Plus className="size-3.5" />
                  <span>Add Category</span>
                </Button>
              )}
            </div>
          ) : (
            <DataTable columns={columns} data={filteredCategories} />
          )}
        </div>
      </div>

      {/* Add Category Modal (Popup) */}
      <CategoryCreateForm
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={mutateCategories}
      />

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

      {/* Delete Category Confirmation Modal */}
      <ConfirmModal
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        variant="danger"
        title="Delete Category?"
        description={
          <div className="space-y-2 mt-1">
            <p>
              Are you sure you want to delete category <strong>&ldquo;{deletingCategory?.name}&rdquo;</strong>?
            </p>
            <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
              Articles tagged with this category will NOT be deleted. The category reference will simply be unlinked from them.
            </div>
          </div>
        }
        confirmText="Delete Category"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteCategory}
      />
    </>
  );
}
