"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type User = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "EDITOR";
  createdAt: string;
  lastLogin: string | null;
};

interface UserColumnsProps {
  onDelete: (id: string) => void;
  currentUserId: string;
}

export const getUsersColumns = ({
  onDelete,
  currentUserId,
}: UserColumnsProps): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.getValue("name") as string | null;
      return <div className="font-medium">{name || "N/A"}</div>;
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
    header: "Last Login",
    cell: ({ row }) => {
      const date = row.getValue("lastLogin") as string | null;
      return (
        <div className="text-muted-foreground text-sm">
          {date ? format(new Date(date), "MMM d, yyyy h:mm a") : "Never"}
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
