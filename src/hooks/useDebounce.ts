import { useState, useEffect } from "react";

/**
 * useDebounce Hook
 * Delays updating the debounced value until after the specified delay has passed
 * since the last change. Essential for search inputs to prevent hitting backend
 * APIs on every single keystroke.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
