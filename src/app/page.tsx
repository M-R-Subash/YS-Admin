"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileTextIcon, PenToolIcon, CheckCircleIcon, FileIcon } from "lucide-react";

import { Page } from "@/types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { DataTable } from "@/components/ui/data-table";
import { getWebpagesColumns } from "@/app/webpages/webpages-columns";

export default function DashboardPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [blogsCount, setBlogsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [pagesRes, blogsRes] = await Promise.all([
        fetch("/api/pages"),
        fetch("/api/blogs"),
      ]);

      const pagesData = await pagesRes.json();
      const blogsData = await blogsRes.json();

      setPages(Array.isArray(pagesData) ? pagesData : []);
      setBlogsCount(Array.isArray(blogsData) ? blogsData.length : 0);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deletePage(id: string) {
    if (!confirm("Are you sure you want to delete this page?")) return;
    await fetch(`/api/pages/${id}`, { method: "DELETE" });
    fetchDashboardData();
  }

  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status === "draft").length;

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
                <BreadcrumbPage>Dashboard Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Metrics Grid */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-4">
          <Link
            href="/webpages"
            className="rounded-sm bg-card border p-4 shadow-sm flex flex-col justify-center transition-all hover:border-primary hover:shadow-md cursor-pointer group"
          >
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Total Pages
              </p>
              <FileTextIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-bold">{loading ? "..." : pages.length}</div>
          </Link>

          <Link
            href="/webpages"
            className="rounded-sm bg-card border p-4 shadow-sm flex flex-col justify-center transition-all hover:border-primary hover:shadow-md cursor-pointer group"
          >
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Published Pages
              </p>
              <CheckCircleIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "..." : publishedCount}
            </div>
          </Link>

          <Link
            href="/webpages"
            className="rounded-sm bg-card border p-4 shadow-sm flex flex-col justify-center transition-all hover:border-primary hover:shadow-md cursor-pointer group"
          >
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Draft Pages
              </p>
              <FileIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-bold text-muted-foreground">
              {loading ? "..." : draftCount}
            </div>
          </Link>

          <Link
            href="/blogs"
            className="rounded-sm bg-card border p-4 shadow-sm flex flex-col justify-center transition-all hover:border-primary hover:shadow-md cursor-pointer group"
          >
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Total Blogs
              </p>
              <PenToolIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "..." : blogsCount}
            </div>
          </Link>
        </div>

        {/* Table Section */}
        <div className="flex flex-1 flex-col rounded-xl bg-card border shadow-xs p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Webpages</h3>
            <Link href="/webpages" className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="rounded-md">
            <DataTable columns={getWebpagesColumns(fetchDashboardData)} data={pages.slice(0, 10)} />
          </div>
        </div>
      </div>
    </>
  );
}
