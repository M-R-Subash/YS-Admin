"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getUsersColumns } from "./users-columns";
import { UserModal } from "@/components/admin/UserModal";

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR(
    status === "authenticated" && session?.user?.role === "ADMIN" ? "/api/users" : null
  );
  const users = data?.users || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Security Check: Redirect if not ADMIN
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/webpages");
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-11 w-32" />
        </div>
        <div className="rounded-md border bg-card p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <>
      <header className="sticky top-0 z-30 bg-background flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Users</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">User Management</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add, remove, and manage CMS access and roles.
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="h-11 px-6 text-base cursor-pointer">
            <Plus className="mr-2 h-5 w-5" /> Add User
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <DataTable
            columns={getUsersColumns(() => mutate(), session.user.id)}
            data={users}
          />
        </div>
      </div>

      {/* Dynamic Add User Modal */}
      <UserModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => mutate()}
      />
    </>
  );
}
