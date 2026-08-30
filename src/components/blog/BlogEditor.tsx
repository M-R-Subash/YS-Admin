"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Placeholder } from "@tiptap/extension-placeholder";
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
  ImagePlus,
  Trash,
  Check,
  Loader2
} from "lucide-react";

interface BlogEditorProps {
  initialContent?: any;
  onChange: (json: any) => void;
}

const uploadToCloudinary = async (file: File): Promise<string> => {
  // Dummy upload function matching specs
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(URL.createObjectURL(file)); 
    }, 1500);
  });
};

export default function BlogEditor({
  initialContent,
  onChange,
}: BlogEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Link popover state
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);
  const [linkNoFollow, setLinkNoFollow] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Start writing your blog post...",
      }),
    ],
    content: initialContent || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg !max-w-full w-full focus:outline-none min-h-[400px] p-4",
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
  });

  if (!isMounted || !editor) {
    return <div className="h-[400px] bg-card border rounded-xl animate-pulse"></div>;
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = await uploadToCloudinary(e.target.files[0]);
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
      setShowLinkPopover(false);
      return;
    }
    
    let formattedUrl = linkUrl;
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://") && !formattedUrl.startsWith("mailto:")) {
      formattedUrl = "https://" + formattedUrl;
    }

    editor.chain().focus().extendMarkRange("link").setLink({
      href: formattedUrl,
      target: linkOpenInNewTab ? "_blank" : "",
      rel: linkNoFollow ? "noopener noreferrer nofollow" : "noopener noreferrer",
    }).run();
    
    setShowLinkPopover(false);
    setLinkUrl("");
  };

  return (
    <div className="flex flex-col gap-4 border border-border rounded-xl bg-card">
      
      {/* Editor Toolbar */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-1 p-2 bg-card border-b border-border shadow-sm rounded-t-xl">
        
        {/* Formatting Group */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            icon={<Bold className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            icon={<Italic className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            icon={<UnderlineIcon className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            icon={<Strikethrough className="w-4 h-4" />}
          />
        </div>

        {/* Headings Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            icon={<Heading1 className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            icon={<Heading2 className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            icon={<Heading3 className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            isActive={editor.isActive("heading", { level: 4 })}
            icon={<Heading4 className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            isActive={editor.isActive("heading", { level: 5 })}
            icon={<Heading5 className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
            isActive={editor.isActive("heading", { level: 6 })}
            icon={<Heading6 className="w-4 h-4" />}
          />
        </div>

        {/* Lists Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            icon={<List className="w-4 h-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            icon={<ListOrdered className="w-4 h-4" />}
          />
        </div>

        {/* Media & Links Group */}
        <div className="flex items-center gap-1 px-2 border-r border-border relative">
          <div className="relative">
            <ToolbarButton
              onClick={() => {
                if (editor.isActive('link')) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  setShowLinkPopover(!showLinkPopover);
                }
              }}
              isActive={editor.isActive("link")}
              icon={<LinkIcon className="w-4 h-4" />}
            />
            
            {showLinkPopover && (
              <div className="absolute top-full left-0 mt-2 p-4 bg-card border border-border shadow-xl rounded-xl w-64 z-50">
                <input
                  type="text"
                  placeholder="Paste URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 mb-3 text-sm border border-input rounded-md focus:outline-ring"
                  autoFocus
                />
                <div className="flex flex-col gap-2 mb-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkOpenInNewTab}
                      onChange={(e) => setLinkOpenInNewTab(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    Open in new tab
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkNoFollow}
                      onChange={(e) => setLinkNoFollow(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    Add nofollow
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowLinkPopover(false)} className="px-3 py-1.5 text-xs hover:bg-accent rounded-md transition">Cancel</button>
                  <button onClick={addLink} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md flex items-center gap-1 transition hover:bg-primary/90">
                    <Check className="w-3 h-3" /> Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center justify-center w-8 h-8 rounded hover:bg-accent cursor-pointer transition text-muted-foreground hover:text-foreground">
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        {/* Tables Group */}
        <div className="flex items-center gap-1 pl-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            icon={<TableIcon className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="w-full overflow-x-auto">
        <EditorContent editor={editor} className="min-w-[300px]" />
      </div>

    </div>
  );
}

// Sub-component for Toolbar Buttons
function ToolbarButton({ onClick, isActive, icon }: { onClick: () => void; isActive?: boolean; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded transition flex items-center justify-center w-8 h-8 ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}
