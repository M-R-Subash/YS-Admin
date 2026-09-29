"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Youtube from "@tiptap/extension-youtube";
import Typography from "@tiptap/extension-typography";

interface TipTapDiffReaderProps {
  content: any;
  className?: string;
}

export function TipTapDiffReader({ content, className = "" }: TipTapDiffReaderProps) {
  // Normalize content: ensure it's not a string and remove faqs if embedded
  const cleanContent = React.useMemo(() => {
    if (!content) return { type: "doc", content: [] };
    let parsed = content;
    if (typeof content === "string") {
      try {
        parsed = JSON.parse(content);
      } catch {
        return { type: "doc", content: [] };
      }
    }
    if (parsed && typeof parsed === "object") {
      const copy = { ...parsed };
      delete copy.faqs;
      return copy;
    }
    return parsed;
  }, [content]);

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({ inline: false }),
      Typography,
    ],
    content: cleanContent,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && cleanContent) {
      editor.commands.setContent(cleanContent);
    }
  }, [cleanContent, editor]);

  if (!editor) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
        Loading document preview...
      </div>
    );
  }

  return (
    <div className={`prose dark:prose-invert max-w-none text-sm leading-relaxed ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
