// ============================================================================
// Image Occlusion Renderer
// ============================================================================
// Renders image occlusion cards as HTML with absolutely-positioned overlay
// rectangles. Supports "one-by-one" and "all-at-once" modes.
// ============================================================================

import type { OcclusionRegion, OcclusionMode } from "@/types/image-occlusion";

/**
 * Render the front side (question) of an image occlusion card.
 *
 * one-by-one: The active region is highlighted (occluded with "?"),
 *             other regions are also occluded normally.
 * all-at-once: All regions are occluded identically.
 */
export function renderImageOcclusionFront(
  imageUrl: string,
  regions: OcclusionRegion[],
  activeIndex: number,
  mode: OcclusionMode,
): string {
  const rects = regions
    .map((r, i) => {
      const isActive = i === activeIndex;
      const highlightClass = mode === "one-by-one" && isActive ? " active" : "";
      return `<div class="occlusion-rect${highlightClass}" style="left:${r.x}%;top:${r.y}%;width:${r.width}%;height:${r.height}%"><span class="occlusion-label">?</span></div>`;
    })
    .join("\n");

  return `<div class="image-occlusion-container">
  <img src="${escapeAttr(imageUrl)}" alt="Image occlusion" draggable="false" />
  ${rects}
</div>`;
}

/**
 * Render the back side (answer) of an image occlusion card.
 *
 * one-by-one: The active region is revealed (green border, label visible),
 *             other regions remain occluded.
 * all-at-once: All regions are revealed.
 */
export function renderImageOcclusionBack(
  imageUrl: string,
  regions: OcclusionRegion[],
  activeIndex: number,
  mode: OcclusionMode,
): string {
  const rects = regions
    .map((r, i) => {
      const isActive = i === activeIndex;
      const reveal = mode === "all-at-once" || isActive;
      const cls = reveal ? "occlusion-rect revealed" : "occlusion-rect";
      const label = reveal ? r.label || `${i + 1}` : "?";
      return `<div class="${cls}" style="left:${r.x}%;top:${r.y}%;width:${r.width}%;height:${r.height}%"><span class="occlusion-label">${escapeHtml(label)}</span></div>`;
    })
    .join("\n");

  return `<div class="image-occlusion-container">
  <img src="${escapeAttr(imageUrl)}" alt="Image occlusion" draggable="false" />
  ${rects}
</div>`;
}

/**
 * Parse stored image occlusion data from a card's fields.
 */
export function parseOcclusionFields(fields: Record<string, string>): {
  regions: OcclusionRegion[];
  mode: OcclusionMode;
  imageUrl: string;
  activeIndex: number;
} | null {
  const regionsJson = fields._occlusion_regions;
  const mode = fields._occlusion_mode as OcclusionMode;
  const imageUrl = fields._occlusion_image;
  const activeIndex = parseInt(fields._occlusion_active || "0", 10);

  if (!regionsJson || !imageUrl) return null;

  try {
    const regions = JSON.parse(regionsJson) as OcclusionRegion[];
    return { regions, mode: mode || "one-by-one", imageUrl, activeIndex };
  } catch {
    return null;
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
