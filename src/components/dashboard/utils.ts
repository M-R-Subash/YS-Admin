import { Globe, Share2, Mail, Compass } from "lucide-react";

export const EMPTY_ARRAY = Object.freeze([]) as readonly any[];

export function formatNumber(num: number): string {
  if (!num && num !== 0) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

export function getReferrerIcon(source: string) {
  const s = (source || "").toLowerCase();
  if (s.includes("google") || s.includes("bing") || s.includes("yahoo") || s.includes("search")) {
    return Globe;
  }
  if (
    s.includes("linkedin") ||
    s.includes("twitter") ||
    s.includes("x /") ||
    s.includes("facebook") ||
    s.includes("social")
  ) {
    return Share2;
  }
  if (s.includes("newsletter") || s.includes("email") || s.includes("mail")) {
    return Mail;
  }
  return Compass;
}
