"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Home, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isPrankRevealed, setIsPrankRevealed] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [buttonWobble, setButtonWobble] = useState(false);

  // Prevents duplicate toast execution under any circumstance (e.g. React StrictMode)
  const hasTriggeredRef = useRef(false);

  const showPrankToast = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setIsPrankRevealed(true);

    toast.add({
      title: "You've Been Pranked! 😂",
      description:
        "Chrome didn't crash and there are no memory leaks. You just navigated to an unmapped route in the CMS.",
      type: "info",
      timeout: 0,
      data: { wide: true },
    });
  }, []);

  useEffect(() => {
    setMounted(true);

    // Detect dark or light mode from OS/Browser
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const isDarkMode =
      mediaQuery.matches || document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);

    // Ensure .dark class is on <html> so shadcn toast matches dark theme
    const hadDarkClass = document.documentElement.classList.contains("dark");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    }

    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    // Automatic prank reveal after exactly 3.0 seconds
    const timer = setTimeout(() => {
      showPrankToast();
    }, 3000);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
      clearTimeout(timer);
      if (!hadDarkClass) {
        document.documentElement.classList.remove("dark");
      }
    };
  }, [showPrankToast]);

  const handleReloadClick = (e: React.MouseEvent) => {
    if (!isPrankRevealed) {
      e.preventDefault();
      setButtonWobble(true);
      setTimeout(() => setButtonWobble(false), 600);
      showPrankToast();
    }
  };

  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    showPrankToast();
    setShowLearnMore((prev) => !prev);
  };

  const content = (
    <div
      className={`fixed inset-0 z-[50] w-screen h-screen min-h-screen overflow-hidden flex flex-col justify-center items-center px-6 transition-colors duration-200 select-none ${
        isDark ? "bg-[#202124] text-[#e8eaed]" : "bg-[#ffffff] text-[#202124]"
      }`}
      style={{
        fontFamily:
          'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* Exact Chrome Aw, Snap! Layout Container */}
      <div className="w-full max-w-[620px] mx-auto text-left flex flex-col">
        {/* Pixel-Perfect Chrome Sad Tab Icon */}
        <div className="mb-5">
          <Image
            src={isDark ? "/chrome-sad-tab.png" : "/chrome-sad-tab-light.png"}
            alt="Aw, Snap!"
            width={48}
            height={40}
            className="w-12 h-auto [image-rendering:pixelated] select-none"
            priority
          />
        </div>

        {/* Heading: Aw, Snap! */}
        <h1
          className={`text-[28px] font-normal leading-tight tracking-normal mb-3 ${
            isDark ? "text-[#e8eaed]" : "text-[#202124]"
          }`}
        >
          Aw, Snap!
        </h1>

        {/* Subtitle */}
        <p
          className={`text-[15px] font-normal leading-relaxed mb-3 ${
            isDark ? "text-[#9aa0a6]" : "text-[#5f6368]"
          }`}
        >
          Something went wrong while displaying this webpage.
        </p>

        {/* Error code line: clean SIGSEGV without green text */}
        <div className="flex items-center mb-10 text-[13px] font-normal font-mono">
          <span className={isDark ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
            Error code: SIGSEGV
          </span>
        </div>

        {/* Dynamic Learn More Drawer */}
        {showLearnMore && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs leading-relaxed border animate-in fade-in duration-200 ${
              isDark
                ? "bg-[#292a2d] border-[#3c4043] text-[#e8eaed]"
                : "bg-[#f1f3f4] border-[#dadce0] text-[#202124]"
            }`}
          >
            <p className="font-semibold mb-1">Why did this happen?</p>
            <p className="text-muted-foreground">
              You navigated to an unmapped slug in the CMS. No browser processes
              were actually harmed, no memory was leaked
            </p>
          </div>
        )}

        {/* Action Bottom Row (Learn more on left, Reload/Dashboard on right) */}
        <div className="flex items-center justify-between pt-2">
          {/* Learn More Link */}
          <button
            type="button"
            onClick={handleLearnMoreClick}
            className={`text-[14px] font-medium transition-colors hover:underline cursor-pointer bg-transparent border-0 p-0 ${
              isDark ? "text-[#8ab4f8]" : "text-[#1a73e8]"
            }`}
          >
            {showLearnMore ? "Hide details" : "Learn more"}
          </button>

          {/* Action Button: Initially Reload, then Return to Dashboard */}
          <div className="flex items-center gap-3">
            {!isPrankRevealed ? (
              <button
                type="button"
                onClick={handleReloadClick}
                className={`rounded-full px-6 py-2.5 text-[14px] font-medium transition-all shadow-none cursor-pointer ${
                  buttonWobble ? "animate-bounce" : ""
                } ${
                  isDark
                    ? "bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#062e6f] font-semibold"
                    : "bg-[#0b57d0] hover:bg-[#1557d0] text-[#ffffff]"
                }`}
              >
                Reload
              </button>
            ) : (
              <div className="flex items-center gap-2.5 animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className={`text-[13px] px-3.5 py-2 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isDark
                      ? "text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#292a2d]"
                      : "text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Go Back</span>
                </button>

                <Link
                  href="/"
                  className={`rounded-full px-5 py-2.5 text-[14px] font-medium transition-all cursor-pointer flex items-center gap-2 ${
                    isDark
                      ? "bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#062e6f] font-semibold"
                      : "bg-[#0b57d0] hover:bg-[#1557d0] text-[#ffffff]"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Dashboard</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
}
