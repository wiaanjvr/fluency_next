"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  renderCardTemplate,
  extractClozeOrdinals,
  CARD_TEMPLATE_CSS,
} from "@/lib/flashcard-template";
import { renderSoundTags } from "./media-utils";
import type { CardTemplate, NoteType } from "@/types/card-editor";

// ── Props ──────────────────────────────────────────────────────────────────
interface TemplatePreviewProps {
  /** Note type with templates */
  noteType: NoteType;
  /** Current field values */
  fields: Record<string, string>;
  /** Whether the note type is a cloze type */
  isCloze?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Renders a live preview of how cards will look when studying,
 * with navigation between multiple templates / cloze cards.
 */
export function TemplatePreview({
  noteType,
  fields,
  isCloze,
  className,
}: TemplatePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [face, setFace] = useState<"front" | "back">("front");

  // Determine how many cards will be generated
  const cardCount = useMemo(() => {
    if (isCloze) {
      return extractClozeOrdinals(fields).length;
    }
    return noteType.templates.length;
  }, [isCloze, fields, noteType.templates]);

  // Render the current card
  const rendered = useMemo(() => {
    if (cardCount === 0) return null;

    if (isCloze) {
      const ordinals = extractClozeOrdinals(fields);
      if (ordinals.length === 0) return null;
      const ordinal = ordinals[Math.min(currentIndex, ordinals.length - 1)];
      const template = noteType.templates[0];
      if (!template) return null;

      return renderCardTemplate({
        frontTemplate: template.front_template,
        backTemplate: template.back_template,
        fields,
        css: noteType.css || "",
        clozeOrdinal: ordinal,
      });
    }

    const tplIdx = Math.min(currentIndex, noteType.templates.length - 1);
    const template = noteType.templates[tplIdx];
    if (!template) return null;

    return renderCardTemplate({
      frontTemplate: template.front_template,
      backTemplate: template.back_template,
      fields,
      css: noteType.css || "",
    });
  }, [cardCount, isCloze, currentIndex, fields, noteType]);

  if (!rendered || cardCount === 0) {
    return (
      <div className={cn("text-xs text-white/30 text-center py-4", className)}>
        Fill in fields to see a preview
      </div>
    );
  }

  const displayHtml = face === "front" ? rendered.front : rendered.back;
  // Process sound tags for audio playback
  const processedHtml = renderSoundTags(displayHtml);

  // Template / card name
  const cardLabel = isCloze
    ? `Cloze ${extractClozeOrdinals(fields)[currentIndex] ?? "?"}`
    : (noteType.templates[currentIndex]?.name ?? `Card ${currentIndex + 1}`);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs text-white/40 font-medium">Preview</span>
          <span className="text-xs text-white/20">{cardLabel}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Face toggle */}
          <button
            type="button"
            onClick={() => setFace(face === "front" ? "back" : "front")}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium transition",
              face === "front"
                ? "bg-teal-500/10 text-teal-400"
                : "bg-amber-500/10 text-amber-400",
            )}
          >
            {face === "front" ? "Front" : "Back"}
          </button>

          {/* Card navigation */}
          {cardCount > 1 && (
            <div className="flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="p-0.5 text-white/30 hover:text-white/60 disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-white/30 min-w-[2em] text-center">
                {currentIndex + 1}/{cardCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex(Math.min(cardCount - 1, currentIndex + 1))
                }
                disabled={currentIndex >= cardCount - 1}
                className="p-0.5 text-white/30 hover:text-white/60 disabled:opacity-30 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview card */}
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-[#0d2137]/80 p-4",
          "min-h-[80px] flex items-center justify-center text-center",
        )}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: CARD_TEMPLATE_CSS + (rendered.css || ""),
          }}
        />
        <div
          className={cn(
            "card-rendered-content text-sm text-white/80 leading-relaxed w-full",
            "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2",
            "[&_video]:max-w-full [&_video]:rounded-lg [&_video]:my-2",
            "[&_audio]:max-w-full [&_audio]:my-2",
          )}
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      </div>
    </div>
  );
}

// ── Template Editor (for editing front/back templates) ─────────────────────

interface TemplateEditorProps {
  templates: CardTemplate[];
  onChange: (templates: CardTemplate[]) => void;
  fieldNames: string[];
}

/**
 * Editor for card templates — allows editing front/back template strings
 * and adding/removing templates (for reversed cards, etc.).
 */
export function TemplateEditor({
  templates,
  onChange,
  fieldNames,
}: TemplateEditorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = templates[activeIndex];

  const updateTemplate = (key: keyof CardTemplate, value: string) => {
    const updated = [...templates];
    updated[activeIndex] = { ...updated[activeIndex], [key]: value };
    onChange(updated);
  };

  const addTemplate = () => {
    const newTpl: CardTemplate = {
      name: `Card ${templates.length + 1}`,
      front_template: fieldNames[1] ? `{{${fieldNames[1]}}}` : "{{Back}}",
      back_template: `{{FrontSide}}<hr id=answer>{{${fieldNames[0] || "Front"}}}`,
    };
    onChange([...templates, newTpl]);
    setActiveIndex(templates.length);
  };

  const removeTemplate = (index: number) => {
    if (templates.length <= 1) return;
    const updated = templates.filter((_, i) => i !== index);
    onChange(updated);
    setActiveIndex(Math.min(activeIndex, updated.length - 1));
  };

  if (!active) return null;

  return (
    <div className="space-y-3">
      {/* Template tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {templates.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition",
              i === activeIndex
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/20"
                : "bg-white/5 text-white/50 border border-transparent hover:text-white/70",
            )}
          >
            <Pencil className="h-2.5 w-2.5 inline mr-1" />
            {t.name}
          </button>
        ))}
        <button
          type="button"
          onClick={addTemplate}
          className="px-2 py-1 rounded-lg text-xs text-white/30 hover:text-white/60 border border-dashed border-white/10 hover:border-white/20 transition"
        >
          + Add Template
        </button>
      </div>

      {/* Template name */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/40 uppercase tracking-wider">
          Template Name
        </label>
        <input
          value={active.name}
          onChange={(e) => updateTemplate("name", e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40"
        />
      </div>

      {/* Front template */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/40 uppercase tracking-wider">
          Front Template
        </label>
        <textarea
          value={active.front_template}
          onChange={(e) => updateTemplate("front_template", e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono outline-none focus:border-teal-500/40 resize-none"
          placeholder="{{Front}}"
        />
        <div className="flex flex-wrap gap-1">
          {fieldNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() =>
                updateTemplate(
                  "front_template",
                  active.front_template + `{{${name}}}`,
                )
              }
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 hover:text-white/70 transition"
            >
              {`{{${name}}}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              updateTemplate(
                "front_template",
                active.front_template + "{{type:Back}}",
              )
            }
            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/60 hover:text-amber-400 transition"
          >
            {"{{type:...}}"}
          </button>
        </div>
      </div>

      {/* Back template */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/40 uppercase tracking-wider">
          Back Template
        </label>
        <textarea
          value={active.back_template}
          onChange={(e) => updateTemplate("back_template", e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono outline-none focus:border-teal-500/40 resize-none"
          placeholder={"{{FrontSide}}<hr id=answer>{{Back}}"}
        />
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() =>
              updateTemplate(
                "back_template",
                active.back_template + "{{FrontSide}}",
              )
            }
            className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400/60 hover:text-teal-400 transition"
          >
            {"{{FrontSide}}"}
          </button>
          {fieldNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() =>
                updateTemplate(
                  "back_template",
                  active.back_template + `{{${name}}}`,
                )
              }
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 hover:text-white/70 transition"
            >
              {`{{${name}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Delete template (only if > 1) */}
      {templates.length > 1 && (
        <button
          type="button"
          onClick={() => removeTemplate(activeIndex)}
          className="text-xs text-rose-400/60 hover:text-rose-400 transition"
        >
          Remove this template
        </button>
      )}
    </div>
  );
}
