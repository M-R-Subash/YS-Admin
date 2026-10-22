"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface ResourceLockState {
  isLockedByOther: boolean;
  lockedBy: string | null;
  isChecking: boolean;
  releaseLock: () => Promise<void>;
}

export function useResourceLock(
  resourceType: "blog" | "page",
  resourceId: string | undefined
): ResourceLockState {
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(() => Boolean(resourceId));
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAcquiredRef = useRef(false);

  const releaseLock = useCallback(async () => {
    if (!hasAcquiredRef.current || !resourceId) return;
    try {
      await fetch(`/api/locks?type=${resourceType}&id=${resourceId}`, {
        method: "DELETE",
      });
      hasAcquiredRef.current = false;
    } catch {
      // silent
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    if (!resourceId) {
      return;
    }

    let isMounted = true;

    const performLock = async () => {
      try {
        const res = await fetch("/api/locks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceType, resourceId }),
        });

        if (!isMounted) return;

        if (!res.ok) {
          setIsChecking(false);
          return;
        }

        const data = await res.json();
        if (!isMounted) return;

        setIsChecking(false);

        if (!data.acquired) {
          setIsLockedByOther(true);
          setLockedBy(data.lockedBy || "Another team member");
          hasAcquiredRef.current = false;
        } else {
          setIsLockedByOther(false);
          setLockedBy(null);
          hasAcquiredRef.current = true;
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn("[Lock:Client] Ping failed, failing open:", err);
        setIsChecking(false);
      }
    };

    // Execute async lock acquisition
    performLock();

    // Heartbeat every 30 seconds to keep lock warm
    heartbeatTimerRef.current = setInterval(() => {
      performLock();
    }, 30000);

    const handleUnload = () => {
      if (hasAcquiredRef.current && resourceId) {
        fetch(`/api/locks?type=${resourceType}&id=${resourceId}`, {
          method: "DELETE",
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      isMounted = false;
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      handleUnload();
    };
  }, [resourceType, resourceId]);

  return {
    isLockedByOther,
    lockedBy,
    isChecking,
    releaseLock,
  };
}
