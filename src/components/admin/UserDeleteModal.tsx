"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import type { User } from "@/app/users/users-columns";
import { cn } from "@/lib/utils";

interface UserDeleteModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  allUsers: User[];
  currentUserId: string;
}

export function UserDeleteModal({
  user,
  open,
  onOpenChange,
  onSuccess,
  allUsers,
  currentUserId,
}: UserDeleteModalProps) {
  const [action, setAction] = useState<"reassign" | "unassign">("reassign");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Content counts
  const blogsCount = user?._count?.blogs ?? 0;
  const pagesCount = user?._count?.pages ?? 0;
  const totalContent = blogsCount + pagesCount;

  // Filter out the user being deleted
  const availableUsers = useMemo(() => {
    if (!user) return [];
    return allUsers.filter((u) => u.id !== user.id);
  }, [allUsers, user]);

  // Find the oldest remaining Admin
  const oldestAdminId = useMemo(() => {
    const admins = availableUsers.filter((u) => u.role === "ADMIN");
    if (admins.length === 0) return availableUsers[0]?.id || "";
    const sorted = [...admins].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
    return sorted[0]?.id || "";
  }, [availableUsers]);

  // Reset/Initialize selection on open
  useEffect(() => {
    if (open && user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setAction("reassign");
      const defaultId = oldestAdminId || currentUserId || availableUsers[0]?.id || "";
      setSelectedUserId(defaultId);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, user, oldestAdminId, currentUserId, availableUsers]);

  const selectedUser = useMemo(() => {
    return availableUsers.find((u) => u.id === selectedUserId);
  }, [availableUsers, selectedUserId]);

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      const payload: { reassignToUserId?: string | null } = {};
      if (totalContent > 0 && action === "reassign" && selectedUserId) {
        payload.reassignToUserId = selectedUserId;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete user");
      }

      const reassignNotice =
        totalContent > 0 && action === "reassign" && selectedUser
          ? ` Articles transferred to ${selectedUser.name || selectedUser.email}.`
          : "";

      toast.add({
        title: "User deleted",
        description: `${user.name || user.email} was removed.${reassignNotice}`,
        type: "success",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.add({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  const displayName = user.name || user.email;
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6 sm:p-7 gap-6">
        {/* Header */}
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-bold text-foreground">
            Delete User
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to remove this user from the CMS?
          </DialogDescription>
        </DialogHeader>

        {/* User Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-muted/40 border border-border/70">
          <Avatar className="h-11 w-11 rounded-full shrink-0 border border-border/50">
            {user.profilePicture ? (
              <AvatarImage src={user.profilePicture} alt={displayName} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">
                {user.name || "Unnamed User"}
              </span>
              <Badge
                variant={user.role === "ADMIN" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0 font-medium"
              >
                {user.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Content handling */}
        {totalContent > 0 ? (
          <div className="space-y-4">
            {/* Simple content summary */}
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="text-muted-foreground">
                Authored content:
              </span>
              <div className="flex items-center gap-1.5 font-medium">
                {blogsCount > 0 && (
                  <span className="bg-muted px-2 py-0.5 rounded-md text-foreground">
                    {blogsCount} {blogsCount === 1 ? "Blog" : "Blogs"}
                  </span>
                )}
                {pagesCount > 0 && (
                  <span className="bg-muted px-2 py-0.5 rounded-md text-foreground">
                    {pagesCount} {pagesCount === 1 ? "Page" : "Pages"}
                  </span>
                )}
              </div>
            </div>

            {/* Reassign / Unassign Options */}
            <div className="space-y-2.5">
              {/* Option A: Reassign */}
              <div
                onClick={() => setAction("reassign")}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer space-y-3",
                  action === "reassign"
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/30"
                    : "border-border/80 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="action-reassign"
                    name="delete-action"
                    checked={action === "reassign"}
                    onChange={() => setAction("reassign")}
                    className="mt-0.5 size-4 accent-primary cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="action-reassign"
                      className="text-sm font-semibold text-foreground cursor-pointer block leading-none"
                    >
                      Transfer articles to another team member
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Keeps their published articles online under the selected author.
                    </p>
                  </div>
                </div>

                {action === "reassign" && (
                  <div className="pl-7 pt-1" onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                      Select New Author
                    </label>
                    <Select
                      value={selectedUserId}
                      onValueChange={(val) => setSelectedUserId(val ?? "")}
                    >
                      <SelectTrigger className="w-full h-10 bg-background cursor-pointer text-sm">
                        <SelectValue placeholder="Choose a member">
                          {selectedUser ? (
                            <span className="flex items-center gap-2 truncate">
                              <span className="font-medium text-foreground truncate">
                                {selectedUser.name || selectedUser.email}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({selectedUser.role.toLowerCase()})
                              </span>
                            </span>
                          ) : (
                            "Choose a member"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} sideOffset={4} className="max-h-56">
                        {availableUsers.map((u) => {
                          const isOldest = u.id === oldestAdminId;
                          return (
                            <SelectItem
                              key={u.id}
                              value={u.id}
                              className="cursor-pointer py-2 text-sm"
                            >
                              <div className="flex items-center justify-between w-full gap-3">
                                <span className="font-medium truncate">{u.name || u.email}</span>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  {isOldest ? "Default Admin" : u.role.toLowerCase()}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Option B: Leave Unassigned */}
              <div
                onClick={() => setAction("unassign")}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer",
                  action === "unassign"
                    ? "border-amber-500/80 bg-amber-500/[0.03] ring-1 ring-amber-500/30"
                    : "border-border/80 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="action-unassign"
                    name="delete-action"
                    checked={action === "unassign"}
                    onChange={() => setAction("unassign")}
                    className="mt-0.5 size-4 accent-amber-600 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="action-unassign"
                      className="text-sm font-semibold text-foreground cursor-pointer block leading-none"
                    >
                      Don&apos;t transfer (leave author blank)
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Articles stay online, but the author will display as &quot;Unknown Author&quot;.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Simple confirmation for users with 0 content */
          <div className="space-y-2 py-1">
            <p className="text-sm text-foreground/90 leading-relaxed">
              This user has not published any articles or pages. Removing their profile will immediately revoke their dashboard access.
            </p>
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              This action cannot be undone.
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex flex-row justify-end items-center gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="cursor-pointer h-10 px-5 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || (totalContent > 0 && action === "reassign" && !selectedUserId)}
            className="cursor-pointer h-10 px-5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : totalContent > 0 && action === "reassign" ? (
              "Transfer & Delete"
            ) : (
              "Yes, delete user"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
