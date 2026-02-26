// ============================================================================
// scripts/seedSongs.ts
//
// Seed script that reads a JSON file of songs (with LRC lyrics and YouTube IDs)
// and inserts them into the database using the processLyrics utility.
//
// Usage:
//   npx tsx scripts/seedSongs.ts <path-to-songs.json>
//
// JSON format:
// [
//   {
//     "title": "99 Luftballons",
//     "artist": "Nena",
//     "language_code": "de",
//     "youtube_video_id": "La4Dcd1aUcE",
//     "duration_seconds": 235,
//     "difficulty_band": "intermediate",
//     "lrc_lyrics": "[00:12.50] Hast du etwas Zeit für mich\n[00:16.30] Dann singe ich ein Lied für dich\n..."
//   }
// ]
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { processLyrics } from "../src/lib/songs/processLyrics";
import type { SongSeedData } from "../src/types/songs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.\n" +
      "Make sure your .env or .env.local file is loaded.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: npx tsx scripts/seedSongs.ts <path-to-songs.json>");
    process.exit(1);
  }

  const absolutePath = resolve(jsonPath);
  console.log(`Reading songs from: ${absolutePath}`);

  let songsData: SongSeedData[];
  try {
    const raw = readFileSync(absolutePath, "utf-8");
    songsData = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read/parse JSON file:", err);
    process.exit(1);
  }

  if (!Array.isArray(songsData) || songsData.length === 0) {
    console.error("JSON file must contain a non-empty array of songs.");
    process.exit(1);
  }

  console.log(`Found ${songsData.length} song(s) to seed.\n`);

  let successCount = 0;

  for (const songData of songsData) {
    try {
      console.log(`Processing: "${songData.title}" by ${songData.artist}...`);

      // 1. Insert song metadata
      const { data: song, error: songError } = await supabase
        .from("songs")
        .insert({
          title: songData.title,
          artist: songData.artist,
          language_code: songData.language_code || "de",
          youtube_video_id: songData.youtube_video_id,
          duration_seconds: songData.duration_seconds ?? null,
          difficulty_band: songData.difficulty_band || "intermediate",
        })
        .select("id")
        .single();

      if (songError || !song) {
        console.error(`  ✗ Failed to insert song: ${songError?.message}`);
        continue;
      }

      const songId = song.id;

      // 2. Process LRC lyrics
      const { lines, words } = processLyrics(songData.lrc_lyrics);

      if (lines.length === 0) {
        console.warn(`  ⚠ No valid lyric lines parsed for "${songData.title}"`);
      }

      // 3. Insert lyric lines
      if (lines.length > 0) {
        const lyricsToInsert = lines.map((line) => ({
          song_id: songId,
          line_index: line.line_index,
          text: line.text,
          start_time_ms: line.start_time_ms,
          end_time_ms: line.end_time_ms,
        }));

        const { error: lyricsError } = await supabase
          .from("song_lyrics_lines")
          .insert(lyricsToInsert);

        if (lyricsError) {
          console.error(`  ✗ Failed to insert lyrics: ${lyricsError.message}`);
          continue;
        }
      }

      // 4. Insert song words
      if (words.length > 0) {
        const wordsToInsert = words.map((w) => ({
          song_id: songId,
          lemma: w.lemma,
          raw_word: w.raw_word,
          line_index: w.line_index,
          word_index_in_line: w.word_index_in_line,
        }));

        const { error: wordsError } = await supabase
          .from("song_words")
          .insert(wordsToInsert);

        if (wordsError) {
          console.error(
            `  ✗ Failed to insert song words: ${wordsError.message}`,
          );
          continue;
        }
      }

      console.log(`  ✓ Inserted: ${lines.length} lines, ${words.length} words`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Unexpected error for "${songData.title}":`, err);
    }
  }

  console.log(
    `\nDone. ${successCount}/${songsData.length} songs seeded successfully.`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
