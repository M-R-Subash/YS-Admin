import { useSyncExternalStore } from "react";

let cachedTime = typeof Date !== "undefined" ? Date.now() : 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (listeners.size === 1) {
    cachedTime = Date.now();
    intervalId = setInterval(() => {
      cachedTime = Date.now();
      listeners.forEach((l) => l());
    }, 10000);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot(): number {
  return cachedTime;
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * Purity-compliant hook for accessing the current timestamp during render.
 * Synchronizes with an external time store to satisfy React compiler purity rules.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
