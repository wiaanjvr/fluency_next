"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  ChevronDown,
  AlertTriangle,
  Settings2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "./RichTextEditor";
import { FieldManager } from "./FieldManager";
import { TagsInput } from "./TagsInput";
import { AudioRecorder } from "./AudioRecorder";
import { MediaDropZone } from "./MediaDropZone";
import { LaTeXDialog } from "./LaTeXDialog";
import { ClozeToolbar, buildClozeMarkup } from "./ClozeInput";
import { TemplatePreview } from "./TemplatePreview";
import { ImageOcclusionEditor } from "./ImageOcclusionEditor";
import { useDuplicateDetection } from "./useDuplicateDetection";
import { useMediaUpload, useFileInput, soundTag } from "./media-utils";
import {
  generateCards,
  countGeneratedCards,
  isMultiCardNoteType,
} from "@/lib/card-generator";
import type { NoteType, NoteField, CardEditorField } from "@/types/card-editor";
import type { Flashcard, Deck } from "@/types/flashcards";
import type { OcclusionRegion, OcclusionMode } from "@/types/image-occlusion";

// ── Props ──────────────────────────────────────────────────────────────────
interface CardEditorProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** Current deck (default selection) */
  currentDeckId: string;
  /** Pass an existing card to enable editing mode */
  editCard?: Flashcard | null;
  /** Called after successful save */
  onSaved: () => void;
}

// ── Helper: convert old-style card to field values ─────────────────────────
function flashcardToFields(card: Flashcard): CardEditorField[] {
  // If the card already has structured fields, use them
  if (card.fields && typeof card.fields === "object") {
    const fields = card.fields as Record<string, string>;
    return Object.entries(fields).map(([name, value]) => ({ name, value }));
  }

  // Otherwise, map from legacy front/back fields
  const f: CardEditorField[] = [
    { name: "Front", value: card.front },
    { name: "Back", value: card.back },
  ];
  if (card.example_sentence) {
    f.push({ name: "Example", value: card.example_sentence });
  }
  if (card.grammar_notes) {
    f.push({ name: "Grammar", value: card.grammar_notes });
  }
  return f;
}

export function CardEditor({
  open,
  onClose,
  userId,
  currentDeckId,
  editCard,
  onSaved,
}: CardEditorProps) {
  const supabase = createClient();
  const isEditing = !!editCard;

  // ── Core state ───────────────────────────────────────────────────────────
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Form state ───────────────────────────────────────────────────────────
  const [selectedNoteTypeId, setSelectedNoteTypeId] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState(currentDeckId);
  const [fieldValues, setFieldValues] = useState<CardEditorField[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showFieldManager, setShowFieldManager] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showLatexDialog, setShowLatexDialog] = useState(false);
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [showDeckDropdown, setShowDeckDropdown] = useState(false);
  const [showNoteTypeDropdown, setShowNoteTypeDropdown] = useState(false);

  // ── Sticky fields tracking ───────────────────────────────────────────────
  const stickyValuesRef = useRef<Record<string, string>>({});

  // ── Image Occlusion state ────────────────────────────────────────────────
  const [occlusionRegions, setOcclusionRegions] = useState<OcclusionRegion[]>(
    [],
  );
  const [occlusionMode, setOcclusionMode] =
    useState<OcclusionMode>("one-by-one");
  const [occlusionImageUrl, setOcclusionImageUrl] = useState<string>("");

  // ── Media ────────────────────────────────────────────────────────────────
  const { upload, uploading: mediaUploading } = useMediaUpload(userId);
  const { openFilePicker: openImagePicker } = useFileInput("image/*");
  const { openFilePicker: openAudioPicker } = useFileInput("audio/*");
  const { openFilePicker: openVideoPicker } = useFileInput("video/*");

  // ── Duplicate detection ──────────────────────────────────────────────────
  const frontContent = fieldValues[0]?.value || "";
  const { duplicates, checking: checkingDuplicates } = useDuplicateDetection({
    userId,
    frontContent,
    excludeCardId: editCard?.id,
    enabled: !isEditing && open,
  });

  // ── Selected note type ───────────────────────────────────────────────────
  const selectedNoteType = useMemo(
    () => noteTypes.find((nt) => nt.id === selectedNoteTypeId),
    [noteTypes, selectedNoteTypeId],
  );

  // ── Note type classification ─────────────────────────────────────────────
  const isClozeType = useMemo(
    () =>
      selectedNoteType?.name === "Cloze" ||
      selectedNoteType?.templates.some(
        (t) =>
          t.front_template.includes("{{cloze:") ||
          t.back_template.includes("{{cloze:"),
      ) ||
      false,
    [selectedNoteType],
  );

  const isImageOcclusionType = useMemo(
    () => selectedNoteType?.name === "Image Occlusion",
    [selectedNoteType],
  );

  const isReversedType = useMemo(
    () => (selectedNoteType?.templates.length ?? 0) > 1,
    [selectedNoteType],
  );

  // ── Fields as a record for template rendering ────────────────────────────
  const fieldsRecord = useMemo(() => {
    const rec: Record<string, string> = {};
    fieldValues.forEach((f) => {
      rec[f.name] = f.value;
    });
    return rec;
  }, [fieldValues]);

  // ── Card count preview ───────────────────────────────────────────────────
  const cardCount = useMemo(() => {
    if (!selectedNoteType) return 1;
    return countGeneratedCards(
      selectedNoteType,
      fieldsRecord,
      isImageOcclusionType ? occlusionRegions : undefined,
    );
  }, [selectedNoteType, fieldsRecord, isImageOcclusionType, occlusionRegions]);

  // ── Auto-detect image URL for Image Occlusion ────────────────────────────
  useEffect(() => {
    if (!isImageOcclusionType) return;
    // Look for an "Image" field and extract the first <img src="...">
    const imageField = fieldValues.find(
      (f) => f.name.toLowerCase() === "image",
    );
    if (imageField?.value) {
      const match = imageField.value.match(/src="([^"]+)"/);
      if (match?.[1] && match[1] !== occlusionImageUrl) {
        setOcclusionImageUrl(match[1]);
      }
    }
  }, [isImageOcclusionType, fieldValues, occlusionImageUrl]);

  // ── Load data on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);

      // Seed default note types if needed
      await supabase.rpc("seed_default_note_types", { p_user_id: userId });

      // Load note types, decks, and all tags in parallel
      const [ntRes, deckRes, tagRes] = await Promise.all([
        supabase
          .from("note_types")
          .select("*")
          .eq("user_id", userId)
          .order("created_at"),
        supabase.from("decks").select("*").eq("user_id", userId).order("name"),
        supabase
          .from("flashcards")
          .select("tags")
          .eq("user_id", userId)
          .not("tags", "is", null),
      ]);

      const nTypes = (ntRes.data || []) as NoteType[];
      setNoteTypes(nTypes);
      setDecks((deckRes.data || []) as Deck[]);

      // Extract unique tags
      const tagSet = new Set<string>();
      (tagRes.data || []).forEach((row: { tags: string[] | null }) => {
        row.tags?.forEach((t) => tagSet.add(t));
      });
      setAllTags(Array.from(tagSet).sort());

      // Set initial note type
      if (editCard) {
        // Editing existing card
        const matchType = editCard.note_type_id
          ? nTypes.find((nt) => nt.id === editCard.note_type_id)
          : nTypes.find(
              (nt) => nt.name === "Basic" || nt.name === "Vocabulary",
            );
        if (matchType) {
          setSelectedNoteTypeId(matchType.id);
        } else if (nTypes.length > 0) {
          setSelectedNoteTypeId(nTypes[0].id);
        }
        setFieldValues(flashcardToFields(editCard));
        setTags(editCard.tags || []);
        setSelectedDeckId(editCard.deck_id);
      } else {
        // New card — use Vocabulary type if available, else Basic
        const vocabType = nTypes.find((nt) => nt.name === "Vocabulary");
        const defaultType = vocabType || nTypes[0];
        if (defaultType) {
          setSelectedNoteTypeId(defaultType.id);
          initFieldValues(defaultType.fields);
        }
        setSelectedDeckId(currentDeckId);
        setTags([]);
      }

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  // ── Initialize field values from note type fields ────────────────────────
  const initFieldValues = useCallback((fields: NoteField[]) => {
    setFieldValues(
      fields.map((f) => ({
        name: f.name,
        value: f.sticky ? stickyValuesRef.current[f.name] || "" : "",
      })),
    );
  }, []);

  // ── When note type changes, reinitialize fields ──────────────────────────
  useEffect(() => {
    if (!selectedNoteType || isEditing || loading) return;
    initFieldValues(selectedNoteType.fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteTypeId]);

  // ── Update field value ───────────────────────────────────────────────────
  const updateFieldValue = useCallback((index: number, html: string) => {
    setFieldValues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value: html };
      return next;
    });
  }, []);

  // ── Handle field structure changes from FieldManager ─────────────────────
  const handleFieldsChanged = useCallback(
    (newFields: NoteField[]) => {
      if (!selectedNoteType) return;
      // Update the note type's fields in the DB
      supabase
        .from("note_types")
        .update({ fields: newFields, updated_at: new Date().toISOString() })
        .eq("id", selectedNoteType.id)
        .then(() => {
          // Update local state
          setNoteTypes((prev) =>
            prev.map((nt) =>
              nt.id === selectedNoteType.id ? { ...nt, fields: newFields } : nt,
            ),
          );
        });

      // Adjust field values to match new field structure
      setFieldValues((prev) => {
        const oldMap = new Map(prev.map((f) => [f.name, f.value]));
        return newFields.map((f) => ({
          name: f.name,
          value: oldMap.get(f.name) || "",
        }));
      });
    },
    [selectedNoteType, supabase],
  );

  // ── Media insertion callbacks ────────────────────────────────────────────
  const handleInsertImage = useCallback(() => {
    openImagePicker(async (files) => {
      for (const file of files) {
        const result = await upload(file);
        if (result) {
          const html = `<img src="${result.url}" alt="${result.filename}" class="max-w-full rounded-lg my-2" />`;
          updateFieldValue(
            activeFieldIndex,
            fieldValues[activeFieldIndex]?.value + html,
          );
        }
      }
    });
  }, [
    openImagePicker,
    upload,
    activeFieldIndex,
    fieldValues,
    updateFieldValue,
  ]);

  const handleInsertAudio = useCallback(() => {
    openAudioPicker(async (files) => {
      for (const file of files) {
        const result = await upload(file);
        if (result) {
          const tag = soundTag(result.url);
          updateFieldValue(
            activeFieldIndex,
            fieldValues[activeFieldIndex]?.value + tag,
          );
        }
      }
    });
  }, [
    openAudioPicker,
    upload,
    activeFieldIndex,
    fieldValues,
    updateFieldValue,
  ]);

  const handleInsertVideo = useCallback(() => {
    openVideoPicker(async (files) => {
      for (const file of files) {
        const result = await upload(file);
        if (result) {
          const html = `<video controls src="${result.url}" class="max-w-full rounded-lg my-2"></video>`;
          updateFieldValue(
            activeFieldIndex,
            fieldValues[activeFieldIndex]?.value + html,
          );
        }
      }
    });
  }, [
    openVideoPicker,
    upload,
    activeFieldIndex,
    fieldValues,
    updateFieldValue,
  ]);

  const handleRecordedAudio = useCallback(
    (url: string) => {
      const tag = soundTag(url);
      updateFieldValue(
        activeFieldIndex,
        fieldValues[activeFieldIndex]?.value + tag,
      );
      setShowAudioRecorder(false);
    },
    [activeFieldIndex, fieldValues, updateFieldValue],
  );

  const handleInsertLatex = useCallback(
    (html: string) => {
      updateFieldValue(
        activeFieldIndex,
        fieldValues[activeFieldIndex]?.value + html,
      );
    },
    [activeFieldIndex, fieldValues, updateFieldValue],
  );

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const result = await upload(file);
        if (!result) continue;

        let html = "";
        switch (result.type) {
          case "image":
            html = `<img src="${result.url}" alt="${result.filename}" class="max-w-full rounded-lg my-2" />`;
            break;
          case "audio":
            html = soundTag(result.url);
            break;
          case "video":
            html = `<video controls src="${result.url}" class="max-w-full rounded-lg my-2"></video>`;
            break;
        }
        updateFieldValue(
          activeFieldIndex,
          fieldValues[activeFieldIndex]?.value + html,
        );
      }
    },
    [upload, activeFieldIndex, fieldValues, updateFieldValue],
  );

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require at least the first field
    const firstField = fieldValues[0];
    if (!firstField?.value.trim() || firstField.value === "<p></p>") return;

    setSubmitting(true);
    try {
      // Build fields JSON
      const fieldsJson: Record<string, string> = {};
      fieldValues.forEach((f) => {
        fieldsJson[f.name] = f.value;
      });

      if (isEditing && editCard) {
        // For backward compatibility, extract front/back from first two fields
        const front = fieldValues[0]?.value || "";
        const back = fieldValues[1]?.value || "";
        const exampleField = fieldValues.find(
          (f) =>
            f.name.toLowerCase() === "example" ||
            f.name.toLowerCase() === "example sentence",
        );
        const grammarField = fieldValues.find(
          (f) => f.name.toLowerCase() === "grammar",
        );

        // Update existing card (single card only)
        await supabase
          .from("flashcards")
          .update({
            front,
            back,
            example_sentence: exampleField?.value ?? null,
            grammar_notes: grammarField?.value ?? null,
            tags: tags.length > 0 ? tags : null,
            note_type_id: selectedNoteTypeId || null,
            fields: fieldsJson,
            deck_id: selectedDeckId,
          })
          .eq("id", editCard.id)
          .eq("user_id", userId);
      } else if (selectedNoteType && isMultiCardNoteType(selectedNoteType)) {
        // ── Multi-card generation (cloze, reversed, image occlusion) ───────
        const cards = generateCards({
          noteType: selectedNoteType,
          fields: fieldsJson,
          occlusionRegions: isImageOcclusionType ? occlusionRegions : undefined,
          occlusionMode: isImageOcclusionType ? occlusionMode : undefined,
          occlusionImageUrl: isImageOcclusionType
            ? occlusionImageUrl
            : undefined,
        });

        if (cards.length === 0) {
          setSubmitting(false);
          return;
        }

        // Insert all generated cards
        for (const gc of cards) {
          const targetDeckId = gc.deckOverride || selectedDeckId;
          const { data: card } = await supabase
            .from("flashcards")
            .insert({
              deck_id: targetDeckId,
              user_id: userId,
              front: gc.front,
              back: gc.back,
              tags: tags.length > 0 ? tags : null,
              source: gc.source,
              note_type_id: gc.noteTypeId || null,
              fields: gc.fields,
              sibling_group: gc.siblingGroup,
              template_index: gc.templateIndex,
              cloze_ordinal: gc.clozeOrdinal,
              card_css: gc.css || null,
            })
            .select("id")
            .single();

          if (card) {
            await supabase.from("card_schedules").insert({
              user_id: userId,
              card_id: card.id,
              state: "new",
              due: new Date().toISOString(),
            });
          }
        }

        // Create user_words entry for KG sync (using first card's front)
        const selectedDeck = decks.find((d) => d.id === selectedDeckId);
        if (selectedDeck && cards[0]) {
          const cleanFront = cards[0].front.replace(/<[^>]*>/g, "").trim();
          if (cleanFront) {
            await supabase.from("user_words").upsert(
              {
                user_id: userId,
                word: cleanFront.toLowerCase().slice(0, 100),
                lemma: cleanFront.toLowerCase().slice(0, 100),
                language: selectedDeck.language,
                status: "new",
              },
              { onConflict: "user_id,word,language", ignoreDuplicates: true },
            );
          }
        }
      } else {
        // ── Single card generation (standard note types) ───────────────────
        const front = fieldValues[0]?.value || "";
        const back = fieldValues[1]?.value || "";
        const exampleField = fieldValues.find(
          (f) =>
            f.name.toLowerCase() === "example" ||
            f.name.toLowerCase() === "example sentence",
        );
        const grammarField = fieldValues.find(
          (f) => f.name.toLowerCase() === "grammar",
        );

        const { data: card } = await supabase
          .from("flashcards")
          .insert({
            deck_id: selectedDeckId,
            user_id: userId,
            front,
            back,
            example_sentence: exampleField?.value ?? null,
            grammar_notes: grammarField?.value ?? null,
            tags: tags.length > 0 ? tags : null,
            source: "manual",
            note_type_id: selectedNoteTypeId || null,
            fields: fieldsJson,
          })
          .select("id")
          .single();

        if (card) {
          await supabase.from("card_schedules").insert({
            user_id: userId,
            card_id: card.id,
            state: "new",
            due: new Date().toISOString(),
          });

          // Create user_words entry for KG sync
          const selectedDeck = decks.find((d) => d.id === selectedDeckId);
          if (selectedDeck) {
            const cleanFront = front.replace(/<[^>]*>/g, "").trim();
            await supabase.from("user_words").upsert(
              {
                user_id: userId,
                word: cleanFront.toLowerCase(),
                lemma: cleanFront.toLowerCase(),
                language: selectedDeck.language,
                status: "new",
              },
              { onConflict: "user_id,word,language", ignoreDuplicates: true },
            );
          }
        }
      }

      // Save sticky values for next card
      if (selectedNoteType) {
        selectedNoteType.fields.forEach((field, i) => {
          if (field.sticky && fieldValues[i]) {
            stickyValuesRef.current[field.name] = fieldValues[i].value;
          }
        });
      }

      // Reset form for next card (keep sticky values)
      if (!isEditing) {
        if (selectedNoteType) {
          initFieldValues(selectedNoteType.fields);
        }
        setTags([]);
        setOcclusionRegions([]);
        setOcclusionImageUrl("");
      }

      onSaved();
      if (isEditing) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!open) return null;

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-2xl border border-white/10",
          "bg-[#0d2137] shadow-2xl max-h-[92vh] flex flex-col",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? "Edit Card" : "Add Card"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFieldManager(!showFieldManager)}
              className={cn(
                "rounded-lg p-1.5 transition",
                showFieldManager
                  ? "text-teal-400 bg-teal-500/10"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5",
              )}
              title="Manage fields"
            >
              <Settings2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Selectors row */}
        <div className="flex items-center gap-3 px-6 pb-3">
          {/* Note type selector */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setShowNoteTypeDropdown(!showNoteTypeDropdown);
                setShowDeckDropdown(false);
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5",
                "px-3 py-2 text-sm text-white/80 hover:border-white/20 transition",
              )}
            >
              <span className="truncate">
                {selectedNoteType?.name || "Note type..."}
              </span>
              <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0" />
            </button>
            {showNoteTypeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0d2137] border border-white/10 rounded-xl py-1 shadow-2xl max-h-48 overflow-y-auto">
                {noteTypes.map((nt) => (
                  <button
                    key={nt.id}
                    type="button"
                    onClick={() => {
                      setSelectedNoteTypeId(nt.id);
                      setShowNoteTypeDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition",
                      nt.id === selectedNoteTypeId
                        ? "bg-teal-500/15 text-teal-300"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {nt.name}
                    {nt.is_builtin && (
                      <span className="text-[10px] text-white/30 ml-2">
                        built-in
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Deck selector */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setShowDeckDropdown(!showDeckDropdown);
                setShowNoteTypeDropdown(false);
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5",
                "px-3 py-2 text-sm text-white/80 hover:border-white/20 transition",
              )}
            >
              <span className="truncate flex items-center gap-2">
                {selectedDeck && (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedDeck.cover_color }}
                  />
                )}
                {selectedDeck?.name || "Select deck..."}
              </span>
              <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0" />
            </button>
            {showDeckDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0d2137] border border-white/10 rounded-xl py-1 shadow-2xl max-h-48 overflow-y-auto">
                {decks.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDeckId(d.id);
                      setShowDeckDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition flex items-center gap-2",
                      d.id === selectedDeckId
                        ? "bg-teal-500/15 text-teal-300"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: d.cover_color }}
                    />
                    {d.name}
                    <span className="text-[10px] text-white/30 ml-auto">
                      {d.language.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Field Manager (collapsible) */}
              {showFieldManager && selectedNoteType && (
                <FieldManager
                  fields={selectedNoteType.fields}
                  onChange={handleFieldsChanged}
                />
              )}

              {/* Rich text fields */}
              {fieldValues.map((field, i) => (
                <div key={`${field.name}-${i}`} className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    {field.name}
                    {i === 0 && <span className="text-rose-400 ml-1">*</span>}
                    {selectedNoteType?.fields[i]?.sticky && (
                      <span className="text-[10px] text-amber-400/60 ml-2 font-normal">
                        sticky
                      </span>
                    )}
                  </label>
                  <RichTextEditor
                    value={field.value}
                    onChange={(html) => updateFieldValue(i, html)}
                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                    showMedia
                    onInsertImage={handleInsertImage}
                    onInsertAudio={handleInsertAudio}
                    onInsertVideo={handleInsertVideo}
                    onRecordAudio={() => {
                      setActiveFieldIndex(i);
                      setShowAudioRecorder(true);
                    }}
                    onInsertLatex={() => {
                      setActiveFieldIndex(i);
                      setShowLatexDialog(true);
                    }}
                    onFileDrop={(files) => {
                      setActiveFieldIndex(i);
                      handleFileDrop(files);
                    }}
                    minHeight={i < 2 ? 80 : 60}
                  />
                </div>
              ))}

              {/* Cloze toolbar (for cloze note types) */}
              {isClozeType && (
                <ClozeToolbar
                  value={fieldValues[activeFieldIndex]?.value || ""}
                  allFields={fieldsRecord}
                  onInsertCloze={(clozeNum) => {
                    // Wrap with cloze markup — user should select text first
                    const idx = activeFieldIndex;
                    const current = fieldValues[idx]?.value || "";
                    const markup = buildClozeMarkup("...", clozeNum);
                    updateFieldValue(idx, current + markup);
                  }}
                />
              )}

              {/* Image Occlusion editor (for image occlusion note types) */}
              {isImageOcclusionType && occlusionImageUrl && (
                <ImageOcclusionEditor
                  imageUrl={occlusionImageUrl}
                  regions={occlusionRegions}
                  onRegionsChange={setOcclusionRegions}
                  mode={occlusionMode}
                  onModeChange={setOcclusionMode}
                />
              )}

              {/* Template preview (for all note types with templates) */}
              {selectedNoteType &&
                selectedNoteType.templates &&
                selectedNoteType.templates.length > 0 && (
                  <TemplatePreview
                    noteType={selectedNoteType}
                    fields={fieldsRecord}
                    isCloze={isClozeType}
                  />
                )}

              {/* Card count indicator */}
              {cardCount > 1 && (
                <div className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-sm text-teal-300">
                  <span className="font-medium">{cardCount}</span>
                  <span className="text-teal-300/70">
                    cards will be generated
                  </span>
                </div>
              )}

              {/* Media drop zone */}
              <MediaDropZone
                userId={userId}
                onMediaInserted={(html) => {
                  updateFieldValue(
                    activeFieldIndex,
                    fieldValues[activeFieldIndex]?.value + html,
                  );
                }}
              />

              {/* Audio recorder */}
              {showAudioRecorder && (
                <AudioRecorder
                  userId={userId}
                  onRecorded={handleRecordedAudio}
                  onClose={() => setShowAudioRecorder(false)}
                />
              )}

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Tags
                </label>
                <TagsInput
                  tags={tags}
                  onChange={setTags}
                  allTags={allTags}
                  placeholder="Add tags..."
                />
              </div>

              {/* Duplicate warning */}
              {duplicates.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Possible duplicate{duplicates.length > 1 ? "s" : ""} found
                  </div>
                  {duplicates.map((dup) => (
                    <div
                      key={dup.id}
                      className="flex items-center justify-between text-xs text-white/60 pl-6"
                    >
                      <span
                        className="truncate flex-1"
                        dangerouslySetInnerHTML={{
                          __html: dup.front,
                        }}
                      />
                      <span className="text-white/30 ml-2 flex-shrink-0">
                        {dup.deck_name} · {Math.round(dup.similarity * 100)}%
                        match
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                !fieldValues[0]?.value.trim() ||
                fieldValues[0]?.value === "<p></p>"
              }
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition",
                "bg-teal-400 hover:bg-teal-300 text-[#0a1628]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-lg shadow-teal-500/25",
              )}
            >
              {submitting
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                  ? "Save Changes"
                  : cardCount > 1
                    ? `Add ${cardCount} Cards`
                    : "Add Card"}
            </button>
          </div>
        </div>
      </form>

      {/* LaTeX Dialog */}
      <LaTeXDialog
        open={showLatexDialog}
        onClose={() => setShowLatexDialog(false)}
        onInsert={handleInsertLatex}
      />
    </div>
  );
}
