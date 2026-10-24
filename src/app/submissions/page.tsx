"use client";

import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import useSWRInfinite from "swr/infinite";
import { RefreshCw, PanelLeft } from "lucide-react";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmModal, CONFIRM_PRESETS } from "@/components/modals/ConfirmModal";
import { useTrashManager } from "@/hooks/useTrashManager";
import {
  FormSubmission,
  SubmissionsResponse,
  FilterType,
  MobileView,
  getSenderName,
} from "./types";
import { SubmissionsSidebar } from "./SubmissionsSidebar";
import { SubmissionDetail } from "./SubmissionDetail";

export default function SubmissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Security Check: Redirect if not ADMIN
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/webpages");
    }
  }, [status, session, router]);

  const [selectedSubmissionState, setSelectedSubmission] =
    useState<FormSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [filter, setFilter] = useState<FilterType>("all");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAuthorized =
    status === "authenticated" && session?.user?.role === "ADMIN";

  const getKey = useCallback(
    (pageIndex: number, previousPageData: SubmissionsResponse | null) => {
      if (!isAuthorized) return null;
      if (previousPageData && (!previousPageData.submissions || !previousPageData.pagination?.hasMore)) {
        return null;
      }
      const params = new URLSearchParams();
      params.set("page", String(pageIndex + 1));
      params.set("limit", "15");
      params.set("filter", filter);
      return `/api/forms/submissions?${params.toString()}`;
    },
    [isAuthorized, filter]
  );

  const {
    data: pagesData,
    size,
    setSize,
    isLoading: isSubLoading,
    mutate: mutateSubmissions,
  } = useSWRInfinite<SubmissionsResponse>(getKey, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
  });

  const submissions = useMemo(
    () => pagesData?.flatMap((page) => page?.submissions ?? []) ?? [],
    [pagesData]
  );
  const totalCount = pagesData?.[0]?.totalCount ?? 0;
  const unreadCount = pagesData?.[0]?.unreadCount ?? 0;
  const trashedCount = pagesData?.[0]?.trashedCount ?? 0;

  const lastPage = pagesData ? pagesData[pagesData.length - 1] : null;
  const hasMore = lastPage?.pagination?.hasMore ?? false;
  const isLoadingMore =
    isSubLoading ||
    (size > 0 && pagesData && typeof pagesData[size - 1] === "undefined");

  const loading = isSubLoading && !pagesData;

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, isLoadingMore, setSize]);

  const selectedSubmission =
    (selectedSubmissionState &&
      submissions.find((s) => s.id === selectedSubmissionState.id)) ||
    selectedSubmissionState;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutateSubmissions();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [mutateSubmissions]);

  // Handle selecting a submission & Auto Mark-as-Read & Switch to Detail on Mobile
  const handleSelectSubmission = useCallback(async (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setMobileView("detail");

    if (!submission.isRead && !submission.isTrashed) {
      // Optimistically update SWR cache
      mutateSubmissions(
        (pages) => {
          if (!pages) return pages;
          return pages.map((page) => ({
            ...page,
            unreadCount: Math.max(0, (page.unreadCount || 0) - 1),
            submissions: (page.submissions || []).map((item) =>
              item.id === submission.id ? { ...item, isRead: true } : item
            ),
          }));
        },
        false
      );
      setSelectedSubmission({ ...submission, isRead: true });

      try {
        await fetch(`/api/forms/submissions/${submission.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
        globalMutate("/api/badges");
        globalMutate("/api/dashboard/stats");
      } catch (err) {
        console.error("Failed to auto mark submission as read:", err);
        mutateSubmissions();
      }
    }
  }, [mutateSubmissions]);

  // Toggle Read / Unread manually
  const toggleReadStatus = useCallback(async (submission: FormSubmission) => {
    const newStatus = !submission.isRead;

    // Optimistically update SWR cache
    mutateSubmissions(
      (pages) => {
        if (!pages) return pages;
        return pages.map((page) => ({
          ...page,
          unreadCount: newStatus
            ? Math.max(0, (page.unreadCount || 0) - 1)
            : (page.unreadCount || 0) + 1,
          submissions: (page.submissions || []).map((item) =>
            item.id === submission.id ? { ...item, isRead: newStatus } : item
          ),
        }));
      },
      false
    );

    setSelectedSubmission((current) =>
      current?.id === submission.id ? { ...current, isRead: newStatus } : current
    );

    try {
      const res = await fetch(`/api/forms/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: newStatus }),
      });
      if (!res.ok) throw new Error();
      globalMutate("/api/badges");
      globalMutate("/api/dashboard/stats");
      mutateSubmissions();
    } catch {
      mutateSubmissions();
    }
  }, [mutateSubmissions]);

  // Centralized Trash Manager Hook
  const {
    modal,
    loading: trashLoading,
    openTrashModal,
    closeModal,
    handleConfirm,
  } = useTrashManager<FormSubmission>({
    itemType: "submission",
    getApiEndpoint: (id) => `/api/forms/submissions/${id}`,
    onSuccess: async () => {
      if (selectedSubmission && modal.targetId === selectedSubmission.id) {
        setSelectedSubmission(null);
        setMobileView("list");
      }
      await mutateSubmissions();
      globalMutate("/api/badges");
      globalMutate("/api/dashboard/stats");
    },
  });

  // Filter submissions by search query (memoized with deferred search)
  const filteredSubmissions = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    if (!query) return submissions;

    return submissions.filter((s) => {
      const sender = getSenderName(s.payload).toLowerCase();
      const form = (s.formName || "").toLowerCase();
      const payloadStr = JSON.stringify(s.payload || {}).toLowerCase();

      return (
        sender.includes(query) ||
        form.includes(query) ||
        payloadStr.includes(query)
      );
    });
  }, [submissions, deferredSearch]);

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Top Bar Header */}
        <AdminTopBar
          breadcrumbs="Submissions"
          actions={
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Tablet/Desktop Sidebar Toggle */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setIsSidebarOpen((prev) => !prev)}
                      className="hidden md:flex p-1.5 sm:p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <PanelLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  }
                />
                <TooltipContent side="bottom">
                  {isSidebarOpen ? "Hide inbox list" : "Show inbox list"}
                </TooltipContent>
              </Tooltip>

              {/* Desktop-only Action Badges and Refresh */}
              <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={handleRefresh}
                        className="p-1.5 sm:p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      />
                    }
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                        isRefreshing || loading ? "animate-spin" : ""
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Refresh Submissions</TooltipContent>
                </Tooltip>

                <Badge variant="outline" className="text-xs bg-card px-2.5 py-1">
                  Total:{" "}
                  <span className="font-bold ml-1 text-foreground">
                    {totalCount}
                  </span>
                </Badge>

                {unreadCount > 0 && (
                  <Badge className="text-xs bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 font-bold">
                    {unreadCount} Unread
                  </Badge>
                )}

                {trashedCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs border-red-300 text-red-600 dark:text-red-400 px-2.5 py-1 font-bold"
                  >
                    {trashedCount} Trashed
                  </Badge>
                )}
              </div>

              {/* Mobile-only Unread Badge Indicator */}
              {unreadCount > 0 && (
                <div className="flex md:hidden items-center gap-1.5">
                  <Badge className="text-[10px] bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 font-bold">
                    {unreadCount} Unread
                  </Badge>
                </div>
              )}
            </div>
          }
        />

        {/* Master-Detail Responsive Container with Mobile Slide Animation */}
        <div className="flex-1 w-full overflow-hidden min-h-0 relative">
          <div
            className={`flex w-full h-full transition-transform duration-300 ease-in-out md:transition-none md:translate-x-0 ${
              mobileView === "detail"
                ? "-translate-x-full md:translate-x-0"
                : "translate-x-0"
            }`}
          >
            {/* Left Master List Sidebar */}
            <SubmissionsSidebar
              submissions={submissions}
              filteredSubmissions={filteredSubmissions}
              selectedSubmission={selectedSubmission}
              onSelectSubmission={handleSelectSubmission}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filter={filter}
              setFilter={setFilter}
              totalCount={totalCount}
              unreadCount={unreadCount}
              trashedCount={trashedCount}
              loading={loading}
              mobileView={mobileView}
              isSidebarOpen={isSidebarOpen}
              handleRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              loadMoreRef={loadMoreRef}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
            />

            {/* Right Detail Pane */}
            <SubmissionDetail
              selectedSubmission={selectedSubmission}
              totalCount={totalCount}
              loading={loading}
              mobileView={mobileView}
              setMobileView={setMobileView}
              toggleReadStatus={toggleReadStatus}
              openTrashModal={openTrashModal}
              handleRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        </div>
      </div>

      {/* Centralized Trash Confirmation Modal */}
      <ConfirmModal
        open={modal.isOpen}
        onOpenChange={(open) => !open && closeModal()}
        {...CONFIRM_PRESETS.action(modal.type, "submission", modal.targetName)}
        loading={trashLoading}
        onConfirm={() => handleConfirm()}
      />
    </TooltipProvider>
  );
}
