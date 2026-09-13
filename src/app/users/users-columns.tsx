"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Check, Copy, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { UserModal } from "@/components/admin/UserModal";
import { UserDeleteModal } from "@/components/admin/UserDeleteModal";

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
  _count?: {
    blogs: number;
    pages: number;
  };
};

const EmailCell = ({ email }: { email: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast.add({
      title: "Copied to clipboard",
      description: email,
      type: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 group/email inline-flex">
      <span className="text-muted-foreground">{email}</span>
      <Tooltip>
        <TooltipTrigger
          type="button"
          onClick={handleCopy}
          className="p-1 text-muted-foreground/60 hover:text-foreground opacity-70 hover:opacity-100 transition-opacity cursor-pointer rounded-xs inline-flex items-center justify-center"
          aria-label="Copy email"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </TooltipTrigger>
        <TooltipContent side="top">
          {copied ? "Copied!" : "Copy email"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
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
  allUsers,
}: {
  user: User;
  currentUserId: string;
  onDataChange: () => void;
  allUsers: User[];
}) => {
  const isCurrentUser = user.id === currentUserId;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // The current admin cannot edit their own data from the users table (they use Account Settings)
  if (isCurrentUser) {
    return null;
  }

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

      {/* Reassignment-Aware Delete User Modal */}
      <UserDeleteModal
        user={user}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onSuccess={onDataChange}
        allUsers={allUsers}
        currentUserId={currentUserId}
      />
    </>
  );
};

export const getUsersColumns = (
  onDataChange: () => void,
  currentUserId: string,
  allUsers: User[] = []
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
    cell: ({ row }) => {
      const email = row.getValue("email") as string;
      return <EmailCell email={email} />;
    },
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
        allUsers={allUsers}
      />
    ),
  },
];
