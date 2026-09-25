"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/**
 * Fast deep equality checker for comparing current form state against a baseline.
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export interface UseDirtyManagerOptions<T = any> {
  /**
   * Explicit isDirty boolean (e.g. from React Hook Form or custom calculation).
   * When provided, this takes precedence unless manually overridden with setOverride.
   */
  isDirty?: boolean;

  /**
   * Current form/content data for automatic snapshot comparison.
   */
  currentData?: T;

  /**
   * Initial baseline data to compare against.
   */
  initialData?: T;

  /**
   * Custom dirty comparator: returns true if current differs from baseline.
   * If omitted, deepEqual is used.
   */
  isDirtyFn?: (current: T, baseline: T) => boolean;

  /**
   * Whether to attach a window `beforeunload` listener to warn on tab closing/reload while dirty.
   * Default: false
   */
  protectWindowClose?: boolean;

  /**
   * Callback fired when `markClean` is called (e.g. to call RHF's `reset(data)`).
   */
  onMarkClean?: (newBaseline?: T) => void;
}

export interface UseDirtyManagerReturn<T = any> {
  /**
   * Whether the form currently has unsaved changes.
   */
  isDirty: boolean;

  /**
   * Convenience helper for disabled save buttons.
   * Returns true (i.e. disabled) if the form is NOT dirty OR if isSubmitting is true.
   */
  isSaveDisabled: (isSubmitting?: boolean) => boolean;

  /**
   * Mark the form as clean. Updates internal baseline to newBaseline (or currentData)
   * and triggers the onMarkClean callback.
   */
  markClean: (newBaseline?: T) => void;

  /**
   * Manually override dirty state (pass null to revert to automatic calculation).
   */
  setOverrideDirty: (dirty: boolean | null) => void;

  /**
   * State and setter for an exit confirmation modal.
   */
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;

  /**
   * Intercepts navigation:
   * - If form is clean, executes onProceed immediately.
   * - If form is dirty, records onProceed and opens exit confirmation modal.
   */
  confirmExit: (onProceed: () => void) => void;

  /**
   * Confirms exit from modal: closes modal and executes the pending onProceed action.
   */
  handleConfirmExit: () => void;

  /**
   * Cancels exit from modal and clears pending action.
   */
  handleCancelExit: () => void;
}

export function useDirtyManager<T = any>({
  isDirty: explicitDirty,
  currentData,
  initialData,
  isDirtyFn,
  protectWindowClose = false,
  onMarkClean,
}: UseDirtyManagerOptions<T>): UseDirtyManagerReturn<T> {
  // Stored baseline for snapshot comparison
  const [baseline, setBaseline] = useState<T | undefined>(initialData);
  const [overrideDirty, setOverrideDirty] = useState<boolean | null>(null);

  // Exit confirmation modal state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pendingExitActionRef = useRef<(() => void) | null>(null);

  // Keep baseline in sync if initialData changes and user hasn't dirtied the form yet
  const initialDataRef = useRef(initialData);
  useEffect(() => {
    if (!deepEqual(initialData, initialDataRef.current)) {
      initialDataRef.current = initialData;
      setBaseline(initialData);
    }
  }, [initialData]);

  // Compute computed dirty state
  const computedDirty = useMemo(() => {
    if (explicitDirty !== undefined) {
      return explicitDirty;
    }
    if (currentData !== undefined && baseline !== undefined) {
      if (isDirtyFn) {
        return isDirtyFn(currentData, baseline);
      }
      return !deepEqual(currentData, baseline);
    }
    return false;
  }, [explicitDirty, currentData, baseline, isDirtyFn]);

  // Final resolved dirty state (override takes precedence if set)
  const isDirty = overrideDirty !== null ? overrideDirty : computedDirty;

  // Window beforeunload tab close warning
  useEffect(() => {
    if (!protectWindowClose) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, protectWindowClose]);

  // Mark clean handler
  const markClean = useCallback(
    (newBaseline?: T) => {
      const nextBaseline = newBaseline !== undefined ? newBaseline : currentData;
      setBaseline(nextBaseline);
      setOverrideDirty(false);
      onMarkClean?.(nextBaseline);
    },
    [currentData, onMarkClean]
  );

  // Helper for save button disabled logic
  const isSaveDisabled = useCallback(
    (isSubmitting = false) => {
      return isSubmitting || !isDirty;
    },
    [isDirty]
  );

  // Navigation exit guard
  const confirmExit = useCallback(
    (onProceed: () => void) => {
      if (!isDirty) {
        onProceed();
      } else {
        pendingExitActionRef.current = onProceed;
        setShowExitConfirm(true);
      }
    },
    [isDirty]
  );

  // Handle confirm exit from dialog
  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);
    if (pendingExitActionRef.current) {
      const action = pendingExitActionRef.current;
      pendingExitActionRef.current = null;
      action();
    }
  }, []);

  // Handle cancel exit from dialog
  const handleCancelExit = useCallback(() => {
    setShowExitConfirm(false);
    pendingExitActionRef.current = null;
  }, []);

  return {
    isDirty,
    isSaveDisabled,
    markClean,
    setOverrideDirty,
    showExitConfirm,
    setShowExitConfirm,
    confirmExit,
    handleConfirmExit,
    handleCancelExit,
  };
}
