"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground, DepthSidebar } from "@/components/ocean";
import {
  AppNav,
  ContextualNav,
  MobileBottomNav,
} from "@/components/navigation";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import { CardContent as CardContentPreview } from "@/components/flashcards/card-editor";
import {
  parseSearchQuery,
  SEARCH_SYNTAX_HELP,
  describeFilters,
} from "@/lib/card-search";
import { formatInterval, retrievability } from "@/lib/fsrs";
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pause,
  Play,
  Tag,
  ArrowRightLeft,
  RotateCcw,
  HelpCircle,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Eye,
  BarChart3,
  Replace,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Deck,
  Flashcard,
  CardSchedule,
  CardState,
  Rating,
} from "@/types/flashcards";
import type { NoteType } from "@/types/card-editor";
import type { SearchFilter, ParsedQuery } from "@/lib/card-search";
import "@/styles/ocean-theme.css";

// ============================================================================
// Types
// ============================================================================
interface BrowserCard extends Flashcard {
  schedule?: CardSchedule;
  deck_name?: string;
  deck_color?: string;
  note_type_name?: string;
}

type SortField =
  | "created_at"
  | "due"
  | "interval"
  | "ease"
  | "reps"
  | "lapses"
  | "stability"
  | "front"
  | "deck";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

// Column configuration
interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  sortField?: SortField;
  minWidth?: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "front",
    label: "Front",
    defaultVisible: true,
    sortable: true,
    sortField: "front",
    minWidth: "200px",
  },
  {
    key: "back",
    label: "Back",
    defaultVisible: true,
    sortable: false,
    minWidth: "200px",
  },
  {
    key: "deck",
    label: "Deck",
    defaultVisible: true,
    sortable: true,
    sortField: "deck",
    minWidth: "120px",
  },
  {
    key: "tags",
    label: "Tags",
    defaultVisible: true,
    sortable: false,
    minWidth: "100px",
  },
  {
    key: "state",
    label: "State",
    defaultVisible: true,
    sortable: false,
    minWidth: "90px",
  },
  {
    key: "due",
    label: "Due",
    defaultVisible: true,
    sortable: true,
    sortField: "due",
    minWidth: "100px",
  },
  {
    key: "interval",
    label: "Interval",
    defaultVisible: true,
    sortable: true,
    sortField: "interval",
    minWidth: "80px",
  },
  {
    key: "ease",
    label: "Difficulty",
    defaultVisible: false,
    sortable: true,
    sortField: "ease",
    minWidth: "90px",
  },
  {
    key: "stability",
    label: "Stability",
    defaultVisible: false,
    sortable: true,
    sortField: "stability",
    minWidth: "90px",
  },
  {
    key: "reps",
    label: "Reps",
    defaultVisible: false,
    sortable: true,
    sortField: "reps",
    minWidth: "60px",
  },
  {
    key: "lapses",
    label: "Lapses",
    defaultVisible: false,
    sortable: true,
    sortField: "lapses",
    minWidth: "70px",
  },
  {
    key: "source",
    label: "Source",
    defaultVisible: false,
    sortable: false,
    minWidth: "80px",
  },
  {
    key: "note_type",
    label: "Note Type",
    defaultVisible: false,
    sortable: false,
    minWidth: "100px",
  },
  {
    key: "created",
    label: "Created",
    defaultVisible: false,
    sortable: true,
    sortField: "created_at",
    minWidth: "100px",
  },
  {
    key: "retrievability",
    label: "Retrievability",
    defaultVisible: false,
    sortable: false,
    minWidth: "100px",
  },
];

// ============================================================================
// State badge component
// ============================================================================
function StateBadge({
  state,
  suspended,
  buried,
  leech,
}: {
  state: CardState;
  suspended?: boolean;
  buried?: boolean;
  leech?: boolean;
}) {
  if (suspended) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-300">
        Suspended
      </span>
    );
  }
  if (buried) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/15 text-gray-300">
        Buried
      </span>
    );
  }
  const config: Record<CardState, { bg: string; text: string; label: string }> =
    {
      new: { bg: "bg-blue-500/15", text: "text-blue-300", label: "New" },
      learning: {
        bg: "bg-amber-500/15",
        text: "text-amber-300",
        label: "Learning",
      },
      review: { bg: "bg-teal-500/15", text: "text-teal-300", label: "Review" },
      relearning: {
        bg: "bg-rose-500/15",
        text: "text-rose-300",
        label: "Relearning",
      },
    };
  const c = config[state] || config.new;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        c.bg,
        c.text,
      )}
    >
      {c.label}
      {leech && (
        <span className="ml-1 text-rose-400" title="Leech">
          🩸
        </span>
      )}
    </span>
  );
}

// ============================================================================
// Find & Replace Dialog
// ============================================================================
function FindReplaceDialog({
  open,
  onClose,
  selectedIds,
  onComplete,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onComplete: () => void;
  userId: string;
}) {
  const supabase = createClient();
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [field, setField] = useState<"front" | "back" | "both">("both");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!open) return null;

  const handleReplace = async () => {
    if (!findText) return;
    setProcessing(true);
    setResult(null);

    try {
      const query = supabase
        .from("flashcards")
        .select("id, front, back")
        .eq("user_id", userId);

      if (selectedIds.length > 0) {
        query.in("id", selectedIds);
      }

      const { data: cards } = await query;
      if (!cards) {
        setResult("No cards found");
        setProcessing(false);
        return;
      }

      let count = 0;
      for (const card of cards) {
        const updates: Record<string, string> = {};
        if (
          (field === "front" || field === "both") &&
          card.front.includes(findText)
        ) {
          updates.front = card.front.replaceAll(findText, replaceText);
        }
        if (
          (field === "back" || field === "both") &&
          card.back.includes(findText)
        ) {
          updates.back = card.back.replaceAll(findText, replaceText);
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("flashcards").update(updates).eq("id", card.id);
          count++;
        }
      }

      setResult(`Replaced in ${count} card${count !== 1 ? "s" : ""}`);
      if (count > 0) onComplete();
    } catch {
      setResult("Error during replacement");
    }
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1f3c] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Find & Replace</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Field</label>
            <select
              value={field}
              onChange={(e) => setField(e.target.value as typeof field)}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm py-2 px-3"
            >
              <option value="both">Front & Back</option>
              <option value="front">Front only</option>
              <option value="back">Back only</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">Find</label>
            <input
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm py-2 px-3 focus:outline-none focus:border-teal-400/50"
              placeholder="Text to find..."
            />
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">
              Replace with
            </label>
            <input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm py-2 px-3 focus:outline-none focus:border-teal-400/50"
              placeholder="Replacement text..."
            />
          </div>

          {result && <p className="text-sm text-teal-300">{result}</p>}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition"
            >
              Cancel
            </button>
            <button
              onClick={handleReplace}
              disabled={processing || !findText}
              className="flex-1 py-2 rounded-xl bg-teal-500 text-[#0a1628] font-medium text-sm hover:bg-teal-400 transition disabled:opacity-50"
            >
              {processing
                ? "Replacing..."
                : `Replace${selectedIds.length > 0 ? ` in ${selectedIds.length} selected` : " All"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Search Help Popover
// ============================================================================
function SearchHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0d1f3c] border border-white/10 rounded-2xl p-4 shadow-2xl max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white/80 text-sm font-medium">Search Syntax</h4>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {SEARCH_SYNTAX_HELP.map((h) => (
          <div key={h.syntax} className="flex items-start gap-3 py-1">
            <code className="text-teal-300 text-xs font-mono whitespace-nowrap bg-teal-500/10 px-1.5 py-0.5 rounded">
              {h.syntax}
            </code>
            <span className="text-white/40 text-xs">{h.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Card Preview Pane
// ============================================================================
function CardPreviewPane({
  card,
  onClose,
}: {
  card: BrowserCard | null;
  onClose: () => void;
}) {
  if (!card) return null;

  const schedule = card.schedule;
  const elapsed = schedule?.last_review
    ? (Date.now() - new Date(schedule.last_review).getTime()) /
      (1000 * 60 * 60 * 24)
    : 0;
  const ret = schedule
    ? retrievability(elapsed, schedule.stability || 1)
    : null;

  return (
    <div className="border-l border-white/10 bg-white/[0.02] w-full lg:w-[400px] flex-shrink-0 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white/80 text-sm font-medium">Card Preview</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Front */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-1 block">Front</label>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-white text-sm min-h-[60px]">
            <CardContentPreview html={card.front} />
          </div>
        </div>

        {/* Back */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-1 block">Back</label>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-white/70 text-sm min-h-[60px]">
            <CardContentPreview html={card.back} />
          </div>
        </div>

        {/* Example */}
        {card.example_sentence && (
          <div className="mb-4">
            <label className="text-xs text-white/40 mb-1 block">Example</label>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-white/60 text-sm italic">
              {card.example_sentence}
              {card.example_translation && (
                <div className="text-white/40 mt-1 not-italic">
                  {card.example_translation}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule info */}
        <div className="space-y-2 text-xs">
          <h4 className="text-white/50 font-medium text-xs uppercase tracking-wider">
            Scheduling
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">State</div>
              <div className="text-white">{schedule?.state || "new"}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">Due</div>
              <div className="text-white">
                {schedule?.due
                  ? new Date(schedule.due).toLocaleDateString()
                  : "—"}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">Interval</div>
              <div className="text-white">
                {schedule?.scheduled_days
                  ? formatInterval(schedule.scheduled_days)
                  : "—"}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">Difficulty</div>
              <div className="text-white">
                {schedule?.difficulty?.toFixed(2) || "—"}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">Stability</div>
              <div className="text-white">
                {schedule?.stability?.toFixed(2) || "—"}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">Retrievability</div>
              <div className="text-white">
                {ret != null ? `${(ret * 100).toFixed(1)}%` : "—"}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">Reps</div>
              <div className="text-white">{schedule?.reps ?? 0}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">Lapses</div>
              <div className="text-white">{schedule?.lapses ?? 0}</div>
            </div>
          </div>

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <div className="pt-2">
              <div className="text-white/40 mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {card.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="pt-2 space-y-1 text-white/30">
            <div>Deck: {card.deck_name || "—"}</div>
            <div>Source: {card.source}</div>
            <div>Created: {new Date(card.created_at).toLocaleDateString()}</div>
            {card.note_type_name && <div>Note type: {card.note_type_name}</div>}
            {schedule?.is_suspended && (
              <div className="text-yellow-400">⚠ Suspended</div>
            )}
            {schedule?.is_leech && (
              <div className="text-rose-400">🩸 Leech</div>
            )}
            {schedule?.is_buried && (
              <div className="text-gray-400">⬇ Buried</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Bulk Action Bar
// ============================================================================
function BulkActionBar({
  selectedCount,
  onSuspend,
  onUnsuspend,
  onDelete,
  onChangeDeck,
  onAddTags,
  onRemoveTags,
  onReschedule,
  onFindReplace,
  onReposition,
  decks,
}: {
  selectedCount: number;
  onSuspend: () => void;
  onUnsuspend: () => void;
  onDelete: () => void;
  onChangeDeck: (deckId: string) => void;
  onAddTags: (tags: string[]) => void;
  onRemoveTags: (tags: string[]) => void;
  onReschedule: (days: number) => void;
  onFindReplace: () => void;
  onReposition: (startPos: number) => void;
  decks: Deck[];
}) {
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState<"add" | "remove" | null>(
    null,
  );
  const [showReschedule, setShowReschedule] = useState(false);
  const [showReposition, setShowReposition] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [reschedDays, setReschedDays] = useState(0);
  const [repositionStart, setRepositionStart] = useState(1);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-40 bg-teal-600/20 border border-teal-400/30 rounded-xl px-4 py-2.5 mb-3 flex flex-wrap items-center gap-2 backdrop-blur-md">
      <span className="text-teal-300 text-sm font-medium mr-2">
        {selectedCount} selected
      </span>

      <button
        onClick={onSuspend}
        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-yellow-300 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-yellow-400/30 transition"
        title="Suspend"
      >
        <Pause className="h-3.5 w-3.5" /> Suspend
      </button>
      <button
        onClick={onUnsuspend}
        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-teal-300 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-teal-400/30 transition"
        title="Unsuspend"
      >
        <Play className="h-3.5 w-3.5" /> Unsuspend
      </button>

      {/* Change Deck */}
      <div className="relative">
        <button
          onClick={() => setShowDeckPicker(!showDeckPicker)}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" /> Move
        </button>
        {showDeckPicker && (
          <div className="absolute top-full left-0 mt-1 bg-[#0d1f3c] border border-white/10 rounded-xl p-2 min-w-[180px] shadow-2xl z-50">
            {decks.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  onChangeDeck(d.id);
                  setShowDeckPicker(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="relative">
        <button
          onClick={() => setShowTagInput(showTagInput === "add" ? null : "add")}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
        >
          <Tag className="h-3.5 w-3.5" /> +Tag
        </button>
        {showTagInput === "add" && (
          <div className="absolute top-full left-0 mt-1 bg-[#0d1f3c] border border-white/10 rounded-xl p-2 min-w-[200px] shadow-2xl z-50">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="tag1, tag2"
              className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-xs py-1.5 px-2 mb-1 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  onAddTags(
                    tagInput
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  );
                  setTagInput("");
                  setShowTagInput(null);
                }
              }}
            />
            <button
              onClick={() => {
                if (tagInput.trim()) {
                  onAddTags(
                    tagInput
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  );
                  setTagInput("");
                  setShowTagInput(null);
                }
              }}
              className="w-full text-xs py-1 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition"
            >
              Add Tags
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() =>
          setShowTagInput(showTagInput === "remove" ? null : "remove")
        }
        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
      >
        <Tag className="h-3.5 w-3.5" /> -Tag
      </button>
      {showTagInput === "remove" && (
        <div className="absolute top-12 left-[320px] bg-[#0d1f3c] border border-white/10 rounded-xl p-2 min-w-[200px] shadow-2xl z-50">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="tag to remove"
            className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-xs py-1.5 px-2 mb-1 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                onRemoveTags(
                  tagInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                );
                setTagInput("");
                setShowTagInput(null);
              }
            }}
          />
          <button
            onClick={() => {
              if (tagInput.trim()) {
                onRemoveTags(
                  tagInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                );
                setTagInput("");
                setShowTagInput(null);
              }
            }}
            className="w-full text-xs py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
          >
            Remove Tags
          </button>
        </div>
      )}

      {/* Reschedule */}
      <div className="relative">
        <button
          onClick={() => setShowReschedule(!showReschedule)}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reschedule
        </button>
        {showReschedule && (
          <div className="absolute top-full left-0 mt-1 bg-[#0d1f3c] border border-white/10 rounded-xl p-2 min-w-[200px] shadow-2xl z-50">
            <label className="text-xs text-white/40 block mb-1">
              Set due in N days
            </label>
            <input
              type="number"
              min={0}
              value={reschedDays}
              onChange={(e) => setReschedDays(Number(e.target.value))}
              className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-xs py-1.5 px-2 mb-1 focus:outline-none"
            />
            <button
              onClick={() => {
                onReschedule(reschedDays);
                setShowReschedule(false);
              }}
              className="w-full text-xs py-1 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Reposition */}
      <div className="relative">
        <button
          onClick={() => setShowReposition(!showReposition)}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
        >
          <ArrowUpDown className="h-3.5 w-3.5" /> Reposition
        </button>
        {showReposition && (
          <div className="absolute top-full left-0 mt-1 bg-[#0d1f3c] border border-white/10 rounded-xl p-2 min-w-[200px] shadow-2xl z-50">
            <label className="text-xs text-white/40 block mb-1">
              New card starting position
            </label>
            <input
              type="number"
              min={1}
              value={repositionStart}
              onChange={(e) => setRepositionStart(Number(e.target.value))}
              className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-xs py-1.5 px-2 mb-1 focus:outline-none"
            />
            <button
              onClick={() => {
                onReposition(repositionStart);
                setShowReposition(false);
              }}
              className="w-full text-xs py-1 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition"
            >
              Reposition
            </button>
          </div>
        )}
      </div>

      {/* Find & Replace */}
      <button
        onClick={onFindReplace}
        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
      >
        <Replace className="h-3.5 w-3.5" /> Find/Replace
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-400/30 transition ml-auto"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );
}

// ============================================================================
// Column Settings Popover
// ============================================================================
function ColumnSettings({
  open,
  onClose,
  visibleColumns,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  visibleColumns: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute top-full right-0 mt-2 z-50 bg-[#0d1f3c] border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white/80 text-sm font-medium">Columns</h4>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {ALL_COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => onToggle(col.key)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            {visibleColumns.has(col.key) ? (
              <CheckSquare className="h-3.5 w-3.5 text-teal-400" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Browser Content
// ============================================================================
function BrowserContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
  userId,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { ambientView, setAmbientView } = useAmbientPlayer();

  // Data state
  const [allCards, setAllCards] = useState<BrowserCard[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  // View state
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewCard, setPreviewCard] = useState<BrowserCard | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () =>
      new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)),
  );

  useEffect(() => {
    if (ambientView === "container") setAmbientView("soundbar");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);

    // Fetch all decks
    const { data: deckData } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    const deckList = (deckData || []) as Deck[];
    setDecks(deckList);
    const deckMap = new Map(deckList.map((d) => [d.id, d]));

    // Fetch note types
    const { data: ntData } = await supabase
      .from("note_types")
      .select("*")
      .eq("user_id", userId);
    const ntList = (ntData || []) as NoteType[];
    setNoteTypes(ntList);
    const ntMap = new Map(ntList.map((n) => [n.id, n]));

    // Fetch all cards
    const { data: cardData } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const cardList = (cardData || []) as Flashcard[];

    // Fetch all schedules
    const cardIds = cardList.map((c) => c.id);
    let scheduleMap = new Map<string, CardSchedule>();
    if (cardIds.length > 0) {
      // Supabase IN has a limit; batch if needed
      const batchSize = 500;
      for (let i = 0; i < cardIds.length; i += batchSize) {
        const batch = cardIds.slice(i, i + batchSize);
        const { data: schedData } = await supabase
          .from("card_schedules")
          .select("*")
          .eq("user_id", userId)
          .in("card_id", batch);
        for (const s of (schedData || []) as CardSchedule[]) {
          scheduleMap.set(s.card_id, s);
        }
      }
    }

    setAllCards(
      cardList.map((c) => {
        const deck = deckMap.get(c.deck_id);
        const nt = c.note_type_id ? ntMap.get(c.note_type_id) : undefined;
        return {
          ...c,
          schedule: scheduleMap.get(c.id),
          deck_name: deck?.name,
          deck_color: deck?.cover_color,
          note_type_name: nt?.name,
        };
      }),
    );
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Search / Filter ────────────────────────────────────────────────────
  const parsed = useMemo(() => parseSearchQuery(searchInput), [searchInput]);

  const filteredCards = useMemo(() => {
    let result = [...allCards];
    const now = new Date();

    for (const filter of parsed.filters) {
      const matches = (card: BrowserCard): boolean => {
        const sched = card.schedule;
        switch (filter.type) {
          case "deck":
            return (card.deck_name || "")
              .toLowerCase()
              .includes(filter.value.toLowerCase());
          case "tag":
            return (card.tags || []).some((t) =>
              t.toLowerCase().includes(filter.value.toLowerCase()),
            );
          case "state":
            return (sched?.state || "new") === filter.value;
          case "note":
            return (card.note_type_name || "")
              .toLowerCase()
              .includes(filter.value.toLowerCase());
          case "source":
            return card.source === filter.value;
          case "word_class":
            return (
              (card.word_class || "").toLowerCase() ===
              filter.value.toLowerCase()
            );
          case "due": {
            if (!sched) return filter.value === "0"; // new cards are "due"
            const dueDate = new Date(sched.due);
            const daysFromNow = Math.ceil(
              (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return daysFromNow <= Number(filter.value);
          }
          case "added": {
            const created = new Date(card.created_at);
            const daysAgo = Math.ceil(
              (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
            );
            return daysAgo <= Number(filter.value);
          }
          case "suspended":
            return !!sched?.is_suspended;
          case "buried":
            return !!sched?.is_buried;
          case "leech":
            return !!sched?.is_leech;
          case "ease":
          case "interval":
          case "reps":
          case "lapses":
          case "stability":
          case "difficulty": {
            if (!sched) return false;
            let val = 0;
            switch (filter.type) {
              case "ease":
              case "difficulty":
                val = sched.difficulty;
                break;
              case "interval":
                val = sched.scheduled_days;
                break;
              case "reps":
                val = sched.reps;
                break;
              case "lapses":
                val = sched.lapses;
                break;
              case "stability":
                val = sched.stability;
                break;
            }
            const target = filter.numericValue ?? 0;
            switch (filter.operator) {
              case ">":
                return val > target;
              case ">=":
                return val >= target;
              case "<":
                return val < target;
              case "<=":
                return val <= target;
              default:
                return val === target;
            }
          }
          default:
            return true;
        }
      };

      result = result.filter((card) => {
        const m = matches(card);
        return filter.negate ? !m : m;
      });
    }

    // Text search
    if (parsed.textTerms.length > 0) {
      const positiveTerms = parsed.textTerms.filter((t) => !t.startsWith("-"));
      const negativeTerms = parsed.textTerms
        .filter((t) => t.startsWith("-"))
        .map((t) => t.slice(1));

      result = result.filter((card) => {
        const searchable =
          `${card.front} ${card.back} ${card.example_sentence || ""} ${card.grammar_notes || ""}`.toLowerCase();
        const matchesPositive = positiveTerms.every((term) =>
          searchable.includes(term.toLowerCase()),
        );
        const matchesNegative = negativeTerms.every(
          (term) => !searchable.includes(term.toLowerCase()),
        );
        return matchesPositive && matchesNegative;
      });
    }

    return result;
  }, [allCards, parsed]);

  // ── Sorting ────────────────────────────────────────────────────────────
  const sortedCards = useMemo(() => {
    const sorted = [...filteredCards];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "front":
          cmp = a.front.localeCompare(b.front);
          break;
        case "deck":
          cmp = (a.deck_name || "").localeCompare(b.deck_name || "");
          break;
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "due":
          cmp =
            new Date(a.schedule?.due || "9999-12-31").getTime() -
            new Date(b.schedule?.due || "9999-12-31").getTime();
          break;
        case "interval":
          cmp =
            (a.schedule?.scheduled_days || 0) -
            (b.schedule?.scheduled_days || 0);
          break;
        case "ease":
          cmp = (a.schedule?.difficulty || 0) - (b.schedule?.difficulty || 0);
          break;
        case "stability":
          cmp = (a.schedule?.stability || 0) - (b.schedule?.stability || 0);
          break;
        case "reps":
          cmp = (a.schedule?.reps || 0) - (b.schedule?.reps || 0);
          break;
        case "lapses":
          cmp = (a.schedule?.lapses || 0) - (b.schedule?.lapses || 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredCards, sortField, sortDir]);

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sortedCards.length / PAGE_SIZE);
  const pageCards = useMemo(
    () => sortedCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sortedCards, page],
  );

  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [searchInput]);

  // ── Selection ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pageCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageCards.map((c) => c.id)));
    }
  };

  // ── Sort click handler ─────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // ── Column toggle ──────────────────────────────────────────────────────
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Bulk actions ───────────────────────────────────────────────────────
  const bulkSuspend = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase
        .from("card_schedules")
        .update({ is_suspended: true })
        .eq("card_id", id)
        .eq("user_id", userId);
    }
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkUnsuspend = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase
        .from("card_schedules")
        .update({ is_suspended: false })
        .eq("card_id", id)
        .eq("user_id", userId);
    }
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} card(s)? This cannot be undone.`))
      return;
    const ids = Array.from(selectedIds);
    await supabase.from("card_schedules").delete().in("card_id", ids);
    await supabase.from("review_log").delete().in("card_id", ids);
    await supabase.from("flashcards").delete().in("id", ids);
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkChangeDeck = async (deckId: string) => {
    const ids = Array.from(selectedIds);
    await supabase.from("flashcards").update({ deck_id: deckId }).in("id", ids);
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkAddTags = async (tags: string[]) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const card = allCards.find((c) => c.id === id);
      if (card) {
        const existing = card.tags || [];
        const merged = Array.from(new Set([...existing, ...tags]));
        await supabase.from("flashcards").update({ tags: merged }).eq("id", id);
      }
    }
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkRemoveTags = async (tags: string[]) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const card = allCards.find((c) => c.id === id);
      if (card) {
        const remaining = (card.tags || []).filter((t) => !tags.includes(t));
        await supabase
          .from("flashcards")
          .update({ tags: remaining })
          .eq("id", id);
      }
    }
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkReschedule = async (days: number) => {
    const ids = Array.from(selectedIds);
    const newDue = new Date();
    newDue.setDate(newDue.getDate() + days);
    for (const id of ids) {
      await supabase
        .from("card_schedules")
        .update({ due: newDue.toISOString() })
        .eq("card_id", id)
        .eq("user_id", userId);
    }
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkReposition = async (startPos: number) => {
    // Reposition only affects new cards — update their created_at ordering
    const ids = Array.from(selectedIds);
    const newCards = ids
      .map((id) => allCards.find((c) => c.id === id))
      .filter((c) => c && (!c.schedule || c.schedule.state === "new"));

    for (let i = 0; i < newCards.length; i++) {
      const card = newCards[i]!;
      // Use created_at timestamp offset to establish order
      const baseTime = new Date("2020-01-01T00:00:00Z").getTime();
      const newCreatedAt = new Date(
        baseTime + (startPos + i) * 1000,
      ).toISOString();
      await supabase
        .from("flashcards")
        .update({ created_at: newCreatedAt })
        .eq("id", card.id);
    }
    setSelectedIds(new Set());
    await fetchAll();
  };

  // ── Visible column definitions ─────────────────────────────────────────
  const visibleCols = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key));

  // ── Render helpers ─────────────────────────────────────────────────────
  const renderCellValue = (card: BrowserCard, col: ColumnDef) => {
    const sched = card.schedule;
    switch (col.key) {
      case "front":
        return <CardContentPreview html={card.front} />;
      case "back":
        return <CardContentPreview html={card.back} />;
      case "deck":
        return (
          <span className="inline-flex items-center gap-1.5">
            {card.deck_color && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: card.deck_color }}
              />
            )}
            <span className="truncate">{card.deck_name || "—"}</span>
          </span>
        );
      case "tags":
        return (card.tags || []).length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {(card.tags || []).slice(0, 3).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[10px]"
              >
                {t}
              </span>
            ))}
            {(card.tags || []).length > 3 && (
              <span className="text-white/30 text-[10px]">
                +{card.tags!.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-white/20">—</span>
        );
      case "state":
        return (
          <StateBadge
            state={(sched?.state as CardState) || "new"}
            suspended={sched?.is_suspended}
            buried={sched?.is_buried}
            leech={sched?.is_leech}
          />
        );
      case "due":
        return sched?.due ? (
          <span
            className={cn(
              "text-xs",
              new Date(sched.due) <= new Date()
                ? "text-rose-400"
                : "text-white/40",
            )}
          >
            {new Date(sched.due).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-white/20">—</span>
        );
      case "interval":
        return (
          <span className="text-xs text-white/40">
            {sched?.scheduled_days ? formatInterval(sched.scheduled_days) : "—"}
          </span>
        );
      case "ease":
        return (
          <span className="text-xs text-white/40">
            {sched?.difficulty?.toFixed(2) || "—"}
          </span>
        );
      case "stability":
        return (
          <span className="text-xs text-white/40">
            {sched?.stability?.toFixed(1) || "—"}
          </span>
        );
      case "reps":
        return (
          <span className="text-xs text-white/40">{sched?.reps ?? 0}</span>
        );
      case "lapses":
        return (
          <span className="text-xs text-white/40">{sched?.lapses ?? 0}</span>
        );
      case "source":
        return (
          <span className="text-xs text-white/40 capitalize">
            {card.source}
          </span>
        );
      case "note_type":
        return (
          <span className="text-xs text-white/40">
            {card.note_type_name || "—"}
          </span>
        );
      case "created":
        return (
          <span className="text-xs text-white/40">
            {new Date(card.created_at).toLocaleDateString()}
          </span>
        );
      case "retrievability": {
        if (!sched || !sched.last_review)
          return <span className="text-white/20">—</span>;
        const elapsed =
          (Date.now() - new Date(sched.last_review).getTime()) /
          (1000 * 60 * 60 * 24);
        const r = retrievability(elapsed, sched.stability || 1);
        const pct = Math.round(r * 100);
        return (
          <span
            className={cn(
              "text-xs",
              pct >= 90
                ? "text-emerald-400"
                : pct >= 70
                  ? "text-amber-400"
                  : "text-rose-400",
            )}
          >
            {pct}%
          </span>
        );
      }
      default:
        return null;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return (
        <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-30" />
      );
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-teal-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-teal-400" />
    );
  };

  // ── Main render ────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} />
      <AppNav
        streak={streak}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
      />
      <ContextualNav />

      <div className="flex-1 flex flex-col min-h-0 lg:ml-[72px] pb-20 lg:pb-0">
        {/* Header */}
        <div className="px-4 lg:px-8 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/propel/flashcards"
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-light text-white">Card Browser</h1>
            <span className="text-white/30 text-sm">
              {filteredCards.length} of {allCards.length} cards
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/propel/flashcards/stats"
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
              >
                <BarChart3 className="h-3.5 w-3.5" /> Statistics
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search cards... (e.g. deck:German tag:verb is:due)"
              className={cn(
                "w-full pl-10 pr-20 py-2.5 rounded-xl border border-white/10 bg-white/5",
                "text-white placeholder:text-white/30 text-sm",
                "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
                "transition",
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="p-1 text-white/30 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setShowSearchHelp(!showSearchHelp)}
                className="p-1 text-white/30 hover:text-teal-300 transition"
                title="Search syntax help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            <SearchHelp
              open={showSearchHelp}
              onClose={() => setShowSearchHelp(false)}
            />
          </div>

          {/* Active filters description */}
          {parsed.filters.length > 0 && (
            <div className="mt-2 text-xs text-white/30">
              Filters: {describeFilters(parsed)}
            </div>
          )}
        </div>

        {/* Bulk actions */}
        <div className="px-4 lg:px-8">
          <BulkActionBar
            selectedCount={selectedIds.size}
            onSuspend={bulkSuspend}
            onUnsuspend={bulkUnsuspend}
            onDelete={bulkDelete}
            onChangeDeck={bulkChangeDeck}
            onAddTags={bulkAddTags}
            onRemoveTags={bulkRemoveTags}
            onReschedule={bulkReschedule}
            onFindReplace={() => setShowFindReplace(true)}
            onReposition={bulkReposition}
            decks={decks}
          />
        </div>

        {/* Table + Preview split */}
        <div className="flex-1 flex min-h-0 px-4 lg:px-8">
          {/* Table container */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Column settings */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white/30">
                Page {page + 1} of {Math.max(totalPages, 1)}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 transition"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Columns
                </button>
                <ColumnSettings
                  open={showColumnSettings}
                  onClose={() => setShowColumnSettings(false)}
                  visibleColumns={visibleColumns}
                  onToggle={toggleColumn}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    {/* Checkbox column */}
                    <th className="text-left px-3 py-2.5 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-white/30 hover:text-teal-400 transition"
                      >
                        {selectedIds.size === pageCards.length &&
                        pageCards.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-teal-400" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    {visibleCols.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "text-left px-3 py-2.5 text-white/50 font-medium text-xs",
                          col.sortable &&
                            "cursor-pointer group select-none hover:text-white/70 transition",
                        )}
                        style={{ minWidth: col.minWidth }}
                        onClick={() =>
                          col.sortField && handleSort(col.sortField)
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortField && <SortIcon field={col.sortField} />}
                        </span>
                      </th>
                    ))}
                    {/* Preview column */}
                    <th className="w-10 px-3 py-2.5">
                      <Eye className="h-3.5 w-3.5 text-white/20" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageCards.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleCols.length + 2}
                        className="text-center py-16 text-white/30"
                      >
                        {allCards.length === 0
                          ? "No cards in your collection."
                          : "No cards match your search."}
                      </td>
                    </tr>
                  ) : (
                    pageCards.map((card) => (
                      <tr
                        key={card.id}
                        className={cn(
                          "border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer",
                          selectedIds.has(card.id) && "bg-teal-500/5",
                          previewCard?.id === card.id && "bg-teal-500/10",
                        )}
                        onClick={() => setPreviewCard(card)}
                      >
                        <td
                          className="px-3 py-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => toggleSelect(card.id)}
                            className="text-white/30 hover:text-teal-400 transition"
                          >
                            {selectedIds.has(card.id) ? (
                              <CheckSquare className="h-4 w-4 text-teal-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        {visibleCols.map((col) => (
                          <td
                            key={col.key}
                            className="px-3 py-2.5 max-w-[250px] truncate text-white/70"
                          >
                            {renderCellValue(card, col)}
                          </td>
                        ))}
                        <td className="px-3 py-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewCard(
                                previewCard?.id === card.id ? null : card,
                              );
                            }}
                            className="p-1 text-white/20 hover:text-teal-400 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-3">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i;
                  } else if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 7 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs transition",
                        page === pageNum
                          ? "bg-teal-500/15 text-teal-300 border border-teal-400/30"
                          : "text-white/40 hover:text-white hover:bg-white/5",
                      )}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Preview pane */}
          {previewCard && (
            <CardPreviewPane
              card={previewCard}
              onClose={() => setPreviewCard(null)}
            />
          )}
        </div>
      </div>

      <MobileBottomNav wordsEncountered={wordsEncountered} />

      <FindReplaceDialog
        open={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        selectedIds={Array.from(selectedIds)}
        onComplete={fetchAll}
        userId={userId}
      />
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function CardBrowserPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);
      setAvatarUrl(
        user.user_metadata?.avatar_url || user.user_metadata?.picture,
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("streak, target_language, subscription_tier")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStreak(profile.streak ?? 0);
        setTargetLanguage(profile.target_language ?? "fr");
      }

      const { data: allWords } = await supabase
        .from("learner_words_v2")
        .select("id")
        .eq("user_id", user.id)
        .eq("language", profile?.target_language ?? "fr");

      setWordsEncountered(allWords?.length ?? 0);

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(!!adminRow);
      setLoading(false);
    };

    load();
  }, [supabase, router]);

  if (loading || !userId) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <BrowserContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        userId={userId}
      />
    </ProtectedRoute>
  );
}
