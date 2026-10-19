"use client";

import React, { useState, useEffect, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 600,
  formatter,
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const targetValue = value;
    prevValueRef.current = targetValue;

    if (startValue === targetValue) {
      setDisplayValue(targetValue);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth natural deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (targetValue - startValue) * ease;

      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, duration]);

  const formatted = formatter
    ? formatter(displayValue)
    : Math.round(displayValue).toLocaleString();

  return <span className={className}>{formatted}</span>;
}
