"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface ScreenLoaderProps {
  text?: string;
  subtitle?: string;
  delayMs?: number;
}

export function ScreenLoader({
  text = "YS Innovations CMS",
  subtitle = "Loading...",
  delayMs = 200,
}: ScreenLoaderProps) {
  const [visible, setVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) return;
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background/50 backdrop-blur-md transition-all duration-300 ease-out select-none"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Soft Circular Amber Ambient Aura */}
      <div className="absolute w-72 sm:w-96 h-72 sm:h-96 bg-[#F5A817]/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

      {/* Center Presentation */}
      <div className="relative flex flex-col items-center">
        {/* Orbital Precision Ring with Real YS Emblem */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          {/* SVG Circular Precision Spinner */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            fill="none"
          >
            {/* Background Track Circle */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="rgba(217, 119, 6, 0.25)"
              strokeWidth="2.5"
            />
            {/* Main High-Contrast Spinning Ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="url(#screenOrbitalGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="70 205"
              className="animate-spin [animation-duration:2.4s] origin-center drop-shadow-[0_0_6px_rgba(234,88,12,0.45)]"
            />
            {/* Inner Precision Accent Ring (Reverse Spin) */}
            <circle
              cx="50"
              cy="50"
              r="38"
              stroke="rgba(217, 119, 6, 0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="35 170"
              className="animate-spin [animation-duration:3.6s] [animation-direction:reverse] origin-center"
            />
            <defs>
              <linearGradient
                id="screenOrbitalGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#EA580C" />
                <stop offset="50%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>

          {/* Authentic YS Emblem Badge */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center animate-transition-pulse">
            <Image
              src="/ys-icon.png"
              alt="YS Innovations"
              width={56}
              height={56}
              className="w-full h-full object-contain rounded-sm shadow-[0_0_24px_rgba(245,168,23,0.35)]"
              priority
            />
          </div>
        </div>

        {/* Clean Brand Typography & Target Status */}
        <div className="mt-4 flex flex-col items-center text-center space-y-2">
          <span className="text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-foreground drop-shadow-xs">
            {text}
          </span>

          {/* Sleek Minimal Status Indicator */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-background/85 dark:bg-card/85 border border-border shadow-xs text-[11px] font-mono text-muted-foreground backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f5a817] animate-pulse" />
            <span className="text-foreground font-semibold">{subtitle}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
