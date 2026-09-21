// ─── Utility Helpers for Blog Form ──────────────────────────────────────────

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface TocIssue {
  index: number;
  message: string;
}

export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function extractTocFromTipTap(json: any): TocItem[] {
  if (!json || typeof json !== "object") return [];
  const items: TocItem[] = [];
  let headingIndex = 0;

  function traverse(node: any) {
    if (!node) return;
    if (node.type === "heading" && Array.isArray(node.content)) {
      const text = node.content.map((c: any) => c.text || "").join(" ").trim();
      if (text) {
        const level = node.attrs?.level || 2;
        const id = `heading-${headingIndex++}`;
        items.push({ id, text, level });
      }
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) traverse(child);
    }
  }

  traverse(json);
  return items;
}

export function calculateReadingTime(json: any): number {
  if (!json) return 1;
  let text = "";
  const extractText = (node: any) => {
    if (!node) return;
    if (node.text) text += " " + node.text;
    if (Array.isArray(node.content)) {
      node.content.forEach(extractText);
    }
  };
  extractText(json);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Character counter color helper
export function charCountColor(current: number, optimal: number, max: number): string {
  if (current > max) return "text-red-500";
  if (current >= optimal) return "text-emerald-500";
  if (current > 0) return "text-amber-500";
  return "text-muted-foreground";
}

// Helpers to normalize content and faqs comparison
export function isContentEqual(a: any, b: any): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const cleanDoc = (doc: any) => {
    if (!doc) return null;
    if (typeof doc === "string") {
      try {
        doc = JSON.parse(doc);
      } catch {
        return doc;
      }
    }
    if (typeof doc !== "object") return doc;
    const clone = { ...doc };
    delete clone.faqs;
    return clone;
  };
  return JSON.stringify(cleanDoc(a)) === JSON.stringify(cleanDoc(b));
}

export function areFaqsEqual(a: any[], b: any[]): boolean {
  const listA = a || [];
  const listB = b || [];
  if (listA.length !== listB.length) return false;
  return (
    JSON.stringify(listA.map((f) => ({ q: (f?.question || "").trim(), a: (f?.answer || "").trim() }))) ===
    JSON.stringify(listB.map((f) => ({ q: (f?.question || "").trim(), a: (f?.answer || "").trim() })))
  );
}
