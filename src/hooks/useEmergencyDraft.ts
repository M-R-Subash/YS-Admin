import { useEffect, useRef } from "react";

interface UseEmergencyDraftProps<T> {
  key: string;            // e.g. `emergency_blog_draft_...`
  isDirty: boolean;       // whether the form has unsaved changes
  getPayload: () => T;    // function to get the current payload to save
  enabled?: boolean;      // toggle the 10s auto-save
}

export function useEmergencyDraft<T>({
  key,
  isDirty,
  getPayload,
  enabled = true,
}: UseEmergencyDraftProps<T>) {

  // 1. Tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 2. Emergency auto-save (10s interval)
  const getPayloadRef = useRef(getPayload);
  useEffect(() => {
    getPayloadRef.current = getPayload;
  }, [getPayload]);

  useEffect(() => {
    if (!isDirty || !enabled) return;

    const interval = setInterval(() => {
      try {
        const payload = getPayloadRef.current();
        if (payload) {
          const backup = {
            data: payload,
            timestamp: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(backup));
        }
      } catch (err) {
        console.warn("Failed to write emergency backup to localStorage", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isDirty, enabled, key]);

  return {
    clearBackup: () => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.warn("Failed to clear emergency backup", err);
      }
    }
  };
}

// Utility to read the backup before mounting or inside fetch promises
export function getEmergencyBackup<T>(key: string, dbTime: number): { data: T; timestamp: number } | null {
  try {
    const rawLocal = localStorage.getItem(key);
    if (!rawLocal) return null;
    
    const parsed = JSON.parse(rawLocal);
    // Support both `data` (Blog) and `content` (Page) for cross-compatibility during refactor
    const payload = parsed.data || parsed.content; 
    
    if (parsed.timestamp && parsed.timestamp > dbTime && payload) {
      return { data: payload as T, timestamp: parsed.timestamp };
    }
  } catch (err) {
    console.warn("Could not check local storage backup", err);
  }
  return null;
}
