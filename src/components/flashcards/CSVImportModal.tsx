"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface CSVRow {
  front: string;
  back: string;
  example_sentence?: string;
  example_translation?: string;
  word_class?: string;
  grammar_notes?: string;
}

interface CSVImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: CSVRow[]) => Promise<void>;
}

export function CSVImportModal({
  open,
  onClose,
  onImport,
}: CSVImportModalProps) {
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data as Record<string, string>[];

        // Validate required columns
        if (parsed.length === 0) {
          setError("CSV file is empty.");
          return;
        }
        const firstRow = parsed[0];
        if (!("front" in firstRow) || !("back" in firstRow)) {
          setError(
            'CSV must have at least "front" and "back" columns. Found: ' +
              Object.keys(firstRow).join(", "),
          );
          return;
        }

        const validRows: CSVRow[] = parsed
          .filter((r) => r.front?.trim() && r.back?.trim())
          .map((r) => ({
            front: r.front.trim(),
            back: r.back.trim(),
            example_sentence: r.example_sentence?.trim() || undefined,
            example_translation: r.example_translation?.trim() || undefined,
            word_class: r.word_class?.trim() || undefined,
            grammar_notes: r.grammar_notes?.trim() || undefined,
          }));

        if (validRows.length === 0) {
          setError("No valid rows found (each row needs front + back).");
          return;
        }

        setRows(validRows);
      },
      error: (err) => {
        setError(`Parse error: ${err.message}`);
      },
    });
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(rows);
      setSuccess(true);
      setTimeout(() => {
        setRows([]);
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
    setRows([]);
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
          <h2 className="text-xl font-semibold text-white">Import CSV</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format info */}
        <div className="rounded-xl bg-white/5 border border-white/5 p-4">
          <p className="text-sm text-white/60 mb-2">Expected CSV format:</p>
          <code className="block text-xs text-teal-300/80 bg-black/30 rounded-lg p-3 overflow-x-auto">
            front,back,example_sentence,example_translation,word_class,grammar_notes
          </code>
          <p className="text-xs text-white/40 mt-2">
            Only <span className="text-white/60">front</span> and{" "}
            <span className="text-white/60">back</span> are required.
          </p>
        </div>

        {/* File picker */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "w-full rounded-xl border-2 border-dashed border-white/10 py-8",
              "flex flex-col items-center gap-2 transition",
              "hover:border-teal-400/30 hover:bg-teal-500/5",
            )}
          >
            <Upload className="h-8 w-8 text-white/30" />
            <span className="text-sm text-white/50">
              Click to select a .csv file
            </span>
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
              {rows.length} cards imported successfully!
            </p>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && !success && (
          <>
            <p className="text-sm text-white/60">
              Preview ({Math.min(5, rows.length)} of {rows.length} cards):
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
                      Class
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-3 py-2 text-white">{row.front}</td>
                      <td className="px-3 py-2 text-white/70">{row.back}</td>
                      <td className="px-3 py-2 text-white/50">
                        {row.word_class || "—"}
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
                : `Import ${rows.length} card${rows.length !== 1 ? "s" : ""}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
