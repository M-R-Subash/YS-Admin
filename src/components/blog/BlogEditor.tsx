"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Placeholder } from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Youtube from "@tiptap/extension-youtube";
import Typography from "@tiptap/extension-typography";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Check,
  Trash2,
  Unlink,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  GripVertical,
  Undo,
  Redo,
  Quote,
  Code,
  Minus,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  CheckSquare,
  Video as YoutubeIcon,
  ChevronDown,
  Maximize2,
  ChevronsUpDown
} from "lucide-react";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BlogEditorProps {
  initialContent?: any;
  onChange: (json: any) => void;
  onWordCountChange?: (words: number) => void;
}

const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration is missing in environment");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Failed to upload image to Cloudinary");
  }

  return data.secure_url;
};

const emptySubscribe = () => () => {};

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: {
        default: "",
        parseHTML: (element) => element.getAttribute("alt") || "",
        renderHTML: (attributes) => ({ alt: attributes.alt || "" }),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
        renderHTML: (attributes) => (attributes.caption ? { "data-caption": attributes.caption } : {}),
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
        renderHTML: (attributes) => ({ "data-alignment": attributes.alignment || "center" }),
      },
    };
  },
});

const Details = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary detailsContent",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attributes) => (attributes.open ? { open: "" } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "details" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        class: "my-4 rounded-xl border border-border bg-card/60 p-4 transition-all duration-200 open:shadow-xs",
      }),
      0,
    ];
  },
});

const DetailsSummary = Node.create({
  name: "detailsSummary",
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: "summary" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, {
        class: "font-bold text-sm text-foreground cursor-pointer select-none flex items-center gap-2",
      }),
      0,
    ];
  },
});

const DetailsContent = Node.create({
  name: "detailsContent",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-details-content]" }, { tag: "div.details-content" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-details-content": "",
        class: "mt-2 pt-2 border-t border-border/50 text-muted-foreground",
      }),
      0,
    ];
  },
});

export default function BlogEditor({
  initialContent,
  onChange,
  onWordCountChange,
}: BlogEditorProps) {
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  
  // Link popover state
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);
  const [linkNoFollow, setLinkNoFollow] = useState(true);

  // Table popover state
  const [showTablePopover, setShowTablePopover] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // YouTube video modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");

  // Image bubble menu state
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  const handleInsertVideo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setVideoError("Please enter a YouTube video URL.");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setVideoError("Please enter a valid URL (e.g. https://www.youtube.com/watch?v=...)");
      return;
    }
    editor?.chain().focus().setYoutubeVideo({ src: trimmed }).run();
    setShowVideoModal(false);
    setVideoUrl("");
    setVideoError("");
  };

  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      CustomImage,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing...",
        showOnlyCurrent: true,
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount,
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({ inline: false }),
      Typography,
      Details,
      DetailsSummary,
      DetailsContent,
    ],
    content: initialContent || "",
    onCreate: ({ editor }) => {
      onWordCountChange?.(editor.storage.characterCount.words());
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
      onWordCountChange?.(editor.storage.characterCount.words());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose !max-w-full w-full focus:outline-none min-h-full pt-6 px-10 md:px-16 pb-96 [&_p]:my-2 [&_p]:leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border [&_td]:p-2 [&_th]:p-2 [&_th]:bg-muted/50 text-sm sm:text-base [&_p.is-empty::before]:content-[attr(data-placeholder)] [&_p.is-empty::before]:float-left [&_p.is-empty::before]:text-muted-foreground/50 [&_p.is-empty::before]:pointer-events-none [&_p.is-empty::before]:h-0 [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_img]:shadow-md [&_img]:cursor-pointer [&_img]:transition-all [&_img.ProseMirror-selectednode]:ring-2 [&_img.ProseMirror-selectednode]:ring-primary [&_img.ProseMirror-selectednode]:ring-offset-2 [&_img[data-alignment='left']]:mr-auto [&_img[data-alignment='left']]:block [&_img[data-alignment='left']]:max-w-[70%] [&_img[data-alignment='center']]:mx-auto [&_img[data-alignment='center']]:block [&_img:not([data-alignment])]:mx-auto [&_img:not([data-alignment])]:block [&_img[data-alignment='full']]:w-full [&_img[data-alignment='full']]:max-w-full [&_img[data-alignment='full']]:block [&_details]:my-4 [&_details]:rounded-xl [&_details]:border [&_details]:border-border [&_details]:bg-card/60 [&_details]:p-4 [&_details[open]]:shadow-xs [&_summary]:font-bold [&_summary]:text-sm [&_summary]:text-foreground [&_summary]:cursor-pointer [&_summary]:select-none",
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const link = target.closest("a");
        if (link) {
          event.preventDefault();
          const href = link.getAttribute("href") || "";
          const targetAttr = link.getAttribute("target") || "";
          const relAttr = link.getAttribute("rel") || "";
          setLinkUrl(href);
          setLinkOpenInNewTab(targetAttr === "_blank");
          setLinkNoFollow(relAttr.includes("nofollow"));
          editor?.commands.extendMarkRange("link");
          return true;
        }
        if (target.tagName === "IMG") {
          try {
            const nodePos = view.posAtDOM(target, 0);
            editor?.commands.setNodeSelection(nodePos);
            return true;
          } catch {
            // fallback
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.indexOf("image") === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadToCloudinary(file).then((url) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url })
                  )
                );
              });
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.indexOf("image") === 0) {
            event.preventDefault();
            uploadToCloudinary(file).then((url) => {
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (coordinates) {
                view.dispatch(
                  view.state.tr.insert(
                    coordinates.pos,
                    view.state.schema.nodes.image.create({ src: url })
                  )
                );
              }
            });
            return true;
          }
        }
        return false;
      }
    },
  }, []);

  useEffect(() => {
    if (!editor) return;

    // Prevent native browser navigation on any link inside the editor
    const dom = editor.view.dom;
    const preventLinkNavigation = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (anchor) {
        e.preventDefault();
      }
    };
    dom.addEventListener("click", preventLinkNavigation, true);

    const handleSelectionUpdate = () => {
      setTick((t) => t + 1);
      if (editor.isActive("link")) {
        const attrs = editor.getAttributes("link");
        if (attrs.href) {
          setLinkUrl((prev) => (prev !== attrs.href ? attrs.href : prev));
          setLinkOpenInNewTab((prev) => (prev !== (attrs.target === "_blank") ? attrs.target === "_blank" : prev));
          setLinkNoFollow((prev) => (prev !== Boolean(attrs.rel?.includes("nofollow")) ? Boolean(attrs.rel?.includes("nofollow")) : prev));
        }
      }
      if (editor.isActive("image")) {
        const attrs = editor.getAttributes("image");
        setImageAlt((prev) => (prev !== (attrs.alt || "") ? (attrs.alt || "") : prev));
        setImageCaption((prev) => (prev !== (attrs.caption || "") ? (attrs.caption || "") : prev));
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      dom.removeEventListener("click", preventLinkNavigation, true);
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor]);

  if (!isMounted || !editor) {
    return <div className="h-100 bg-card border rounded-xl animate-pulse"></div>;
  }


  const addLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkPopover(false);
      return;
    }
    
    let formattedUrl = linkUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://") && !formattedUrl.startsWith("mailto:")) {
      formattedUrl = "https://" + formattedUrl;
    }

    editor.chain().focus().extendMarkRange("link").setLink({
      href: formattedUrl,
      target: linkOpenInNewTab ? "_blank" : "",
      rel: linkNoFollow ? "noopener noreferrer nofollow" : "noopener noreferrer",
    }).run();
    
    setShowLinkPopover(false);
  };

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col h-full border border-border rounded-xl bg-card overflow-hidden relative">
        
        {/* Editor Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 bg-card border-b border-border shadow-sm shrink-0">
        
        {/* Undo/Redo Group */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={<Undo className="w-4 h-4" />}
            title="Undo"
            shortcut="Ctrl+Z"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={<Redo className="w-4 h-4" />}
            title="Redo"
            shortcut="Ctrl+Y"
          />
        </div>

        {/* Formatting Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            icon={<Bold className="w-4 h-4" />}
            title="Bold"
            shortcut="Ctrl+B"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            icon={<Italic className="w-4 h-4" />}
            title="Italic"
            shortcut="Ctrl+I"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            icon={<UnderlineIcon className="w-4 h-4" />}
            title="Underline"
            shortcut="Ctrl+U"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            icon={<Strikethrough className="w-4 h-4" />}
            title="Strikethrough"
            shortcut="Ctrl+Shift+S"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive("highlight")}
            icon={<Highlighter className="w-4 h-4" />}
            title="Highlight"
            shortcut="Ctrl+Shift+H"
          />
        </div>

        {/* Block Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            icon={<Quote className="w-4 h-4" />}
            title="Quote"
            shortcut="Ctrl+Shift+B"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            icon={<Code className="w-4 h-4" />}
            title="Code Block"
            shortcut="Ctrl+Alt+C"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            icon={<Minus className="w-4 h-4" />}
            title="Divider"
            shortcut="---"
          />
        </div>

        {/* Headings Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            icon={<Heading1 className="w-4 h-4" />}
            title="Heading 1"
            shortcut="Ctrl+Alt+1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            icon={<Heading2 className="w-4 h-4" />}
            title="Heading 2"
            shortcut="Ctrl+Alt+2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            icon={<Heading3 className="w-4 h-4" />}
            title="Heading 3"
            shortcut="Ctrl+Alt+3"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            isActive={editor.isActive("heading", { level: 4 })}
            icon={<Heading4 className="w-4 h-4" />}
            title="Heading 4"
            shortcut="Ctrl+Alt+4"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            isActive={editor.isActive("heading", { level: 5 })}
            icon={<Heading5 className="w-4 h-4" />}
            title="Heading 5"
            shortcut="Ctrl+Alt+5"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
            isActive={editor.isActive("heading", { level: 6 })}
            icon={<Heading6 className="w-4 h-4" />}
            title="Heading 6"
            shortcut="Ctrl+Alt+6"
          />
        </div>

        {/* Alignment Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            icon={<AlignLeft className="w-4 h-4" />}
            title="Align Left"
            shortcut="Ctrl+Shift+L"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            icon={<AlignCenter className="w-4 h-4" />}
            title="Align Center"
            shortcut="Ctrl+Shift+E"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            icon={<AlignRight className="w-4 h-4" />}
            title="Align Right"
            shortcut="Ctrl+Shift+R"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            icon={<AlignJustify className="w-4 h-4" />}
            title="Justify"
            shortcut="Ctrl+Shift+J"
          />
        </div>

        {/* Lists Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            icon={<List className="w-4 h-4" />}
            title="Bullet List"
            shortcut="Ctrl+Shift+8"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            icon={<ListOrdered className="w-4 h-4" />}
            title="Ordered List"
            shortcut="Ctrl+Shift+7"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            icon={<CheckSquare className="w-4 h-4" />}
            title="Task List"
            shortcut="Ctrl+Shift+9"
          />
        </div>

        {/* Media & Links Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border relative">
          <div className="relative">
            <ToolbarButton
              onClick={() => {
                if (editor.isActive('link')) {
                  const attrs = editor.getAttributes("link");
                  setLinkUrl(attrs.href || "");
                  setLinkOpenInNewTab(attrs.target === "_blank");
                  setLinkNoFollow(Boolean(attrs.rel?.includes("nofollow")));
                  setShowLinkPopover(!showLinkPopover);
                } else {
                  setLinkUrl("");
                  setLinkOpenInNewTab(true);
                  setLinkNoFollow(true);
                  setShowLinkPopover(!showLinkPopover);
                }
              }}
              isActive={editor.isActive("link")}
              icon={
                <div className="flex items-center gap-0.5">
                  <LinkIcon className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </div>
              }
              title={editor.isActive("link") ? "Edit Link" : "Insert Link"}
              shortcut="Ctrl+K"
              className="w-auto px-2"
            />
            
            {showLinkPopover && (
              <div className="absolute top-full left-0 mt-2 p-4 bg-card border border-border shadow-xl rounded-xl w-72 z-50">
                <input
                  type="text"
                  placeholder="Paste URL (e.g. https://...)..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 mb-3 text-sm border border-input rounded-md focus:outline-ring"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                />
                <div className="flex flex-col gap-3 mb-4 mt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="topOpenInNewTab" className="cursor-pointer font-medium text-xs">Open in new tab</Label>
                    <Switch
                      id="topOpenInNewTab"
                      checked={linkOpenInNewTab}
                      onCheckedChange={setLinkOpenInNewTab}
                      className="scale-75 origin-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="topNoFollow" className="cursor-pointer font-medium text-xs">Add nofollow</Label>
                    <Switch
                      id="topNoFollow"
                      checked={linkNoFollow}
                      onCheckedChange={setLinkNoFollow}
                      className="scale-75 origin-right"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {editor.isActive("link") ? (
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().unsetLink().run();
                        setShowLinkPopover(false);
                      }}
                      className="text-destructive hover:underline text-xs flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Unlink className="w-3.5 h-3.5" /> Remove
                    </button>
                  ) : <div />}
                  <div className="flex gap-2">
                    <button onClick={() => setShowLinkPopover(false)} className="px-3 py-1.5 text-xs hover:bg-accent rounded-md transition cursor-pointer">Cancel</button>
                    <button onClick={addLink} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md flex items-center gap-1 transition hover:bg-primary/90 cursor-pointer font-semibold">
                      <Check className="w-3 h-3" /> Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ImageUploadBlock
            value={undefined}
            onChange={(val) => {
              if (val?.url) {
                editor.chain().focus().setImage({ src: val.url }).run();
              }
            }}
            customTrigger={(onClick) => (
              <Tooltip>
                <TooltipTrigger render={
                  <button
                    type="button"
                    onClick={onClick}
                    className="p-2 px-2.5 rounded-sm transition flex items-center gap-0.5 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                } />
                <TooltipContent side="top" sideOffset={4} className="flex items-center gap-2 px-2.5 py-1">
                  <span className="font-medium text-xs relative z-50">Insert Image</span>
                </TooltipContent>
              </Tooltip>
            )}
          />

          <ToolbarButton
            onClick={() => {
              setVideoUrl("");
              setVideoError("");
              setShowVideoModal(true);
            }}
            icon={<YoutubeIcon className="w-4 h-4 text-red-500" />}
            title="Insert YouTube Video"
          />

          <ToolbarButton
            onClick={() => {
              editor?.chain().focus().insertContent({
                type: "details",
                content: [
                  {
                    type: "detailsSummary",
                    content: [{ type: "text", text: "Accordion Title (Click to toggle)" }],
                  },
                  {
                    type: "detailsContent",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Add your collapsible details here..." }],
                      },
                    ],
                  },
                ],
              }).run();
            }}
            icon={<ChevronsUpDown className="w-4 h-4" />}
            title="Insert Collapsible Accordion"
          />
        </div>

        {/* Tables Group */}
        <div className="flex items-center gap-1 pl-2">
          <Popover open={showTablePopover} onOpenChange={setShowTablePopover}>
            <Tooltip>
              <TooltipTrigger render={
                <PopoverTrigger
                  className="p-2 px-2.5 rounded-sm transition flex items-center gap-0.5 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <TableIcon className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </PopoverTrigger>
              } />
              <TooltipContent side="top" sideOffset={4} className="flex items-center gap-2 px-2.5 py-1">
                <span className="font-medium text-xs relative z-50">Insert Table</span>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-68 p-4" align="end" sideOffset={8}>
              <div className="space-y-4">
                <h4 className="font-semibold text-sm leading-none">Insert Table</h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Rows Stepper */}
                  <div className="space-y-1.5">
                    <Label htmlFor="rows" className="text-xs text-muted-foreground font-medium">Rows</Label>
                    <div className="flex items-center border border-input rounded-md bg-background overflow-hidden h-9 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setTableRows((prev) => Math.max(1, prev - 1))}
                        disabled={tableRows <= 1}
                        className="h-full px-2 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                        aria-label="Decrease rows"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        id="rows"
                        type="number"
                        min={1}
                        max={20}
                        value={tableRows}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setTableRows(Math.min(20, Math.max(1, val)));
                        }}
                        className="w-full h-full text-center text-sm font-semibold bg-transparent border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setTableRows((prev) => Math.min(20, prev + 1))}
                        disabled={tableRows >= 20}
                        className="h-full px-2 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                        aria-label="Increase rows"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Columns Stepper */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cols" className="text-xs text-muted-foreground font-medium">Columns</Label>
                    <div className="flex items-center border border-input rounded-md bg-background overflow-hidden h-9 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setTableCols((prev) => Math.max(1, prev - 1))}
                        disabled={tableCols <= 1}
                        className="h-full px-2 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                        aria-label="Decrease columns"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        id="cols"
                        type="number"
                        min={1}
                        max={20}
                        value={tableCols}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setTableCols(Math.min(20, Math.max(1, val)));
                        }}
                        className="w-full h-full text-center text-sm font-semibold bg-transparent border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setTableCols((prev) => Math.min(20, prev + 1))}
                        disabled={tableCols >= 20}
                        className="h-full px-2 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                        aria-label="Increase columns"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full cursor-pointer h-9 py-2 mt-2.5 mb-1 text-xs font-semibold" 
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
                    setShowTablePopover(false);
                  }}
                >
                  Insert Table
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Editor Content Area */}
      <div 
        className="w-full flex-1 overflow-y-auto relative custom-scrollbar cursor-text"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            editor?.commands.focus("end");
          }
        }}
      >
        <EditorContent 
          editor={editor} 
          className="min-w-75 h-full cursor-text" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              editor?.commands.focus("end");
            }
          }}
        />
        
        {/* Drag Handle */}
        {editor && (
          <DragHandle editor={editor}>
            <div className="flex items-center justify-center w-6 h-6 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 rounded-md shadow-sm transition-all cursor-grab active:cursor-grabbing -translate-x-2">
              <GripVertical className="w-4 h-4 opacity-70" />
            </div>
          </DragHandle>
        )}

        {/* Floating Menu for empty lines (Slash Menu) */}
        {editor && (
          <FloatingMenu 
            editor={editor}
            shouldShow={({ state }) => {
              const { $from } = state.selection;
              return $from.parent.textContent === '/';
            }}
          >
            <div className="flex flex-col gap-1 p-1.5 bg-card border border-border shadow-xl rounded-xl z-50 min-w-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Basic blocks</div>
              <button onClick={() => { editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).toggleHeading({ level: 2 }).run(); }} className="flex items-center gap-3 px-2 py-1.5 w-full text-left rounded-md hover:bg-accent text-sm transition-colors text-foreground group">
                <div className="flex items-center justify-center w-8 h-8 rounded border border-border bg-background group-hover:bg-card shrink-0"><Heading2 className="w-4 h-4" /></div>
                <div><span className="block font-medium">Heading 2</span><span className="block text-[11px] text-muted-foreground">Medium section heading</span></div>
              </button>
              <button onClick={() => { editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).toggleHeading({ level: 3 }).run(); }} className="flex items-center gap-3 px-2 py-1.5 w-full text-left rounded-md hover:bg-accent text-sm transition-colors text-foreground group">
                <div className="flex items-center justify-center w-8 h-8 rounded border border-border bg-background group-hover:bg-card shrink-0"><Heading3 className="w-4 h-4" /></div>
                <div><span className="block font-medium">Heading 3</span><span className="block text-[11px] text-muted-foreground">Small section heading</span></div>
              </button>
              <button onClick={() => { editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).toggleBulletList().run(); }} className="flex items-center gap-3 px-2 py-1.5 w-full text-left rounded-md hover:bg-accent text-sm transition-colors text-foreground group">
                <div className="flex items-center justify-center w-8 h-8 rounded border border-border bg-background group-hover:bg-card shrink-0"><List className="w-4 h-4" /></div>
                <div><span className="block font-medium">Bulleted List</span><span className="block text-[11px] text-muted-foreground">Create a simple list</span></div>
              </button>
              <button onClick={() => { editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).toggleOrderedList().run(); }} className="flex items-center gap-3 px-2 py-1.5 w-full text-left rounded-md hover:bg-accent text-sm transition-colors text-foreground group">
                <div className="flex items-center justify-center w-8 h-8 rounded border border-border bg-background group-hover:bg-card shrink-0"><ListOrdered className="w-4 h-4" /></div>
                <div><span className="block font-medium">Numbered List</span><span className="block text-[11px] text-muted-foreground">Create an ordered list</span></div>
              </button>
              <button 
                onClick={() => { 
                  editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).insertContent({
                    type: "details",
                    content: [
                      {
                        type: "detailsSummary",
                        content: [{ type: "text", text: "Accordion Title (Click to toggle)" }],
                      },
                      {
                        type: "detailsContent",
                        content: [
                          {
                            type: "paragraph",
                            content: [{ type: "text", text: "Add your collapsible details here..." }],
                          },
                        ],
                      },
                    ],
                  }).run(); 
                }} 
                className="flex items-center gap-3 px-2 py-1.5 w-full text-left rounded-md hover:bg-accent text-sm transition-colors text-foreground group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded border border-border bg-background group-hover:bg-card shrink-0">
                  <ChevronsUpDown className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-medium">Toggle / Accordion</span>
                  <span className="block text-[11px] text-muted-foreground">Collapsible FAQ / details block</span>
                </div>
              </button>
            </div>
          </FloatingMenu>
        )}

        {/* General Text Bubble Menu */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            shouldShow={({ editor }) => {
              // Show only if text is highlighted and not in a link, image, or table
              return !editor.isActive('link') && !editor.isActive('table') && !editor.isActive('image') && !editor.state.selection.empty;
            }}
          >
            <div className="flex items-center gap-0.5 p-1 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-full z-50 animate-in fade-in zoom-in-95">
              <BubbleToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} icon={<Bold className="w-3.5 h-3.5" />} title="Bold" shortcut="Ctrl+B" />
              <BubbleToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} icon={<Italic className="w-3.5 h-3.5" />} title="Italic" shortcut="Ctrl+I" />
              <BubbleToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} icon={<UnderlineIcon className="w-3.5 h-3.5" />} title="Underline" shortcut="Ctrl+U" />
              <BubbleToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} icon={<Strikethrough className="w-3.5 h-3.5" />} title="Strikethrough" shortcut="Ctrl+Shift+S" />
              <div className="w-px h-4 bg-zinc-700 mx-1"></div>
              <BubbleToolbarButton 
                onClick={() => {
                  setLinkUrl("");
                  setLinkOpenInNewTab(true);
                  setLinkNoFollow(true);
                  editor.chain().focus().setLink({ href: "" }).run();
                }} 
                isActive={editor.isActive("link")} 
                icon={<LinkIcon className="w-3.5 h-3.5" />} 
                title="Link" 
                shortcut="Ctrl+K"
              />
            </div>
          </BubbleMenu>
        )}
        
        {/* Link Bubble Menu */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            shouldShow={({ editor }) => editor.isActive('link')}
          >
            <div className="flex flex-col gap-2 p-2.5 bg-card border border-border shadow-xl rounded-xl z-50 text-xs w-72">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-input rounded bg-background focus:outline-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLink();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addLink}
                  className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold cursor-pointer hover:bg-primary/90 flex items-center gap-1 shrink-0"
                  title="Apply changes"
                >
                  <Check className="w-3 h-3" /> Apply
                </button>
              </div>
              <div className="flex items-center justify-between pt-3 pb-1 border-t border-border mt-2">
                <div className="flex flex-col gap-3 flex-1 pr-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">Open in new tab</Label>
                    <Switch
                      checked={linkOpenInNewTab}
                      onCheckedChange={setLinkOpenInNewTab}
                      className="scale-[0.6] origin-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">Add nofollow</Label>
                    <Switch
                      checked={linkNoFollow}
                      onCheckedChange={setLinkNoFollow}
                      className="scale-[0.6] origin-right"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  }}
                  className="text-destructive hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  title="Remove link"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </BubbleMenu>
        )}

        {/* Table Bubble Menu */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            shouldShow={({ editor }) => editor.isActive('table')}
          >
            <div className="flex items-center gap-1 p-1 bg-card border border-border shadow-md rounded-md z-50">
              <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} icon={<ArrowUpToLine className="w-4 h-4" />} title="Add Row Before" />
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} icon={<ArrowDownToLine className="w-4 h-4" />} title="Add Row After" />
              <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} icon={<Trash2 className="w-4 h-4 text-red-500" />} title="Delete Row" />
              <div className="w-px h-4 bg-border mx-1"></div>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} icon={<ArrowLeftToLine className="w-4 h-4" />} title="Add Column Before" />
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} icon={<ArrowRightToLine className="w-4 h-4" />} title="Add Column After" />
              <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} icon={<Trash2 className="w-4 h-4 text-red-500" />} title="Delete Column" />
              <div className="w-px h-4 bg-border mx-1"></div>
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} icon={<Trash2 className="w-4 h-4 text-red-500" />} title="Delete Table" />
            </div>
          </BubbleMenu>
        )}

        {/* Image Bubble Menu */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            shouldShow={({ editor }) => editor.isActive('image')}
          >
            <div className="flex flex-col gap-3.5 p-4 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl z-50 text-sm w-96 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Image Settings
                </span>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().updateAttributes('image', { alignment: 'left' }).run()}
                    className={`p-2 rounded-md transition-colors ${
                      editor.getAttributes('image').alignment === 'left'
                        ? 'bg-background text-primary shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Align Left (70% width)"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().updateAttributes('image', { alignment: 'center' }).run()}
                    className={`p-2 rounded-md transition-colors ${
                      !editor.getAttributes('image').alignment || editor.getAttributes('image').alignment === 'center'
                        ? 'bg-background text-primary shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().updateAttributes('image', { alignment: 'full' }).run()}
                    className={`p-2 rounded-md transition-colors ${
                      editor.getAttributes('image').alignment === 'full'
                        ? 'bg-background text-primary shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Full Width"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().deleteSelection().run()}
                    className="p-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Alt Text (SEO) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Alt Text (SEO &amp; Accessibility)
                  </label>
                  {editor.getAttributes('image').alt ? (
                    <span className="text-xs text-emerald-500 font-semibold flex items-center gap-0.5">
                      ✓ Configured
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-medium">
                      Missing (SEO)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageAlt(val);
                    editor.chain().updateAttributes('image', { alt: val }).run();
                  }}
                  placeholder="Describe image for search engines..."
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageCaption(val);
                    editor.chain().updateAttributes('image', { caption: val }).run();
                  }}
                  placeholder="Photo credit or caption text..."
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </BubbleMenu>
        )}
      </div>

      {/* Word Count & Read Time */}
      {editor && (
        <div className="absolute bottom-6 right-8 z-10 flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-muted-foreground opacity-70 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {editor.storage.characterCount.words()} words
          </div>
          <div className="w-px h-3 bg-border" />
          <div>{Math.max(1, Math.ceil(editor.storage.characterCount.words() / 200))} min read</div>
        </div>
      )}

      {/* YouTube Video Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <YoutubeIcon className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Embed YouTube Video</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Paste a YouTube video link to embed a responsive video player.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleInsertVideo} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="youtube-video-url" className="text-xs font-semibold text-foreground">
                YouTube URL
              </Label>
              <Input
                id="youtube-video-url"
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  if (videoError) setVideoError("");
                }}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="text-sm h-9"
                autoFocus
              />
              {videoError && (
                <p className="text-xs text-red-500 font-medium">{videoError}</p>
              )}
            </div>

            <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-3 sm:pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoError("");
                }}
                className="cursor-pointer text-xs font-medium h-9 px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!videoUrl.trim()}
                className="cursor-pointer bg-black hover:bg-black/90 text-white font-semibold text-xs h-9 px-4 py-2"
              >
                Embed Video
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}

// Sub-component for Toolbar Buttons
function ToolbarButton({ onClick, isActive, icon, title, shortcut, disabled, className = "w-8 h-8 justify-center" }: { onClick: () => void; isActive?: boolean; icon: React.ReactNode; title?: string; shortcut?: string; disabled?: boolean; className?: string }) {
  const btn = (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-sm transition flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className} ${
        isActive
          ? "bg-primary text-primary-foreground font-bold shadow-xs"
          : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );

  if (!title) return btn;

  return (
    <Tooltip>
      <TooltipTrigger render={btn} />
      <TooltipContent side="top" sideOffset={4} className="flex items-center gap-2 px-2.5 py-1">
        <span className="font-medium text-xs relative z-60">{title}</span>
        {shortcut && <span className="text-[10px] uppercase tracking-widest text-background/70 bg-background/20 px-1.5 py-0.5 rounded-sm relative z-60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

// Sub-component for Bubble Toolbar Buttons
function BubbleToolbarButton({ onClick, isActive, icon, title, shortcut, disabled }: { onClick: () => void; isActive?: boolean; icon: React.ReactNode; title?: string; shortcut?: string; disabled?: boolean }) {
  const btn = (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-full transition flex items-center justify-center w-7 h-7 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? "bg-zinc-700 text-white font-bold"
          : "bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {icon}
    </button>
  );

  if (!title) return btn;

  return (
    <Tooltip>
      <TooltipTrigger render={btn} />
      <TooltipContent side="top" sideOffset={6} className="flex items-center gap-2 px-2.5 py-1 z-100 border-zinc-700 bg-zinc-800 text-zinc-100">
        <span className="font-medium text-[11px] relative z-60">{title}</span>
        {shortcut && <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded-sm relative z-60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
