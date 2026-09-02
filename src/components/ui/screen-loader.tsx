"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";

interface ScreenLoaderProps {
  text?: string;
  subtitle?: string;
  delayMs?: number;
}

export function ScreenLoader({
  text = "Loading YS CMS...",
  subtitle = "Please wait while we prepare your workspace",
  delayMs = 200,
}: ScreenLoaderProps) {
  const [visible, setVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    return <div className="fixed inset-0 z-[9999] bg-zinc-950" />;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 text-white transition-all duration-300">
      <div className="flex flex-col items-center space-y-5 p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl max-w-sm text-center">
        {/* Animated Brand Icon Ring */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
            <Layers className="w-8 h-8 animate-pulse" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-white/20 border-t-white animate-spin" />
        </div>

        {/* Loading Message */}
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white tracking-tight">
            {text}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Pulsing indicator dots */}
        <div className="flex items-center gap-1.5 pt-2">
          <span className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-white animate-bounce" />
        </div>
      </div>
    </div>
  );
}
