"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
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
  Check,
  Loader2,
  Trash2,
  Unlink,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine
} from "lucide-react";
import { ImageUploadBlock } from "@/components/ImageUploadBlock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface BlogEditorProps {
  initialContent?: any;
  onChange: (json: any) => void;
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

  // Table popover state
  const [showTablePopover, setShowTablePopover] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [, setTick] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
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
        class: "prose prose-sm sm:prose !max-w-full w-full focus:outline-none min-h-full p-4 pb-32 [&_p]:my-2 [&_p]:leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border [&_td]:p-2 [&_th]:p-2 [&_th]:bg-muted/50 text-sm sm:text-base",
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = await uploadToCloudinary(e.target.files[0]);
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

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
    <div className="flex flex-col h-full border border-border rounded-xl bg-card overflow-hidden">
      
      {/* Editor Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 bg-card border-b border-border shadow-sm shrink-0">
        
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
              icon={<LinkIcon className="w-4 h-4" />}
              title={editor.isActive("link") ? "Edit Link" : "Insert Link"}
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
              <button
                type="button"
                onClick={onClick}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-accent cursor-pointer transition text-muted-foreground hover:text-foreground"
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}
          />
        </div>

        {/* Tables Group */}
        <div className="flex items-center gap-1 pl-2">
          <Popover open={showTablePopover} onOpenChange={setShowTablePopover}>
            <PopoverTrigger
              className="p-2 rounded transition flex items-center justify-center w-8 h-8 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              title="Insert Table"
            >
              <TableIcon className="w-4 h-4" />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="end" sideOffset={8}>
              <div className="space-y-4">
                <h4 className="font-semibold text-sm leading-none">Insert Table</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rows">Rows</Label>
                    <Input id="rows" type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cols">Columns</Label>
                    <Input id="cols" type="number" min={1} max={20} value={tableCols} onChange={(e) => setTableCols(Number(e.target.value))} />
                  </div>
                </div>
                <Button 
                  className="w-full cursor-pointer" 
                  size="sm" 
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
      <div className="w-full flex-1 overflow-y-auto relative custom-scrollbar">
        <EditorContent editor={editor} className="min-w-75 h-full" />
        
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
              <div className="flex items-center justify-between pt-1 border-t border-border text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={linkOpenInNewTab}
                      onChange={(e) => setLinkOpenInNewTab(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    New tab
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={linkNoFollow}
                      onChange={(e) => setLinkNoFollow(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    Nofollow
                  </label>
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
      </div>

    </div>
  );
}

// Sub-component for Toolbar Buttons
function ToolbarButton({ onClick, isActive, icon, title }: { onClick: () => void; isActive?: boolean; icon: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-2 rounded-sm transition flex items-center justify-center w-8 h-8 cursor-pointer ${
        isActive
          ? "bg-primary text-primary-foreground font-bold shadow-xs"
          : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}
