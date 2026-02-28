// ============================================================================
// Import / Export library — .apkg, .colpkg, .csv, .txt support
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import type { Flashcard, CardSchedule, Deck } from "@/types/flashcards";
import type { NoteType, CardMedia } from "@/types/card-editor";
import type {
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  DuplicateMode,
  CSVPreviewRow,
  CSVFieldMapping,
} from "@/types/sync-tags-import";
import { ensureTagsExist } from "@/lib/tags";

// ── Helpers ────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function sanitizeHtml(html: string): string {
  // Allow basic HTML tags but strip script/style
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
}

async function computeChecksum(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data.buffer as ArrayBuffer,
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── CSV Import ─────────────────────────────────────────────────────────────

/** Parse a CSV/TXT file and return preview rows + detected columns */
export async function parseCSVPreview(
  file: File,
  delimiter?: string,
): Promise<{ columns: string[]; rows: CSVPreviewRow[]; totalRows: number }> {
  const Papa = (await import("papaparse")).default;

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: delimiter || undefined,
      skipEmptyLines: true,
      preview: 20,
      complete: (result) => {
        if (result.errors.length > 0 && result.data.length === 0) {
          reject(new Error(result.errors[0].message));
          return;
        }
        const rows = result.data as CSVPreviewRow[];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        resolve({ columns, rows, totalRows: result.data.length });
      },
      error: (err: Error) => reject(err),
    });
  });
}

/** Full CSV import with field mapping and duplicate handling */
export async function importCSV(
  file: File,
  userId: string,
  deckId: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const Papa = (await import("papaparse")).default;
  const supabase = createClient();

  const result: ImportResult = {
    success: false,
    cardsImported: 0,
    cardsSkipped: 0,
    cardsUpdated: 0,
    mediaImported: 0,
    errors: [],
    warnings: [],
  };

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      delimiter: options.delimiter || undefined,
      skipEmptyLines: true,
      complete: async (parseResult) => {
        const rows = parseResult.data as Record<string, string>[];
        const mapping = options.fieldMapping ?? {};

        // Collect all tags for normalisation
        const allTags = new Set<string>();

        for (const row of rows) {
          try {
            // Map CSV columns to flashcard fields
            const front = row[mapping["front"] ?? "front"]?.trim();
            const back = row[mapping["back"] ?? "back"]?.trim();

            if (!front || !back) {
              result.cardsSkipped++;
              continue;
            }

            const processField = (value: string | undefined) => {
              if (!value) return null;
              return options.allowHtml ? sanitizeHtml(value) : stripHtml(value);
            };

            // Parse tags
            const tagsRaw = row[mapping["tags"] ?? "tags"];
            const tags = tagsRaw
              ? tagsRaw.split(/[\s,;]+/).filter(Boolean)
              : [];

            // Add additional tags from options
            if (options.additionalTags) {
              tags.push(...options.additionalTags);
            }

            for (const t of tags) allTags.add(t);

            // Check for duplicates
            if (options.duplicateMode !== "create_new") {
              const { data: existing } = await supabase
                .from("flashcards")
                .select("id, front, back")
                .eq("user_id", userId)
                .eq("deck_id", deckId)
                .eq("front", options.allowHtml ? front : stripHtml(front))
                .limit(1)
                .maybeSingle();

              if (existing) {
                if (options.duplicateMode === "ignore") {
                  result.cardsSkipped++;
                  continue;
                }
                if (options.duplicateMode === "update") {
                  const { error: updateError } = await supabase
                    .from("flashcards")
                    .update({
                      back: options.allowHtml ? back : stripHtml(back),
                      example_sentence: processField(
                        row[mapping["example_sentence"] ?? "example_sentence"],
                      ),
                      example_translation: processField(
                        row[
                          mapping["example_translation"] ??
                            "example_translation"
                        ],
                      ),
                      word_class:
                        row[mapping["word_class"] ?? "word_class"] || null,
                      grammar_notes: processField(
                        row[mapping["grammar_notes"] ?? "grammar_notes"],
                      ),
                      tags: tags.length > 0 ? tags : null,
                    })
                    .eq("id", existing.id);

                  if (updateError) {
                    result.errors.push(
                      `Update failed for "${front}": ${updateError.message}`,
                    );
                  } else {
                    result.cardsUpdated++;
                  }
                  continue;
                }
              }
            }

            // Insert new card
            const { error: insertError } = await supabase
              .from("flashcards")
              .insert({
                deck_id: deckId,
                user_id: userId,
                front: options.allowHtml ? front : stripHtml(front),
                back: options.allowHtml ? back : stripHtml(back),
                example_sentence: processField(
                  row[mapping["example_sentence"] ?? "example_sentence"],
                ),
                example_translation: processField(
                  row[mapping["example_translation"] ?? "example_translation"],
                ),
                word_class: row[mapping["word_class"] ?? "word_class"] || null,
                grammar_notes: processField(
                  row[mapping["grammar_notes"] ?? "grammar_notes"],
                ),
                audio_url: row[mapping["audio_url"] ?? "audio_url"] || null,
                image_url: row[mapping["image_url"] ?? "image_url"] || null,
                tags: tags.length > 0 ? tags : null,
                source: "csv",
              });

            if (insertError) {
              result.errors.push(
                `Import failed for "${front}": ${insertError.message}`,
              );
            } else {
              result.cardsImported++;
            }
          } catch (err) {
            result.errors.push(
              `Row error: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        // Sync tags to normalised table
        if (allTags.size > 0) {
          try {
            await ensureTagsExist(userId, [...allTags]);
          } catch {
            result.warnings.push(
              "Some tags could not be synced to the tag table.",
            );
          }
        }

        result.success = result.errors.length === 0;

        // Log the import
        await supabase.from("import_export_log").insert({
          user_id: userId,
          operation: "import",
          format: options.format === "txt" ? "txt" : "csv",
          filename: file.name,
          deck_id: deckId,
          card_count: result.cardsImported + result.cardsUpdated,
          duplicate_mode: options.duplicateMode,
          status: result.success ? "completed" : "failed",
          error_message:
            result.errors.length > 0 ? result.errors.join("; ") : null,
          completed_at: new Date().toISOString(),
        });

        resolve(result);
      },
    });
  });
}

// ── APKG Import (full version with media + scheduling) ─────────────────────

export async function importApkg(
  file: File,
  userId: string,
  deckId: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const [JSZipModule, initSqlJs] = await Promise.all([
    import("jszip"),
    import("sql.js").then((m) => m.default),
  ]);
  const JSZip = JSZipModule.default;
  const supabase = createClient();

  const result: ImportResult = {
    success: false,
    cardsImported: 0,
    cardsSkipped: 0,
    cardsUpdated: 0,
    mediaImported: 0,
    errors: [],
    warnings: [],
  };

  try {
    const zip = await JSZip.loadAsync(file);

    // Find the database file (anki2 or anki21)
    const dbFile =
      zip.file("collection.anki2") || zip.file("collection.anki21");
    if (!dbFile) {
      result.errors.push("Invalid .apkg file — no collection database found.");
      return result;
    }

    const dbBuffer = await dbFile.async("uint8array");
    const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
    const db = new SQL.Database(dbBuffer);

    // Extract notes with fields and tags
    const notesResult = db.exec("SELECT id, flds, tags, mid, mod FROM notes");
    if (!notesResult.length) {
      result.errors.push("No notes found in the Anki database.");
      db.close();
      return result;
    }

    // Extract card scheduling data if requested
    let cardScheduleMap = new Map<
      number,
      {
        due: number;
        ivl: number;
        factor: number;
        reps: number;
        lapses: number;
        type: number;
      }
    >();

    if (options.importScheduling) {
      try {
        const cardsResult = db.exec(
          "SELECT nid, due, ivl, factor, reps, lapses, type FROM cards",
        );
        if (cardsResult.length) {
          for (const row of cardsResult[0].values) {
            const nid = Number(row[0]);
            if (!cardScheduleMap.has(nid)) {
              cardScheduleMap.set(nid, {
                due: Number(row[1]),
                ivl: Number(row[2]),
                factor: Number(row[3]),
                reps: Number(row[4]),
                lapses: Number(row[5]),
                type: Number(row[6]),
              });
            }
          }
        }
      } catch {
        result.warnings.push(
          "Could not read scheduling data from Anki database.",
        );
      }
    }

    // Import media files if requested
    const mediaMapping = new Map<string, string>();
    if (options.importMedia) {
      try {
        // Parse media JSON mapping
        const mediaFile = zip.file("media");
        if (mediaFile) {
          const mediaJson = JSON.parse(await mediaFile.async("string"));

          for (const [key, originalName] of Object.entries(mediaJson)) {
            const mediaZipFile = zip.file(key);
            if (!mediaZipFile) continue;

            const mediaData = await mediaZipFile.async("uint8array");
            const name = originalName as string;
            const ext = name.split(".").pop()?.toLowerCase() ?? "";

            // Determine mime type
            const mimeTypes: Record<string, string> = {
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              gif: "image/gif",
              webp: "image/webp",
              svg: "image/svg+xml",
              mp3: "audio/mpeg",
              wav: "audio/wav",
              ogg: "audio/ogg",
              mp4: "video/mp4",
              webm: "video/webm",
            };

            const mimeType = mimeTypes[ext] ?? "application/octet-stream";
            const storagePath = `${userId}/${crypto.randomUUID()}-${name}`;

            // Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
              .from("card-media")
              .upload(storagePath, mediaData, { contentType: mimeType });

            if (uploadError) {
              result.warnings.push(
                `Media upload failed for "${name}": ${uploadError.message}`,
              );
              continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from("card-media")
              .getPublicUrl(storagePath);

            mediaMapping.set(name, urlData.publicUrl);
            result.mediaImported++;

            // Record in card_media table
            await supabase.from("card_media").insert({
              user_id: userId,
              filename: name,
              mime_type: mimeType,
              storage_path: storagePath,
              file_size: mediaData.length,
              checksum: await computeChecksum(mediaData),
              sync_status: "synced",
            });
          }
        }
      } catch {
        result.warnings.push("Could not import some media files.");
      }
    }

    // Process notes
    const allTags = new Set<string>();

    for (const row of notesResult[0].values) {
      const noteId = Number(row[0]);
      const flds = String(row[1]);
      const tagsStr = String(row[2] || "");

      const fields = flds.split("\x1f");
      let front = fields[0] || "";
      let back = fields[1] || "";

      // Replace media references with uploaded URLs
      if (options.importMedia) {
        for (const [originalName, publicUrl] of mediaMapping) {
          const regex = new RegExp(
            `\\[sound:${originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`,
            "g",
          );
          front = front.replace(
            regex,
            `<audio src="${publicUrl}" controls></audio>`,
          );
          back = back.replace(
            regex,
            `<audio src="${publicUrl}" controls></audio>`,
          );

          // Image references
          const imgRegex = new RegExp(
            `<img[^>]*src=["']${originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
            "gi",
          );
          front = front.replace(imgRegex, `<img src="${publicUrl}" />`);
          back = back.replace(imgRegex, `<img src="${publicUrl}" />`);
        }
      }

      const cleanFront = options.allowHtml
        ? sanitizeHtml(front)
        : stripHtml(front);
      const cleanBack = options.allowHtml
        ? sanitizeHtml(back)
        : stripHtml(back);

      if (!cleanFront || !cleanBack) {
        result.cardsSkipped++;
        continue;
      }

      // Parse tags
      const tags = tagsStr
        .split(" ")
        .map((t) => t.trim())
        .filter(Boolean);
      if (options.additionalTags) tags.push(...options.additionalTags);
      for (const t of tags) allTags.add(t);

      // Check duplicates
      if (options.duplicateMode !== "create_new") {
        const { data: existing } = await supabase
          .from("flashcards")
          .select("id")
          .eq("user_id", userId)
          .eq("deck_id", deckId)
          .eq("front", cleanFront)
          .limit(1)
          .maybeSingle();

        if (existing) {
          if (options.duplicateMode === "ignore") {
            result.cardsSkipped++;
            continue;
          }
          if (options.duplicateMode === "update") {
            await supabase
              .from("flashcards")
              .update({
                back: cleanBack,
                example_sentence: fields[2] ? stripHtml(fields[2]) : null,
                tags: tags.length > 0 ? tags : null,
              })
              .eq("id", existing.id);
            result.cardsUpdated++;
            continue;
          }
        }
      }

      // Insert card
      const { data: card, error: insertError } = await supabase
        .from("flashcards")
        .insert({
          deck_id: deckId,
          user_id: userId,
          front: cleanFront,
          back: cleanBack,
          example_sentence: fields[2] ? stripHtml(fields[2]) : null,
          tags: tags.length > 0 ? tags : null,
          source: "anki",
        })
        .select("id")
        .single();

      if (insertError) {
        result.errors.push(`Import failed: ${insertError.message}`);
        continue;
      }

      result.cardsImported++;

      // Import scheduling if available
      if (options.importScheduling && card) {
        const schedule = cardScheduleMap.get(noteId);
        if (schedule) {
          const stateMap: Record<number, string> = {
            0: "new",
            1: "learning",
            2: "review",
            3: "relearning",
          };

          await supabase.from("card_schedules").upsert(
            {
              user_id: userId,
              card_id: card.id,
              stability: (schedule.factor / 1000) * schedule.ivl || 0,
              difficulty:
                schedule.factor > 0 ? (3000 - schedule.factor) / 1000 : 0,
              scheduled_days: schedule.ivl,
              reps: schedule.reps,
              lapses: schedule.lapses,
              state: stateMap[schedule.type] ?? "new",
              due:
                schedule.ivl > 0
                  ? new Date(Date.now() + schedule.ivl * 86400000).toISOString()
                  : new Date().toISOString(),
            },
            { onConflict: "user_id,card_id" },
          );
        }
      }
    }

    db.close();

    // Sync tags
    if (allTags.size > 0) {
      try {
        await ensureTagsExist(userId, [...allTags]);
      } catch {
        result.warnings.push("Some tags could not be synced to the tag table.");
      }
    }

    result.success = result.errors.length === 0;

    // Log
    await supabase.from("import_export_log").insert({
      user_id: userId,
      operation: "import",
      format: "apkg",
      filename: file.name,
      deck_id: deckId,
      card_count: result.cardsImported + result.cardsUpdated,
      media_count: result.mediaImported,
      duplicate_mode: options.duplicateMode,
      include_scheduling: options.importScheduling ?? false,
      include_media: options.importMedia ?? false,
      status: result.success ? "completed" : "failed",
      error_message: result.errors.length > 0 ? result.errors.join("; ") : null,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    result.errors.push(
      `APKG import error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return result;
}

// ── COLPKG Import (full collection backup) ─────────────────────────────────

export async function importColpkg(
  file: File,
  userId: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const [JSZipModule, initSqlJs] = await Promise.all([
    import("jszip"),
    import("sql.js").then((m) => m.default),
  ]);
  const JSZip = JSZipModule.default;
  const supabase = createClient();

  const result: ImportResult = {
    success: false,
    cardsImported: 0,
    cardsSkipped: 0,
    cardsUpdated: 0,
    mediaImported: 0,
    errors: [],
    warnings: [],
  };

  try {
    const zip = await JSZip.loadAsync(file);
    const dbFile =
      zip.file("collection.anki2") || zip.file("collection.anki21");

    if (!dbFile) {
      result.errors.push("Invalid .colpkg — no collection database found.");
      return result;
    }

    const dbBuffer = await dbFile.async("uint8array");
    const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
    const db = new SQL.Database(dbBuffer);

    // Import decks from the collection
    const decksResult = db.exec("SELECT decks FROM col");
    const deckMap = new Map<number, string>(); // Anki deck ID → our deck ID

    if (decksResult.length) {
      try {
        const decksJson = JSON.parse(String(decksResult[0].values[0][0]));
        for (const [ankiDeckId, deckInfo] of Object.entries(decksJson)) {
          const info = deckInfo as { name: string };
          if (info.name === "Default" && ankiDeckId === "1") continue;

          // Create deck
          const { data: deck, error } = await supabase
            .from("decks")
            .insert({
              user_id: userId,
              name: info.name,
              language: "de", // Default, user can change later
            })
            .select("id")
            .single();

          if (deck) {
            deckMap.set(Number(ankiDeckId), deck.id);
          }
          if (error) {
            result.warnings.push(
              `Could not create deck "${info.name}": ${error.message}`,
            );
          }
        }
      } catch {
        result.warnings.push("Could not parse deck structure from collection.");
      }
    }

    // Create default deck if needed
    if (deckMap.size === 0) {
      const { data: deck } = await supabase
        .from("decks")
        .insert({
          user_id: userId,
          name: `Imported ${new Date().toLocaleDateString()}`,
          language: "de",
        })
        .select("id")
        .single();
      if (deck) deckMap.set(1, deck.id);
    }

    // Get card → deck mapping
    const cardDeckMap = new Map<number, number>();
    try {
      const cardDecks = db.exec("SELECT nid, did FROM cards");
      if (cardDecks.length) {
        for (const row of cardDecks[0].values) {
          cardDeckMap.set(Number(row[0]), Number(row[1]));
        }
      }
    } catch {
      // Ignore — use default deck
    }

    // Import notes (same logic as apkg)
    const notesResult = db.exec("SELECT id, flds, tags FROM notes");
    if (notesResult.length) {
      for (const row of notesResult[0].values) {
        const noteId = Number(row[0]);
        const flds = String(row[1]);
        const tagsStr = String(row[2] || "");

        const fields = flds.split("\x1f");
        const front = stripHtml(fields[0] || "");
        const back = stripHtml(fields[1] || "");
        if (!front || !back) {
          result.cardsSkipped++;
          continue;
        }

        const tags = tagsStr.split(" ").filter(Boolean);
        const ankiDeckId = cardDeckMap.get(noteId) ?? 1;
        const targetDeckId =
          deckMap.get(ankiDeckId) ?? deckMap.values().next().value;

        if (!targetDeckId) {
          result.cardsSkipped++;
          continue;
        }

        const { error: insertError } = await supabase
          .from("flashcards")
          .insert({
            deck_id: targetDeckId,
            user_id: userId,
            front,
            back,
            example_sentence: fields[2] ? stripHtml(fields[2]) : null,
            tags: tags.length > 0 ? tags : null,
            source: "anki",
          });

        if (insertError) {
          result.errors.push(`Import failed: ${insertError.message}`);
        } else {
          result.cardsImported++;
        }
      }
    }

    db.close();
    result.success = result.errors.length === 0;

    await supabase.from("import_export_log").insert({
      user_id: userId,
      operation: "import",
      format: "colpkg" as "apkg",
      filename: file.name,
      card_count: result.cardsImported,
      status: result.success ? "completed" : "failed",
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    result.errors.push(
      `COLPKG import error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return result;
}

// ── CSV / TXT Export ───────────────────────────────────────────────────────

export async function exportCSV(
  userId: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const Papa = (await import("papaparse")).default;
  const supabase = createClient();

  // Fetch cards
  let query = supabase
    .from("flashcards")
    .select("*, decks!inner(name)")
    .eq("user_id", userId);

  if (!options.entireCollection && options.deckIds?.length) {
    query = query.in("deck_id", options.deckIds);
  }

  const { data: cards, error } = await query;
  if (error) throw new Error(`Export failed: ${error.message}`);

  // Optionally fetch scheduling data
  let scheduleMap = new Map<string, CardSchedule>();
  if (options.includeScheduling) {
    const { data: schedules } = await supabase
      .from("card_schedules")
      .select("*")
      .eq("user_id", userId);

    for (const s of schedules ?? []) {
      scheduleMap.set(s.card_id, s);
    }
  }

  // Build CSV rows
  const fields = options.fields ?? [
    "front",
    "back",
    "example_sentence",
    "example_translation",
    "word_class",
    "grammar_notes",
  ];

  const rows = (cards ?? []).map((card: any) => {
    const row: Record<string, string> = {};
    row["deck"] = card.decks?.name ?? "";

    for (const field of fields) {
      row[field] = card[field] ?? "";
    }

    if (options.includeTags) {
      row["tags"] = (card.tags ?? []).join(" ");
    }

    if (options.includeScheduling) {
      const schedule = scheduleMap.get(card.id);
      if (schedule) {
        row["state"] = schedule.state;
        row["due"] = schedule.due;
        row["reps"] = String(schedule.reps);
        row["lapses"] = String(schedule.lapses);
        row["stability"] = String(schedule.stability);
        row["difficulty"] = String(schedule.difficulty);
      }
    }

    return row;
  });

  const csv = Papa.unparse(rows, {
    delimiter: options.delimiter || ",",
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const ext = options.format === "txt" ? "txt" : "csv";
  const filename = `flashcards_export_${new Date().toISOString().slice(0, 10)}.${ext}`;

  // Log
  await supabase.from("import_export_log").insert({
    user_id: userId,
    operation: "export",
    format: options.format === "txt" ? "txt" : "csv",
    filename,
    card_count: rows.length,
    include_scheduling: options.includeScheduling,
    include_media: false,
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  return {
    success: true,
    filename,
    blob,
    cardCount: rows.length,
    mediaCount: 0,
  };
}

// ── APKG Export ────────────────────────────────────────────────────────────

export async function exportApkg(
  userId: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const [JSZipModule, initSqlJs] = await Promise.all([
    import("jszip"),
    import("sql.js").then((m) => m.default),
  ]);
  const JSZip = JSZipModule.default;
  const supabase = createClient();

  // Fetch cards + decks
  let cardsQuery = supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", userId);

  if (!options.entireCollection && options.deckIds?.length) {
    cardsQuery = cardsQuery.in("deck_id", options.deckIds);
  }

  const { data: cards, error: cardsError } = await cardsQuery;
  if (cardsError) throw new Error(`Export failed: ${cardsError.message}`);

  // Fetch scheduling if needed
  let scheduleMap = new Map<string, CardSchedule>();
  if (options.includeScheduling) {
    const { data: schedules } = await supabase
      .from("card_schedules")
      .select("*")
      .eq("user_id", userId);
    for (const s of schedules ?? []) {
      scheduleMap.set(s.card_id, s);
    }
  }

  // Build Anki-compatible SQLite database
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
  const db = new SQL.Database();

  // Create Anki schema (simplified)
  db.run(`
    CREATE TABLE col (
      id integer PRIMARY KEY,
      crt integer NOT NULL,
      mod integer NOT NULL,
      scm integer NOT NULL,
      ver integer NOT NULL,
      dty integer NOT NULL,
      usn integer NOT NULL,
      ls integer NOT NULL,
      conf text NOT NULL,
      models text NOT NULL,
      decks text NOT NULL,
      dconf text NOT NULL,
      tags text NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE notes (
      id integer PRIMARY KEY,
      guid text NOT NULL,
      mid integer NOT NULL,
      mod integer NOT NULL,
      usn integer NOT NULL,
      tags text NOT NULL,
      flds text NOT NULL,
      sfld text NOT NULL,
      csum integer NOT NULL,
      flags integer NOT NULL,
      data text NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE cards (
      id integer PRIMARY KEY,
      nid integer NOT NULL,
      did integer NOT NULL,
      ord integer NOT NULL,
      mod integer NOT NULL,
      usn integer NOT NULL,
      type integer NOT NULL,
      queue integer NOT NULL,
      due integer NOT NULL,
      ivl integer NOT NULL,
      factor integer NOT NULL,
      reps integer NOT NULL,
      lapses integer NOT NULL,
      left integer NOT NULL,
      odue integer NOT NULL,
      odid integer NOT NULL,
      flags integer NOT NULL,
      data text NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE revlog (
      id integer PRIMARY KEY,
      cid integer NOT NULL,
      usn integer NOT NULL,
      ease integer NOT NULL,
      ivl integer NOT NULL,
      lastIvl integer NOT NULL,
      factor integer NOT NULL,
      time integer NOT NULL,
      type integer NOT NULL
    );
  `);

  // Insert collection metadata
  const now = Math.floor(Date.now() / 1000);
  const basicModelId = 1000000000000;
  const defaultDeckId = 1;

  const models = JSON.stringify({
    [basicModelId]: {
      id: basicModelId,
      name: "Basic",
      type: 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: defaultDeckId,
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Front}}",
          afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
          bqfmt: "",
          bafmt: "",
        },
      ],
      flds: [
        {
          name: "Front",
          ord: 0,
          sticky: false,
          rtl: false,
          font: "Arial",
          size: 20,
          media: [],
        },
        {
          name: "Back",
          ord: 1,
          sticky: false,
          rtl: false,
          font: "Arial",
          size: 20,
          media: [],
        },
      ],
      css: ".card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }",
      latexPre: "",
      latexPost: "",
      latexsvg: false,
      req: [[0, "any", [0]]],
      tags: [],
      vers: [],
    },
  });

  const decksJson = JSON.stringify({
    [defaultDeckId]: {
      id: defaultDeckId,
      mod: now,
      name: "Default",
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      desc: "",
      dyn: 0,
      conf: 1,
      extendNew: 0,
      extendRev: 0,
    },
  });

  db.run(
    `INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, -1, 0, '{}', ?, ?, '{}', '{}')`,
    [now, now, now * 1000, models, decksJson],
  );

  // Insert notes and cards
  let noteId = 1000000000000;
  let cardId = 1000000000000;

  const mediaFiles = new Map<string, Uint8Array>();
  const mediaJson: Record<string, string> = {};
  let mediaIndex = 0;

  for (const card of cards ?? []) {
    noteId++;
    cardId++;

    const tags = (card.tags ?? []).join(" ");
    const flds = `${card.front}\x1f${card.back}`;

    // Simple checksum of sort field
    const csum = [...card.front].reduce<number>(
      (acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0,
      0,
    );

    db.run(`INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')`, [
      noteId,
      crypto.randomUUID().replace(/-/g, "").slice(0, 10),
      basicModelId,
      now,
      tags,
      flds,
      card.front,
      Math.abs(csum as number),
    ]);

    // Card scheduling
    const schedule = scheduleMap.get(card.id);
    const stateToType: Record<string, number> = {
      new: 0,
      learning: 1,
      review: 2,
      relearning: 3,
    };

    db.run(
      `INSERT INTO cards VALUES (?, ?, ?, 0, ?, -1, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, '')`,
      [
        cardId,
        noteId,
        defaultDeckId,
        now,
        schedule ? (stateToType[schedule.state] ?? 0) : 0,
        schedule ? (schedule.state === "new" ? -1 : 0) : -1,
        schedule?.scheduled_days ?? 0,
        schedule?.scheduled_days ?? 0,
        schedule ? Math.round(schedule.difficulty * 1000 + 1300) : 2500,
        schedule?.reps ?? 0,
        schedule?.lapses ?? 0,
      ],
    );

    // Collect media for export
    if (options.includeMedia) {
      // Check for audio/image URLs that are in our storage
      const urls = [card.audio_url, card.image_url].filter(Boolean);
      for (const url of urls) {
        if (!url) continue;
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const data = new Uint8Array(await resp.arrayBuffer());
            const name = url.split("/").pop() ?? `media_${mediaIndex}`;
            mediaJson[String(mediaIndex)] = name;
            mediaFiles.set(String(mediaIndex), data);
            mediaIndex++;
          }
        } catch {
          // Skip media that can't be fetched
        }
      }
    }
  }

  // Build the .apkg zip
  const zip = new JSZip();
  const dbExport = db.export();
  db.close();

  zip.file("collection.anki2", new Uint8Array(dbExport));
  zip.file("media", JSON.stringify(mediaJson));

  for (const [key, data] of mediaFiles) {
    zip.file(key, data);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `flashcards_export_${new Date().toISOString().slice(0, 10)}.apkg`;

  // Log
  await supabase.from("import_export_log").insert({
    user_id: userId,
    operation: "export",
    format: "apkg",
    filename,
    card_count: (cards ?? []).length,
    media_count: mediaFiles.size,
    include_scheduling: options.includeScheduling,
    include_media: options.includeMedia,
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  return {
    success: true,
    filename,
    blob,
    cardCount: (cards ?? []).length,
    mediaCount: mediaFiles.size,
  };
}

// ── COLPKG Export (full collection) ────────────────────────────────────────

export async function exportColpkg(
  userId: string,
  options: ExportOptions,
): Promise<ExportResult> {
  // colpkg is essentially apkg but with the entire collection
  const fullOptions: ExportOptions = {
    ...options,
    entireCollection: true,
    format: "colpkg",
  };
  const apkgResult = await exportApkg(userId, fullOptions);

  // Rename the file
  const filename = `collection_backup_${new Date().toISOString().slice(0, 10)}.colpkg`;
  return {
    ...apkgResult,
    filename,
  };
}

// ── Universal import dispatcher ────────────────────────────────────────────

export async function importFile(
  file: File,
  userId: string,
  deckId: string,
  options: ImportOptions,
): Promise<ImportResult> {
  switch (options.format) {
    case "apkg":
      return importApkg(file, userId, deckId, options);
    case "colpkg":
      return importColpkg(file, userId, options);
    case "csv":
    case "txt":
      return importCSV(file, userId, deckId, options);
    default:
      return {
        success: false,
        cardsImported: 0,
        cardsSkipped: 0,
        cardsUpdated: 0,
        mediaImported: 0,
        errors: [`Unsupported format: ${options.format}`],
        warnings: [],
      };
  }
}

// ── Universal export dispatcher ────────────────────────────────────────────

export async function exportCollection(
  userId: string,
  options: ExportOptions,
): Promise<ExportResult> {
  switch (options.format) {
    case "apkg":
      return exportApkg(userId, options);
    case "colpkg":
      return exportColpkg(userId, options);
    case "csv":
    case "txt":
      return exportCSV(userId, options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/** Trigger a file download in the browser */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
