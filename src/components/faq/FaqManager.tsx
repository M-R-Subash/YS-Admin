"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  ChevronRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
}

interface FaqManagerProps {
  value?: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  title?: string;
  description?: string;
}

function FaqToolbarButton({
  onClick,
  isActive,
  icon,
  title,
  shortcut,
  disabled,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  title?: string;
  shortcut?: string;
  disabled?: boolean;
}) {
  const btn = (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 px-2 rounded-sm transition flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
      <TooltipContent side="top" sideOffset={4} className="flex items-center gap-2 px-2.5 py-1 z-60">
        <span className="font-medium text-xs">{title}</span>
        {shortcut && (
          <span className="text-[10px] uppercase tracking-widest text-background/70 bg-background/20 px-1.5 py-0.5 rounded-sm">
            {shortcut}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Mini rich-text editor for FAQ answer content matching BlogEditor toolbar styling
function FaqAnswerEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);
  const [linkNoFollow, setLinkNoFollow] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm !max-w-full focus:outline-none min-h-[100px] p-3 text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_a]:text-primary [&_a]:underline",
      },
    },
  });

  // Sync if external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      if (content !== editor.getHTML()) {
        editor.commands.setContent(content || "");
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  const openLinkModal = () => {
    const existingHref = editor.getAttributes("link").href || "";
    const target = editor.getAttributes("link").target;
    const rel = editor.getAttributes("link").rel || "";
    setLinkUrl(existingHref);
    setLinkOpenInNewTab(target === "_blank");
    setLinkNoFollow(rel.includes("nofollow"));
    setShowLinkPopover(true);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkPopover(false);
      return;
    }
    const href =
      linkUrl.trim().startsWith("http") ||
      linkUrl.trim().startsWith("/") ||
      linkUrl.trim().startsWith("#") ||
      linkUrl.trim().startsWith("mailto:")
        ? linkUrl.trim()
        : `https://${linkUrl.trim()}`;

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href,
        target: linkOpenInNewTab ? "_blank" : null,
        rel: linkNoFollow ? "nofollow noopener noreferrer" : "noopener noreferrer",
      })
      .run();
    setShowLinkPopover(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowLinkPopover(false);
  };

  return (
    <TooltipProvider delay={200}>
      <div className="border border-input rounded-lg overflow-hidden bg-background">
        {/* Top Bar with BlogEditor-quality buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-border bg-muted/40 text-xs">
          <FaqToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            icon={<Bold className="w-3.5 h-3.5" />}
            title="Bold"
            shortcut="Ctrl+B"
          />
          <FaqToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            icon={<Italic className="w-3.5 h-3.5" />}
            title="Italic"
            shortcut="Ctrl+I"
          />
          <FaqToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            icon={<UnderlineIcon className="w-3.5 h-3.5" />}
            title="Underline"
            shortcut="Ctrl+U"
          />

          <div className="w-px h-3.5 bg-border mx-1" />

          <FaqToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            icon={<List className="w-3.5 h-3.5" />}
            title="Bullet List"
          />
          <FaqToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            icon={<ListOrdered className="w-3.5 h-3.5" />}
            title="Numbered List"
          />

          <div className="w-px h-3.5 bg-border mx-1" />

          {/* Link Tool with Interactive Popover */}
          <div className="relative">
            <FaqToolbarButton
              onClick={openLinkModal}
              isActive={editor.isActive("link")}
              icon={
                <div className="flex items-center gap-0.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </div>
              }
              title={editor.isActive("link") ? "Edit Link" : "Insert Link"}
              shortcut="Ctrl+K"
            />

            {showLinkPopover && (
              <div className="absolute top-full left-0 mt-2 p-3.5 bg-card border border-border shadow-xl rounded-xl w-72 z-50 animate-in fade-in zoom-in-95">
                <input
                  type="text"
                  placeholder="Paste URL (e.g. https://...)..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 mb-2 text-xs border border-input rounded-md focus:outline-ring bg-background text-foreground"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                />
                <div className="flex flex-col gap-2 mb-3 mt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer font-medium text-[11px] text-muted-foreground hover:text-foreground">
                      Open in new tab
                    </Label>
                    <Switch
                      checked={linkOpenInNewTab}
                      onCheckedChange={setLinkOpenInNewTab}
                      className="scale-75 origin-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer font-medium text-[11px] text-muted-foreground hover:text-foreground">
                      Add nofollow
                    </Label>
                    <Switch
                      checked={linkNoFollow}
                      onCheckedChange={setLinkNoFollow}
                      className="scale-75 origin-right"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  {editor.isActive("link") ? (
                    <button
                      type="button"
                      onClick={removeLink}
                      className="text-destructive hover:underline text-xs flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Unlink className="w-3 h-3" /> Remove
                    </button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowLinkPopover(false)}
                      className="px-2.5 py-1 text-xs hover:bg-accent rounded-md transition cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyLink}
                      className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded-md flex items-center gap-1 transition hover:bg-primary/90 cursor-pointer font-semibold shadow-xs"
                    >
                      <Check className="w-3 h-3" /> Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <EditorContent editor={editor} />
      </div>
    </TooltipProvider>
  );
}

export default function FaqManager({
  value = [],
  onChange,
  title = "Frequently Asked Questions (FAQ)",
  description = "Add structured question and answer pairs with rich text formatting.",
}: FaqManagerProps) {
  const items = Array.isArray(value) ? value : [];
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleAddItem = () => {
    const newItem: FaqItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `faq_${Date.now()}`,
      question: "",
      answer: "",
    };
    const updated = [...items, newItem];
    onChange(updated);
    setExpandedIndex(updated.length - 1);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onChange(updated);
    if (expandedIndex === index) setExpandedIndex(index - 1);
    else if (expandedIndex === index - 1) setExpandedIndex(index);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onChange(updated);
    if (expandedIndex === index) setExpandedIndex(index + 1);
    else if (expandedIndex === index + 1) setExpandedIndex(index);
  };

  const handleQuestionChange = (index: number, question: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], question };
    onChange(updated);
  };

  const handleAnswerChange = (index: number, answer: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], answer };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Section Header: Flex column for title & description, then flex space-between row for count & Add button */}
      <div className="flex flex-col gap-3">
        {/* Title & Description Column */}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>

        {/* Action Row: Question count badge on left, Add Question button on right */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/60 shadow-xs">
            {items.length} {items.length === 1 ? "question" : "questions"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs hover:border-primary/50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center animate-in fade-in duration-200">
          <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground">No FAQ items yet</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
            Add FAQs to provide structured answers. On pages and blogs, this section will only appear when questions are added.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="mt-3 text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Your First Question
          </Button>
        </div>
      ) : (
        /* FAQ Items List with Smooth Accordion Animation */
        <div className="space-y-3">
          {items.map((item, index) => {
            const isExpanded = expandedIndex === index;

            return (
              <div
                key={item.id || `faq_${index}`}
                className={`border rounded-xl bg-card transition-all duration-200 overflow-hidden ${
                  isExpanded ? "border-primary/40 shadow-sm" : "border-border shadow-xs hover:border-border/80"
                }`}
              >
                {/* FAQ Item Header / Bar */}
                <div className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    <span className="w-6 h-6 rounded-md bg-muted border border-border/80 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                      Q{index + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {item.question.trim() || (
                        <span className="text-muted-foreground italic font-normal">
                          Untitled Question (Click to edit)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Actions: Move Up, Move Down, Delete, Toggle */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="Move Question Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="Move Question Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-border mx-0.5" />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors ml-0.5 cursor-pointer"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ease-out ${
                          isExpanded ? "rotate-90 text-primary" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* FAQ Item Body with Smooth CSS Grid Transition Animation */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-4 space-y-4 border-t border-border/60 bg-card">
                      <div>
                        <Label className="text-xs font-semibold text-foreground">
                          Question
                        </Label>
                        <Input
                          value={item.question}
                          onChange={(e) => handleQuestionChange(index, e.target.value)}
                          placeholder="e.g. Do you support custom integrations?"
                          className="mt-1.5 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-foreground">
                          Answer
                        </Label>
                        <div className="mt-1.5">
                          <FaqAnswerEditor
                            content={item.answer}
                            onChange={(html) => handleAnswerChange(index, html)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
