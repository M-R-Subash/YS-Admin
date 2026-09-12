"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type User = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "EDITOR";
  profilePicture?: string | null;
  createdAt: string;
  lastLogin?: string | null;
};

interface UserColumnsProps {
  onDelete: (id: string) => void;
  currentUserId: string;
}

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

export const getUsersColumns = ({
  onDelete,
  currentUserId,
}: UserColumnsProps): ColumnDef<User>[] => [
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
    cell: ({ row }) => {
      const user = row.original;
      const isCurrentUser = user.id === currentUserId;

      if (isCurrentUser) {
        return <div className="h-8 w-8" />; // Placeholder to maintain row height
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 p-1">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer flex items-center whitespace-nowrap py-2.5 px-3 font-medium transition-colors"
              onClick={() => onDelete(user.id)}
            >
              <Trash className="mr-2 h-4 w-4 flex-shrink-0" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
