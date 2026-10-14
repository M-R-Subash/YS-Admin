"use client";

import { useState, useMemo, useDeferredValue } from "react";
import useSWR from "swr";
import {
  Hash,
  Search,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";
import { TagCreateForm } from "./TagCreateForm";

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
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { slugify } from "@/lib/slugify";

interface TagItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  createdAt: string;
}

export default function TagsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Tag Modal State
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete State
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SWR Fetcher
  const {
    data: tags,
    isLoading: loadingTags,
    mutate: mutateTags,
  } = useSWR<TagItem[]>("/api/tags?limit=200");

  // Open Edit Tag Modal
  const openEditModal = (tag: TagItem) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditSlug(tag.slug);
    setEditDesc(tag.description || "");
  };

  // Save Edit Tag
  const handleSaveEditTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;

    const cleanName = editName.trim();
    if (!cleanName) {
      toast.add({ title: "Tag name is required", type: "error" });
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
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
        throw new Error(data.error || "Failed to update tag");
      }

      toast.add({
        title: "Tag Updated",
        description: `"${data.name}" updated successfully.`,
        type: "success",
      });

      setEditingTag(null);
      mutateTags();
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

  // Confirm Delete Tag
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
        description: data.message || `Tag "${deletingTag.name}" was deleted.`,
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

  const deferredSearch = useDeferredValue(searchQuery);
  const rawTags = useMemo(() => (Array.isArray(tags) ? tags : []), [tags]);

  // Filter Tags by search (deferred for smooth keystrokes)
  const filteredTags = useMemo(() => {
    if (!rawTags.length) return [];
    if (!deferredSearch.trim()) return rawTags;
    const q = deferredSearch.toLowerCase().trim();
    return rawTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [rawTags, deferredSearch]);

  const totalTagCount = rawTags.length;

  return (
    <>
      {/* Top Bar with Breadcrumbs */}
      <AdminTopBar
        breadcrumbs={[
          { label: "Blogs", href: "/blogs" },
          { label: "Tags" },
        ]}
      />

      <div className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Column: Create Tag Card (Isolated State) */}
          <TagCreateForm
            totalTagCount={totalTagCount}
            onSuccess={mutateTags}
          />

          {/* Right Column: Tags Table & Search */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-8.5 text-xs font-semibold px-3 bg-background border border-border rounded-md flex items-center gap-1.5 shadow-2xs">
                  <Hash className="size-3.5 text-purple-500" />
                  <span>{totalTagCount} Tags</span>
                </div>
              </div>

              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs w-full"
                />
              </div>
            </div>

            {/* Tags Table */}
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
                      : "Create your first tag using the form on the left."}
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
                      {filteredTags.map((tag) => (
                        <tr
                          key={tag.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-sm bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                              >
                                <Hash className="size-2.5 text-purple-500 shrink-0" />
                                <span>{tag.name}</span>
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {tag.slug}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                            {tag.description || (
                              <span className="italic text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-medium">
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-semibold px-2 py-0.5"
                            >
                              {tag.postCount} {tag.postCount === 1 ? "article" : "articles"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(tag)}
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                title="Edit Tag"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingTag(tag)}
                                className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10"
                                title="Delete Tag"
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
          </div>
        </div>
      </div>

      {/* Edit Tag Modal */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Hash className="size-4 text-purple-500" />
              <span>Edit Tag</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEditTag} className="space-y-3.5">
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
                className="text-xs min-h-17.5"
                disabled={isSavingEdit}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTag(null)}
                disabled={isSavingEdit}
                className="text-xs h-8.5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingEdit || !editName.trim()}
                className="text-xs h-8.5 font-semibold cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
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

      {/* Delete Tag Confirmation Modal */}
      <ConfirmModal
        open={!!deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
        variant="danger"
        title="Delete Tag?"
        description={
          <div className="space-y-2 mt-1">
            <p>
              Are you sure you want to delete tag <strong>&ldquo;{deletingTag?.name}&rdquo;</strong>?
            </p>
            <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
              Articles tagged with this tag will NOT be deleted. The tag will simply be unlinked from them.
            </div>
          </div>
        }
        confirmText="Delete Tag"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteTag}
      />
    </>
  );
}
