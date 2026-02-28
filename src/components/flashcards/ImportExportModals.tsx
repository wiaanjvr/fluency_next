"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Upload,
  Download,
  FileArchive,
  FileText,
  Database,
  Check,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  Settings2,
  Table2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ImportFormat,
  ExportFormat,
  DuplicateMode,
  ImportOptions,
  ExportOptions,
  CSVPreviewRow,
  CSVFieldMapping,
} from "@/types/sync-tags-import";
import { FLASHCARD_FIELDS } from "@/types/sync-tags-import";
import {
  parseCSVPreview,
  importFile,
  exportCollection,
  downloadBlob,
} from "@/lib/import-export";

// ============================================================================
// Enhanced Import Modal
// ============================================================================

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** If provided, import directly into this deck */
  deckId?: string;
  deckName?: string;
  /** If provided, show a deck selector for the user to choose */
  decks?: { id: string; name: string }[];
  onComplete?: () => void;
}

export function EnhancedImportModal({
  open,
  onClose,
  userId,
  deckId: initialDeckId,
  deckName: initialDeckName,
  decks,
  onComplete,
}: ImportModalProps) {
  // Step state
  const [step, setStep] = useState<
    "format" | "deck" | "options" | "mapping" | "preview" | "importing" | "done"
  >("format");

  // Format
  const [format, setFormat] = useState<ImportFormat>("csv");

  // Deck selection (when no deckId provided)
  const [selectedDeckId, setSelectedDeckId] = useState(initialDeckId || "");
  const [selectedDeckName, setSelectedDeckName] = useState(
    initialDeckName || "",
  );

  const deckId = initialDeckId || selectedDeckId;
  const deckName = initialDeckName || selectedDeckName;

  // File
  const [file, setFile] = useState<File | null>(null);

  // CSV-specific
  const [delimiter, setDelimiter] = useState(",");
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewRow[]>([]);
  const [fieldMapping, setFieldMapping] = useState<CSVFieldMapping>({});
  const [allowHtml, setAllowHtml] = useState(false);

  // Options
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("ignore");
  const [importScheduling, setImportScheduling] = useState(false);
  const [importMedia, setImportMedia] = useState(true);
  const [additionalTags, setAdditionalTags] = useState("");

  // Result
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    updated: number;
    media: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    // Auto-detect format from extension
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "apkg") setFormat("apkg");
    else if (ext === "colpkg") setFormat("colpkg");
    else if (ext === "txt") setFormat("txt");
    else setFormat("csv");

    // If no deck is pre-selected and format needs a deck, show deck selector
    const needsDeck = !initialDeckId && ext !== "colpkg";
    const nextStep = needsDeck && decks?.length ? "deck" : null;

    // For CSV/TXT, parse preview
    if (ext === "csv" || ext === "txt" || ext === "tsv") {
      try {
        const d = ext === "tsv" ? "\t" : delimiter;
        const preview = await parseCSVPreview(f, d);
        setCsvColumns(preview.columns);
        setCsvPreview(preview.rows);

        // Auto-map columns
        const autoMap: CSVFieldMapping = {};
        for (const col of preview.columns) {
          const match = FLASHCARD_FIELDS.find(
            (fld) =>
              fld.key === col.toLowerCase() ||
              fld.label.toLowerCase() === col.toLowerCase(),
          );
          if (match) autoMap[match.key] = col;
        }
        setFieldMapping(autoMap);
        setStep(nextStep || "mapping");
      } catch {
        setStep(nextStep || "options");
      }
    } else {
      setStep(nextStep || "options");
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setStep("importing");

    try {
      const tags = additionalTags.split(/[\s,;]+/).filter(Boolean);

      const options: ImportOptions = {
        format,
        deckId,
        delimiter,
        fieldMapping: Object.fromEntries(
          Object.entries(fieldMapping).map(([k, v]) => [v, k]),
        ),
        allowHtml,
        duplicateMode,
        importScheduling,
        importMedia,
        additionalTags: tags.length > 0 ? tags : undefined,
      };

      const res = await importFile(file, userId, deckId, options);
      setResult({
        success: res.success,
        imported: res.cardsImported,
        skipped: res.cardsSkipped,
        updated: res.cardsUpdated,
        media: res.mediaImported,
        errors: res.errors,
        warnings: res.warnings,
      });
      setStep("done");
    } catch (err) {
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        updated: 0,
        media: 0,
        errors: [err instanceof Error ? err.message : "Import failed"],
        warnings: [],
      });
      setStep("done");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep("format");
    setFile(null);
    setResult(null);
    setCsvColumns([]);
    setCsvPreview([]);
    setFieldMapping({});
    if (result?.success) onComplete?.();
    onClose();
  };

  const formatOptions: {
    format: ImportFormat;
    icon: React.ReactNode;
    label: string;
    desc: string;
    accept: string;
  }[] = [
    {
      format: "apkg",
      icon: <FileArchive className="h-5 w-5" />,
      label: "Anki Package (.apkg)",
      desc: "Full deck with media and scheduling",
      accept: ".apkg",
    },
    {
      format: "colpkg",
      icon: <Database className="h-5 w-5" />,
      label: "Collection Package (.colpkg)",
      desc: "Entire Anki collection backup",
      accept: ".colpkg",
    },
    {
      format: "csv",
      icon: <Table2 className="h-5 w-5" />,
      label: "CSV / TSV (.csv, .tsv)",
      desc: "Tab or comma-separated with field mapping",
      accept: ".csv,.tsv,.txt",
    },
    {
      format: "txt",
      icon: <FileText className="h-5 w-5" />,
      label: "Plain Text (.txt)",
      desc: "Custom delimiter import",
      accept: ".txt",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-2xl border border-white/10",
          "bg-[#0d2137] shadow-2xl flex flex-col max-h-[85vh]",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10">
              <Upload className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import Cards</h2>
              <p className="text-xs text-white/40">
                Import into &ldquo;{deckName}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step: Format Selection */}
          {step === "format" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {formatOptions.map((opt) => (
                  <label
                    key={opt.format}
                    className={cn(
                      "relative flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition",
                      format === opt.format
                        ? "border-teal-400/30 bg-teal-500/5"
                        : "border-white/10 hover:border-white/20 hover:bg-white/[.02]",
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={opt.format}
                      checked={format === opt.format}
                      onChange={() => setFormat(opt.format)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-teal-400/70">{opt.icon}</span>
                      <span className="text-sm font-medium text-white">
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-xs text-white/40">{opt.desc}</span>
                  </label>
                ))}
              </div>

              {/* File picker */}
              <div>
                <input
                  type="file"
                  accept={
                    formatOptions.find((o) => o.format === format)?.accept
                  }
                  onChange={handleFileChange}
                  className="hidden"
                  id="import-file-input"
                />
                <label
                  htmlFor="import-file-input"
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/10 py-8 cursor-pointer transition",
                    "hover:border-teal-400/30 hover:bg-teal-500/5",
                  )}
                >
                  <Upload className="h-8 w-8 text-white/30" />
                  <span className="text-sm text-white/50">
                    {file ? file.name : "Click to select a file"}
                  </span>
                  {file && (
                    <span className="text-xs text-white/30">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Step: Deck Selection (when no deckId provided) */}
          {step === "deck" && decks && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white/70">
                Select Target Deck
              </h3>
              <p className="text-xs text-white/40">
                Choose which deck to import cards into.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {decks.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDeckId(d.id);
                      setSelectedDeckName(d.name);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border transition",
                      selectedDeckId === d.id
                        ? "border-teal-400/30 bg-teal-500/10 text-white"
                        : "border-white/10 hover:border-white/20 text-white/60 hover:text-white",
                    )}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
              <button
                disabled={!selectedDeckId}
                onClick={() => {
                  if (format === "csv" || format === "txt") {
                    setStep("mapping");
                  } else {
                    setStep("options");
                  }
                }}
                className={cn(
                  "w-full py-2.5 rounded-xl font-medium text-sm transition",
                  selectedDeckId
                    ? "bg-teal-500 hover:bg-teal-400 text-[#0a1628]"
                    : "bg-white/5 text-white/30 cursor-not-allowed",
                )}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step: CSV Field Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white/70">
                Map CSV Columns to Card Fields
              </h3>

              <div className="space-y-2">
                {FLASHCARD_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-40 text-sm",
                        field.required ? "text-white" : "text-white/50",
                      )}
                    >
                      {field.label}
                      {field.required && (
                        <span className="text-rose-400 ml-1">*</span>
                      )}
                    </span>

                    <ArrowRight className="h-3.5 w-3.5 text-white/20" />

                    <select
                      value={fieldMapping[field.key] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFieldMapping((prev) => {
                          const next = { ...prev };
                          if (val) next[field.key] = val;
                          else delete next[field.key];
                          return next;
                        });
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-teal-400/50"
                    >
                      <option value="">— Skip —</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {csvPreview.length > 0 && (
                <div>
                  <h4 className="text-xs text-white/40 mb-2 flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Preview (first{" "}
                    {Math.min(csvPreview.length, 5)} rows)
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs text-white/60">
                      <thead>
                        <tr className="border-b border-white/5">
                          {csvColumns.slice(0, 5).map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 text-left text-white/40 font-medium"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 5).map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-white/5 last:border-0"
                          >
                            {csvColumns.slice(0, 5).map((col) => (
                              <td
                                key={col}
                                className="px-3 py-2 truncate max-w-[200px]"
                              >
                                {row[col] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep("options")}
                disabled={!fieldMapping["front"] || !fieldMapping["back"]}
                className="w-full py-2.5 bg-teal-500/20 text-teal-300 rounded-xl text-sm font-medium hover:bg-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Continue to Options
              </button>
            </div>
          )}

          {/* Step: Options */}
          {step === "options" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Settings2 className="h-3.5 w-3.5" />
                Import Settings
              </div>

              {/* Duplicate handling */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Duplicate Handling
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      value: "ignore" as DuplicateMode,
                      label: "Skip",
                      desc: "Ignore duplicates",
                    },
                    {
                      value: "update" as DuplicateMode,
                      label: "Update",
                      desc: "Overwrite existing",
                    },
                    {
                      value: "create_new" as DuplicateMode,
                      label: "Create New",
                      desc: "Allow duplicates",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDuplicateMode(opt.value)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        duplicateMode === opt.value
                          ? "border-teal-400/30 bg-teal-500/10"
                          : "border-white/10 hover:border-white/20",
                      )}
                    >
                      <div className="text-sm font-medium text-white">
                        {opt.label}
                      </div>
                      <div className="text-xs text-white/40">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* APKG/COLPKG specific options */}
              {(format === "apkg" || format === "colpkg") && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importScheduling}
                      onChange={(e) => setImportScheduling(e.target.checked)}
                      className="rounded border-white/20 text-teal-400 bg-white/5 focus:ring-teal-400/50"
                    />
                    <div>
                      <div className="text-sm text-white">
                        Import scheduling data
                      </div>
                      <div className="text-xs text-white/40">
                        Preserve review history and intervals
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importMedia}
                      onChange={(e) => setImportMedia(e.target.checked)}
                      className="rounded border-white/20 text-teal-400 bg-white/5 focus:ring-teal-400/50"
                    />
                    <div>
                      <div className="text-sm text-white">
                        Import media files
                      </div>
                      <div className="text-xs text-white/40">
                        Images and audio from the Anki package
                      </div>
                    </div>
                  </label>
                </>
              )}

              {/* CSV specific options */}
              {(format === "csv" || format === "txt") && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowHtml}
                      onChange={(e) => setAllowHtml(e.target.checked)}
                      className="rounded border-white/20 text-teal-400 bg-white/5 focus:ring-teal-400/50"
                    />
                    <div>
                      <div className="text-sm text-white">
                        Allow HTML in fields
                      </div>
                      <div className="text-xs text-white/40">
                        Preserve formatting (bold, italic, etc.)
                      </div>
                    </div>
                  </label>

                  <div>
                    <label className="block text-sm text-white/70 mb-1">
                      Delimiter
                    </label>
                    <select
                      value={delimiter}
                      onChange={(e) => setDelimiter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-teal-400/50"
                    >
                      <option value=",">Comma (,)</option>
                      <option value="	">Tab</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Additional tags */}
              <div>
                <label className="block text-sm text-white/70 mb-1">
                  Additional Tags (optional)
                </label>
                <input
                  type="text"
                  value={additionalTags}
                  onChange={(e) => setAdditionalTags(e.target.value)}
                  placeholder="imported, chapter-1, ..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50"
                />
                <p className="text-xs text-white/30 mt-1">
                  Space or comma separated — applied to all imported cards
                </p>
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={!file}
                className="w-full py-2.5 bg-teal-500/20 text-teal-300 rounded-xl text-sm font-medium hover:bg-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Start Import
              </button>
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mb-4" />
              <p className="text-sm text-white/50">Importing cards...</p>
              <p className="text-xs text-white/30 mt-1">
                This may take a moment for large files
              </p>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div
                className={cn(
                  "rounded-xl border p-4",
                  result.success
                    ? "bg-teal-500/10 border-teal-400/20"
                    : "bg-rose-500/10 border-rose-400/20",
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  {result.success ? (
                    <Check className="h-5 w-5 text-teal-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                  )}
                  <span
                    className={cn(
                      "text-base font-medium",
                      result.success ? "text-teal-300" : "text-rose-300",
                    )}
                  >
                    {result.success
                      ? "Import Complete"
                      : "Import Finished with Errors"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-white/50">Cards imported:</span>
                  <span className="text-white font-medium">
                    {result.imported}
                  </span>

                  {result.updated > 0 && (
                    <>
                      <span className="text-white/50">Cards updated:</span>
                      <span className="text-white font-medium">
                        {result.updated}
                      </span>
                    </>
                  )}

                  {result.skipped > 0 && (
                    <>
                      <span className="text-white/50">Cards skipped:</span>
                      <span className="text-white/40">{result.skipped}</span>
                    </>
                  )}

                  {result.media > 0 && (
                    <>
                      <span className="text-white/50">Media files:</span>
                      <span className="text-white font-medium">
                        {result.media}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
                  <div className="text-xs text-rose-300 font-medium mb-1">
                    Errors ({result.errors.length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-rose-300/70">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
                  <div className="text-xs text-amber-300 font-medium mb-1">
                    Warnings ({result.warnings.length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-300/70">
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 bg-white/5 text-white/70 rounded-xl text-sm font-medium hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Enhanced Export Modal
// ============================================================================

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  decks: { id: string; name: string; card_count: number }[];
}

export function EnhancedExportModal({
  open,
  onClose,
  userId,
  decks,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [selectedDecks, setSelectedDecks] = useState<Set<string>>(new Set());
  const [entireCollection, setEntireCollection] = useState(true);
  const [includeScheduling, setIncludeScheduling] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(false);
  const [includeTags, setIncludeTags] = useState(true);
  const [delimiter, setDelimiter] = useState(",");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const toggleDeck = (id: string) => {
    setSelectedDecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setEntireCollection(false);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format,
        deckIds: entireCollection ? undefined : [...selectedDecks],
        entireCollection,
        includeScheduling,
        includeMedia,
        delimiter,
        includeTags,
      };

      const result = await exportCollection(userId, options);
      downloadBlob(result.blob, result.filename);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const formatOptions: {
    format: ExportFormat;
    icon: React.ReactNode;
    label: string;
    desc: string;
  }[] = [
    {
      format: "csv",
      icon: <Table2 className="h-5 w-5" />,
      label: "CSV",
      desc: "Spreadsheet-compatible",
    },
    {
      format: "txt",
      icon: <FileText className="h-5 w-5" />,
      label: "Text",
      desc: "Plain text notes",
    },
    {
      format: "apkg",
      icon: <FileArchive className="h-5 w-5" />,
      label: "Anki (.apkg)",
      desc: "Import into Anki",
    },
    {
      format: "colpkg",
      icon: <Database className="h-5 w-5" />,
      label: "Collection (.colpkg)",
      desc: "Full backup",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-xl rounded-2xl border border-white/10",
          "bg-[#0d2137] shadow-2xl flex flex-col max-h-[85vh]",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10">
              <Download className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Export Cards</h2>
              <p className="text-xs text-white/40">
                Download your flashcards in various formats
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Format selection */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.format}
                  type="button"
                  onClick={() => setFormat(opt.format)}
                  className={cn(
                    "rounded-xl border p-3 transition text-center",
                    format === opt.format
                      ? "border-teal-400/30 bg-teal-500/10"
                      : "border-white/10 hover:border-white/20",
                  )}
                >
                  <div className="flex justify-center text-teal-400/70 mb-1">
                    {opt.icon}
                  </div>
                  <div className="text-xs font-medium text-white">
                    {opt.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Deck selection */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Decks</label>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={entireCollection}
                onChange={(e) => {
                  setEntireCollection(e.target.checked);
                  if (e.target.checked) setSelectedDecks(new Set());
                }}
                className="rounded border-white/20 text-teal-400 bg-white/5"
              />
              <span className="text-sm text-white">Entire collection</span>
            </label>

            {!entireCollection && (
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl border border-white/10 p-2">
                {decks.map((deck) => (
                  <label
                    key={deck.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDecks.has(deck.id)}
                      onChange={() => toggleDeck(deck.id)}
                      className="rounded border-white/20 text-teal-400 bg-white/5"
                    />
                    <span className="text-sm text-white/70 flex-1">
                      {deck.name}
                    </span>
                    <span className="text-xs text-white/30">
                      {deck.card_count} cards
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTags}
                onChange={(e) => setIncludeTags(e.target.checked)}
                className="rounded border-white/20 text-teal-400 bg-white/5"
              />
              <span className="text-sm text-white">Include tags</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeScheduling}
                onChange={(e) => setIncludeScheduling(e.target.checked)}
                className="rounded border-white/20 text-teal-400 bg-white/5"
              />
              <span className="text-sm text-white">
                Include scheduling data
              </span>
            </label>

            {(format === "apkg" || format === "colpkg") && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="rounded border-white/20 text-teal-400 bg-white/5"
                />
                <span className="text-sm text-white">Include media files</span>
              </label>
            )}

            {(format === "csv" || format === "txt") && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70">Delimiter:</span>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white appearance-none focus:outline-none"
                >
                  <option value=",">Comma (,)</option>
                  <option value="	">Tab</option>
                  <option value=";">Semicolon (;)</option>
                </select>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-400/20 p-3">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-teal-500/10 border border-teal-400/20 p-3">
              <Check className="h-4 w-4 text-teal-400" />
              <p className="text-sm text-teal-300">Export downloaded!</p>
            </div>
          )}

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={
              exporting || (!entireCollection && selectedDecks.size === 0)
            }
            className={cn(
              "w-full py-2.5 rounded-xl text-sm font-medium transition",
              exporting
                ? "bg-white/5 text-white/30 cursor-wait"
                : "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed",
            )}
          >
            {exporting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                Exporting...
              </span>
            ) : (
              `Export as .${format}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
