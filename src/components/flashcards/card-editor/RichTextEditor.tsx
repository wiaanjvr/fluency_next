"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ImageIcon,
  Mic,
  Video,
  Code,
  Highlighter,
  Link as LinkIcon,
  Undo,
  Redo,
  Palette,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── TipTap Extensions ──────────────────────────────────────────────────────
const EXTENSIONS = [
  StarterKit.configure({
    bulletList: { keepMarks: true, keepAttributes: false },
    orderedList: { keepMarks: true, keepAttributes: false },
  }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Image.configure({ inline: true, allowBase64: true }),
  Link.configure({ openOnClick: false }),
  Placeholder.configure({ placeholder: "Type here..." }),
];

// ── Color Palette ──────────────────────────────────────────────────────────
const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "White", value: "#ffffff" },
];

// ── Toolbar Button ─────────────────────────────────────────────────────────
function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-lg transition",
        active
          ? "bg-teal-500/20 text-teal-300"
          : "text-white/50 hover:text-white/80 hover:bg-white/5",
        disabled && "opacity-30 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

// ── Color Picker Dropdown ──────────────────────────────────────────────────
function ColorPicker({
  editor,
  open,
  onToggle,
}: {
  editor: Editor;
  open: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (open) onToggle();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onToggle]);

  return (
    <div className="relative" ref={ref}>
      <ToolbarButton onClick={onToggle} title="Text color">
        <Palette className="h-4 w-4" />
      </ToolbarButton>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#0d2137] border border-white/10 rounded-xl p-2 shadow-2xl grid grid-cols-5 gap-1">
          {TEXT_COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              title={color.name}
              onClick={() => {
                if (color.value) {
                  editor.chain().focus().setColor(color.value).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
                onToggle();
              }}
              className={cn(
                "w-6 h-6 rounded-full border border-white/20 transition hover:scale-110",
                !color.value && "bg-white/10",
              )}
              style={color.value ? { backgroundColor: color.value } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────
function EditorToolbar({
  editor,
  onInsertImage,
  onInsertAudio,
  onInsertVideo,
  onRecordAudio,
  onInsertLatex,
}: {
  editor: Editor;
  onInsertImage?: () => void;
  onInsertAudio?: () => void;
  onInsertVideo?: () => void;
  onRecordAudio?: () => void;
  onInsertLatex?: () => void;
}) {
  const [colorOpen, setColorOpen] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/[0.02]">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHighlight({ color: "#fde047" }).run()
        }
        active={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>

      <ColorPicker
        editor={editor}
        open={colorOpen}
        onToggle={() => setColorOpen(!colorOpen)}
      />

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Links */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt("URL");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        active={editor.isActive("link")}
        title="Insert link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>

      {/* Media */}
      {onInsertImage && (
        <ToolbarButton onClick={onInsertImage} title="Insert image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      )}
      {onInsertAudio && (
        <ToolbarButton onClick={onInsertAudio} title="Insert audio">
          <Type className="h-4 w-4" />
        </ToolbarButton>
      )}
      {onInsertVideo && (
        <ToolbarButton onClick={onInsertVideo} title="Insert video">
          <Video className="h-4 w-4" />
        </ToolbarButton>
      )}
      {onRecordAudio && (
        <ToolbarButton onClick={onRecordAudio} title="Record audio">
          <Mic className="h-4 w-4" />
        </ToolbarButton>
      )}
      {onInsertLatex && (
        <ToolbarButton onClick={onInsertLatex} title="Insert LaTeX / MathJax">
          <Code className="h-4 w-4" />
        </ToolbarButton>
      )}

      <div className="flex-1" />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

// ── Main RichTextEditor Component ──────────────────────────────────────────
import React from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Show media insertion buttons */
  showMedia?: boolean;
  onInsertImage?: () => void;
  onInsertAudio?: () => void;
  onInsertVideo?: () => void;
  onRecordAudio?: () => void;
  onInsertLatex?: () => void;
  /** Handle file drops */
  onFileDrop?: (files: File[]) => void;
  /** Minimum height in pixels */
  minHeight?: number;
  editable?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  showMedia = true,
  onInsertImage,
  onInsertAudio,
  onInsertVideo,
  onRecordAudio,
  onInsertLatex,
  onFileDrop,
  minHeight = 100,
  editable = true,
}: RichTextEditorProps) {
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: placeholder
      ? [
          ...EXTENSIONS.filter((e) => e.name !== "placeholder"),
          Placeholder.configure({ placeholder }),
        ]
      : EXTENSIONS,
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      if (!isExternalUpdate.current) {
        const html = editor.getHTML();
        // Only emit if content actually changed (prevents infinite loops)
        if (html !== value) {
          onChange(html);
        }
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert prose-sm max-w-none focus:outline-none",
          "px-4 py-3 min-h-[inherit]",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1",
          "[&_.is-editor-empty]:before:content-[attr(data-placeholder)]",
          "[&_.is-editor-empty]:before:text-white/30 [&_.is-editor-empty]:before:float-left",
          "[&_.is-editor-empty]:before:h-0 [&_.is-editor-empty]:before:pointer-events-none",
        ),
      },
      handleDrop: (view, event) => {
        if (onFileDrop && event.dataTransfer?.files?.length) {
          event.preventDefault();
          onFileDrop(Array.from(event.dataTransfer.files));
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (onFileDrop && files?.length) {
          event.preventDefault();
          onFileDrop(Array.from(files));
          return true;
        }
        return false;
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      isExternalUpdate.current = true;
      editor.commands.setContent(value, { emitUpdate: false });
      isExternalUpdate.current = false;
    }
  }, [editor, value]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  const insertImageUrl = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
    [editor],
  );

  const insertHtml = useCallback(
    (html: string) => {
      if (editor) {
        editor.chain().focus().insertContent(html).run();
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 overflow-hidden transition",
        "focus-within:border-teal-400/50 focus-within:ring-1 focus-within:ring-teal-400/30",
        className,
      )}
    >
      {editable && (
        <EditorToolbar
          editor={editor}
          onInsertImage={showMedia ? onInsertImage : undefined}
          onInsertAudio={showMedia ? onInsertAudio : undefined}
          onInsertVideo={showMedia ? onInsertVideo : undefined}
          onRecordAudio={showMedia ? onRecordAudio : undefined}
          onInsertLatex={showMedia ? onInsertLatex : undefined}
        />
      )}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} className="text-white" />
      </div>
    </div>
  );
}

// Export the editor type for external use
export type { Editor };
export { EXTENSIONS };
