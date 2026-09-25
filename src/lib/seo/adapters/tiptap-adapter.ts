import type { ExtractedDoc, ImageNodeInfo, LinkNodeInfo } from "@/types/seo";

function isInternalLink(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    const url = new URL(href);
    return url.hostname.includes("ysinnovations.com");
  } catch {
    return false;
  }
}

export function extractTextFromTipTap(json: any): ExtractedDoc {
  if (!json) {
    return {
      fullText: "",
      introText: "",
      headingTexts: [],
      wordCount: 0,
      imageNodes: [],
      linkNodes: [],
      sentences: [],
      paragraphLengths: [],
    };
  }

  if (typeof json === "string") {
    const plain = json.replace(/<[^>]+>/g, " ");
    const words = plain.trim().split(/\s+/).filter(Boolean);
    const sentences = plain.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    return {
      fullText: plain,
      introText: plain.slice(0, 500),
      headingTexts: [],
      wordCount: words.length,
      imageNodes: [],
      linkNodes: [],
      sentences,
      paragraphLengths: [words.length],
    };
  }

  const allWords: string[] = [];
  const headingTexts: string[] = [];
  const imageNodes: ImageNodeInfo[] = [];
  const linkNodes: LinkNodeInfo[] = [];
  const paragraphLengths: number[] = [];
  let firstParagraphText = "";
  let imageIndex = 0;

  function traverse(node: any) {
    if (!node) return;

    // Collect heading text
    if (node.type === "heading" && Array.isArray(node.content)) {
      const headingText = node.content
        .map((c: any) => c.text || "")
        .join(" ")
        .trim();
      if (headingText) headingTexts.push(headingText);
    }

    // Collect first paragraph text
    if (
      node.type === "paragraph" &&
      !firstParagraphText &&
      Array.isArray(node.content)
    ) {
      firstParagraphText = node.content
        .map((c: any) => c.text || "")
        .join(" ")
        .trim();
    }

    // Track paragraph word counts for readability
    if (node.type === "paragraph" && Array.isArray(node.content)) {
      const paraText = node.content
        .map((c: any) => c.text || "")
        .join(" ")
        .trim();
      const paraWords = paraText.split(/\s+/).filter(Boolean).length;
      if (paraWords > 0) paragraphLengths.push(paraWords);
    }

    // Collect image nodes
    if (node.type === "image") {
      imageNodes.push({
        src: node.attrs?.src || "",
        alt: node.attrs?.alt || "",
        index: imageIndex++,
      });
    }

    // Collect text and check for links
    if (node.text) {
      allWords.push(node.text);

      if (Array.isArray(node.marks)) {
        const linkMark = node.marks.find((m: any) => m.type === "link");
        if (linkMark && linkMark.attrs?.href) {
          const href = linkMark.attrs.href;
          linkNodes.push({
            href,
            text: node.text,
            isInternal: isInternalLink(href),
          });
        }
      }
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(json);

  const fullText = allWords.join(" ");
  const words = fullText.trim().split(/\s+/).filter(Boolean);
  const sentences = fullText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    fullText,
    introText: firstParagraphText || fullText.slice(0, 500),
    headingTexts,
    wordCount: words.length,
    imageNodes,
    linkNodes,
    sentences,
    paragraphLengths,
  };
}
