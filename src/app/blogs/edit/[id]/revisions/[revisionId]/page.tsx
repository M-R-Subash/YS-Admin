"use client";

import React from "react";
import { useParams } from "next/navigation";
import { RevisionDiffViewer } from "@/components/blog/revisions/RevisionDiffViewer";

export default function BlogRevisionDiffPage() {
  const params = useParams();
  const id = params?.id as string;
  const revisionId = params?.revisionId as string;

  if (!id || !revisionId) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-xs text-muted-foreground">
        Loading revision parameters...
      </div>
    );
  }

  return <RevisionDiffViewer blogId={id} revisionId={revisionId} />;
}
