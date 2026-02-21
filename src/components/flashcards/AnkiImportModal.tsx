"use client";

import { useState, useRef } from "react";
import { X, Upload, Check, AlertCircle, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnkiCard {
  front: string;
  back: string;
  example_sentence?: string;
  tags?: string[];
}

interface AnkiImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (cards: AnkiCard[]) => Promise<void>;
}

// Strip HTML tags from Anki fields
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function AnkiImportModal({
  open,
  onClose,
  onImport,
}: AnkiImportModalProps) {
  const [cards, setCards] = useState<AnkiCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Dynamically import JSZip and sql.js
      const [JSZipModule, initSqlJs] = await Promise.all([
        import("jszip"),
        import("sql.js").then((m) => m.default),
      ]);
      const JSZip = JSZipModule.default;

      // Unzip the .apkg file
      const zip = await JSZip.loadAsync(file);
      const dbFile =
        zip.file("collection.anki2") || zip.file("collection.anki21");

      if (!dbFile) {
        setError(
          "Invalid .apkg file — could not find collection.anki2 database.",
        );
        setLoading(false);
        return;
      }

      const dbBuffer = await dbFile.async("uint8array");

      // Initialize sql.js with WASM
      const SQL = await initSqlJs({
        locateFile: () => "/sql-wasm.wasm",
      });

      const db = new SQL.Database(dbBuffer);

      // Query notes table
      const result = db.exec("SELECT flds, tags FROM notes");
      if (!result.length || !result[0].values.length) {
        setError("No cards found in this Anki deck.");
        db.close();
        setLoading(false);
        return;
      }

      const parsed: AnkiCard[] = [];
      for (const row of result[0].values) {
        const flds = String(row[0]);
        const tagsStr = String(row[1] || "");

        // Fields are separated by \x1f
        const fields = flds.split("\x1f");
        const front = stripHtml(fields[0] || "");
        const back = stripHtml(fields[1] || "");

        if (!front || !back) continue;

        const card: AnkiCard = { front, back };

        // Third field (if exists) becomes example_sentence
        if (fields[2]) {
          const example = stripHtml(fields[2]);
          if (example) card.example_sentence = example;
        }

        // Parse tags
        const tags = tagsStr
          .split(" ")
          .map((t) => t.trim())
          .filter(Boolean);
        if (tags.length) card.tags = tags;

        parsed.push(card);
      }

      db.close();

      if (parsed.length === 0) {
        setError("No valid cards could be extracted from this file.");
        setLoading(false);
        return;
      }

      setCards(parsed);
    } catch (err) {
      console.error("Anki import error:", err);
      setError(
        "Failed to read .apkg file. Make sure it is a valid Anki export.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(cards);
      setSuccess(true);
      setTimeout(() => {
        setCards([]);
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCards([]);
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-xl rounded-2xl border border-white/10",
          "bg-[#0d2137] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Import Anki Deck</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info */}
        <div className="rounded-xl bg-white/5 border border-white/5 p-4">
          <p className="text-sm text-white/60">
            Upload an Anki <code className="text-teal-300/80">.apkg</code> file.
            Cards will be imported as text only — media files (audio/images) are
            not supported.
          </p>
        </div>

        {/* File picker */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".apkg"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className={cn(
              "w-full rounded-xl border-2 border-dashed border-white/10 py-8",
              "flex flex-col items-center gap-2 transition",
              "hover:border-teal-400/30 hover:bg-teal-500/5",
              loading && "opacity-50 cursor-wait",
            )}
          >
            {loading ? (
              <>
                <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                <span className="text-sm text-white/50">
                  Reading Anki database...
                </span>
              </>
            ) : (
              <>
                <FileArchive className="h-8 w-8 text-white/30" />
                <span className="text-sm text-white/50">
                  Click to select an .apkg file
                </span>
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-400/20 p-3">
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-teal-500/10 border border-teal-400/20 p-3">
            <Check className="h-5 w-5 text-teal-400" />
            <p className="text-sm text-teal-300">
              {cards.length} cards imported successfully!
            </p>
          </div>
        )}

        {/* Preview table */}
        {cards.length > 0 && !success && (
          <>
            <p className="text-sm text-white/60">
              Preview ({Math.min(10, cards.length)} of {cards.length} cards):
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-3 py-2 text-white/50 font-medium">
                      Front
                    </th>
                    <th className="text-left px-3 py-2 text-white/50 font-medium">
                      Back
                    </th>
                    <th className="text-left px-3 py-2 text-white/50 font-medium">
                      Tags
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cards.slice(0, 10).map((card, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-3 py-2 text-white max-w-[200px] truncate">
                        {card.front}
                      </td>
                      <td className="px-3 py-2 text-white/70 max-w-[200px] truncate">
                        {card.back}
                      </td>
                      <td className="px-3 py-2 text-white/50 text-xs">
                        {card.tags?.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className={cn(
                "w-full rounded-xl py-3 font-medium text-[#0a1628] transition",
                "bg-teal-400 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-lg shadow-teal-500/25",
              )}
            >
              {importing
                ? "Importing..."
                : `Import ${cards.length} card${cards.length !== 1 ? "s" : ""}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
