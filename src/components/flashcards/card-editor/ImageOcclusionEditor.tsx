"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus,
  Trash2,
  MousePointer2,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcclusionRegion, OcclusionMode } from "@/types/image-occlusion";

// ── Props ──────────────────────────────────────────────────────────────────
interface ImageOcclusionEditorProps {
  imageUrl: string;
  regions: OcclusionRegion[];
  mode: OcclusionMode;
  onRegionsChange: (regions: OcclusionRegion[]) => void;
  onModeChange: (mode: OcclusionMode) => void;
}

// ── Drawing state ──────────────────────────────────────────────────────────
interface DrawState {
  drawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function ImageOcclusionEditor({
  imageUrl,
  regions,
  mode,
  onRegionsChange,
  onModeChange,
}: ImageOcclusionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawState, setDrawState] = useState<DrawState>({
    drawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // ── Convert mouse event to percentage coordinates ────────────────────
  const toPercent = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    },
    [],
  );

  // ── Mouse handlers for drawing rectangles ────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drawing on the container background (not on existing rects)
      if ((e.target as HTMLElement).closest(".occlusion-handle")) return;
      const { x, y } = toPercent(e);
      setDrawState({
        drawing: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
      setSelectedId(null);
    },
    [toPercent],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawState.drawing) return;
      const { x, y } = toPercent(e);
      setDrawState((prev) => ({ ...prev, currentX: x, currentY: y }));
    },
    [drawState.drawing, toPercent],
  );

  const handleMouseUp = useCallback(() => {
    if (!drawState.drawing) return;

    const x = Math.min(drawState.startX, drawState.currentX);
    const y = Math.min(drawState.startY, drawState.currentY);
    const width = Math.abs(drawState.currentX - drawState.startX);
    const height = Math.abs(drawState.currentY - drawState.startY);

    // Only create a region if it's large enough (min 2% in each dimension)
    if (width > 2 && height > 2) {
      const newRegion: OcclusionRegion = {
        id: crypto.randomUUID(),
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100,
        label: `${regions.length + 1}`,
      };
      onRegionsChange([...regions, newRegion]);
      setSelectedId(newRegion.id);
    }

    setDrawState({
      drawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [drawState, regions, onRegionsChange]);

  // ── Delete selected region ───────────────────────────────────────────
  const deleteRegion = useCallback(
    (id: string) => {
      onRegionsChange(regions.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [regions, selectedId, onRegionsChange],
  );

  // ── Update region label ──────────────────────────────────────────────
  const updateLabel = useCallback(
    (id: string, label: string) => {
      onRegionsChange(regions.map((r) => (r.id === id ? { ...r, label } : r)));
    },
    [regions, onRegionsChange],
  );

  // ── Keyboard handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !editingLabel) {
          e.preventDefault();
          deleteRegion(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, editingLabel, deleteRegion]);

  // ── Drawing preview rect ─────────────────────────────────────────────
  const drawPreviewStyle = drawState.drawing
    ? {
        left: `${Math.min(drawState.startX, drawState.currentX)}%`,
        top: `${Math.min(drawState.startY, drawState.currentY)}%`,
        width: `${Math.abs(drawState.currentX - drawState.startX)}%`,
        height: `${Math.abs(drawState.currentY - drawState.startY)}%`,
      }
    : undefined;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-white/50">
          <MousePointer2 className="h-4 w-4 inline mr-1" />
          Draw rectangles to occlude regions
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Mode toggle */}
          <button
            type="button"
            onClick={() =>
              onModeChange(mode === "one-by-one" ? "all-at-once" : "one-by-one")
            }
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition",
              "border border-white/10 hover:border-white/20",
              mode === "one-by-one"
                ? "text-teal-400 bg-teal-500/10"
                : "text-amber-400 bg-amber-500/10",
            )}
          >
            {mode === "one-by-one" ? (
              <ToggleLeft className="h-3.5 w-3.5" />
            ) : (
              <ToggleRight className="h-3.5 w-3.5" />
            )}
            {mode === "one-by-one" ? "One by One" : "All at Once"}
          </button>

          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition",
              "border border-white/10 hover:border-white/20",
              showPreview ? "text-teal-400" : "text-white/50",
            )}
          >
            {showPreview ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            Preview
          </button>

          {/* Card count */}
          <span className="text-white/40 text-xs">
            {regions.length} card{regions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Image + Occlusion Canvas */}
      <div
        ref={containerRef}
        className="relative select-none cursor-crosshair rounded-xl overflow-hidden border border-white/10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Source image for occlusion"
          className="w-full block"
          draggable={false}
        />

        {/* Existing regions */}
        {regions.map((r, i) => (
          <div
            key={r.id}
            className={cn(
              "occlusion-handle absolute cursor-pointer transition-opacity",
              showPreview
                ? "bg-rose-500/90"
                : selectedId === r.id
                  ? "bg-rose-500/80 ring-2 ring-white"
                  : "bg-rose-500/70 hover:bg-rose-500/80",
              "rounded flex items-center justify-center",
            )}
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.width}%`,
              height: `${r.height}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(r.id);
            }}
          >
            {!showPreview && (
              <span className="text-white text-xs font-bold drop-shadow">
                {r.label || i + 1}
              </span>
            )}
          </div>
        ))}

        {/* Drawing preview */}
        {drawState.drawing && drawPreviewStyle && (
          <div
            className="absolute bg-teal-500/40 border-2 border-dashed border-teal-400 rounded pointer-events-none"
            style={drawPreviewStyle}
          />
        )}
      </div>

      {/* Region list */}
      {regions.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-white/40 font-medium">Regions</span>
          <div className="space-y-1">
            {regions.map((r, i) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                  selectedId === r.id
                    ? "bg-white/10 border border-white/20"
                    : "bg-white/5 border border-transparent hover:bg-white/8",
                )}
                onClick={() => setSelectedId(r.id)}
              >
                <span className="text-xs text-white/30 w-5 text-right">
                  {i + 1}
                </span>
                {editingLabel === r.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-transparent text-white text-sm outline-none border-b border-teal-400"
                    value={r.label}
                    onChange={(e) => updateLabel(r.id, e.target.value)}
                    onBlur={() => setEditingLabel(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingLabel(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-white/80 cursor-text"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingLabel(r.id);
                    }}
                  >
                    {r.label || `Region ${i + 1}`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRegion(r.id);
                  }}
                  className="text-white/30 hover:text-rose-400 transition p-0.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
