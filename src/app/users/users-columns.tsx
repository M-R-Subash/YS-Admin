"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { UserModal } from "@/components/admin/UserModal";

export type User = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "EDITOR";
  profilePicture?: string | null;
  authorRole?: string | null;
  description?: string | null;
  createdAt: string;
  lastLogin?: string | null;
};

function formatLastVisit(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Never";

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  if (isToday(date)) {
    return `${diffInHours} ${diffInHours === 1 ? "hr" : "hrs"} ago`;
  }

  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }

  return format(date, "MMM d, yyyy - h:mm a");
}

export const ActionCell = ({
  user,
  currentUserId,
  onDataChange,
}: {
  user: User;
  currentUserId: string;
  onDataChange: () => void;
}) => {
  const isCurrentUser = user.id === currentUserId;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      toast.add({
        title: "Deleted",
        description: "User has been removed.",
        type: "success",
      });
      onDataChange();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.add({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" />}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 p-1">
          <DropdownMenuItem
            className="cursor-pointer flex items-center whitespace-nowrap py-2.5 px-3 font-medium transition-colors"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4 flex-shrink-0" />
            Edit User
          </DropdownMenuItem>
          {!isCurrentUser && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer flex items-center whitespace-nowrap py-2.5 px-3 font-medium transition-colors"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4 flex-shrink-0" />
              Delete User
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dynamic Edit User Modal */}
      <UserModal
        user={user}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={onDataChange}
      />

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account for <span className="font-semibold text-foreground">{user.name || user.email}</span> and remove their access to the CMS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Yes, delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const getUsersColumns = (
  onDataChange: () => void,
  currentUserId: string
): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const user = row.original;
      const name = user.name || "N/A";
      const initial = name.charAt(0).toUpperCase() || "U";

      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-full shrink-0">
            {user.profilePicture ? (
              <AvatarImage src={user.profilePicture} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return (
        <div className="text-muted-foreground text-sm">
          {format(new Date(date), "MMM d, yyyy")}
        </div>
      );
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Last Visit",
    cell: ({ row }) => {
      const date = row.getValue("lastLogin") as string | null;
      return (
        <div className="text-muted-foreground text-sm">
          {formatLastVisit(date)}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <ActionCell
        user={row.original}
        currentUserId={currentUserId}
        onDataChange={onDataChange}
      />
    ),
  },
];
