"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { renderSoundTags } from "./media-utils";
import {
  renderCardTemplate,
  CARD_TEMPLATE_CSS,
  type RenderedCard,
} from "@/lib/flashcard-template";
import type { NoteType } from "@/types/card-editor";

interface CardContentProps {
  html: string;
  className?: string;
}

/**
 * Renders card content that may contain HTML, [sound:...] tags,
 * images, videos, and LaTeX/MathJax.
 *
 * Falls back to plain text rendering for non-HTML strings.
 */
export function CardContent({ html, className }: CardContentProps) {
  const processed = useMemo(() => {
    if (!html) return "";

    // If the content doesn't contain HTML tags, just return it as-is
    if (!/<[^>]+>/.test(html) && !html.includes("[sound:")) {
      return null; // signal to use plain text
    }

    // Process [sound:...] tags into <audio> elements
    let result = renderSoundTags(html);

    return result;
  }, [html]);

  // Plain text — no HTML
  if (processed === null) {
    return <span className={className}>{html}</span>;
  }

  // HTML content
  return (
    <span
      className={cn(
        "card-content",
        "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2",
        "[&_video]:max-w-full [&_video]:rounded-lg [&_video]:my-2",
        "[&_audio]:max-w-full [&_audio]:my-2",
        "[&_.math-inline]:inline-block",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}

// ── Template-aware card content ────────────────────────────────────────────

interface TemplateCardContentProps {
  /** The rendered card (from renderCardTemplate) */
  rendered: RenderedCard;
  /** Which face to show */
  face: "front" | "back";
  /** Additional classes */
  className?: string;
  /** Callback when a type-in answer is submitted */
  onTypeAnswer?: (value: string) => void;
}

/**
 * Renders a card that was produced by the template engine.
 * Handles per-card CSS, cloze styling, type-in answer fields,
 * and image occlusion overlays.
 */
export function TemplateCardContent({
  rendered,
  face,
  className,
}: TemplateCardContentProps) {
  const html = face === "front" ? rendered.front : rendered.back;

  const processed = useMemo(() => {
    if (!html) return "";
    return renderSoundTags(html);
  }, [html]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: CARD_TEMPLATE_CSS + (rendered.css || ""),
        }}
      />
      <div
        className={cn(
          "card-content template-rendered",
          "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2",
          "[&_video]:max-w-full [&_video]:rounded-lg [&_video]:my-2",
          "[&_audio]:max-w-full [&_audio]:my-2",
          "[&_.math-inline]:inline-block",
          "[&_.image-occlusion-container]:relative [&_.image-occlusion-container]:inline-block",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    </>
  );
}
