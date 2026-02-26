// ============================================================================
// Types for the Song Learning feature
// ============================================================================

/** A song in the catalogue */
export interface Song {
  id: string;
  title: string;
  artist: string;
  language_code: string;
  youtube_video_id: string;
  duration_seconds: number | null;
  difficulty_band: "beginner" | "intermediate" | "advanced";
  created_at: string;
}

/** A single timestamped lyric line */
export interface SongLyricLine {
  id: string;
  song_id: string;
  line_index: number;
  text: string;
  start_time_ms: number;
  end_time_ms: number | null;
}

/** A pre-processed word entry for a song */
export interface SongWord {
  id: string;
  song_id: string;
  lemma: string;
  raw_word: string;
  line_index: number;
  word_index_in_line: number;
}

/** A user's play-through record for a song */
export interface UserSongHistory {
  id: string;
  user_id: string;
  song_id: string;
  played_at: string;
  completion_percentage: number;
  new_words_encountered: number;
}

/** A song recommendation returned by the scoring algorithm */
export interface SongRecommendation extends Song {
  total_unique_lemmas: number;
  known_lemma_count: number;
  known_ratio: number;
  distance_from_target: number;
}

/** A single token within a displayed lyric line */
export interface LyricToken {
  token: string;
  lemma: string;
  isKnown: boolean;
}

/** A fully processed lyric line ready for display */
export interface LyricDisplayLine {
  line_index: number;
  text: string;
  start_time_ms: number;
  end_time_ms: number | null;
  tokens: LyricToken[];
}

/** Shape used when inserting parsed lyrics (before DB id is assigned) */
export interface ParsedLyricLine {
  text: string;
  start_time_ms: number;
  end_time_ms: number | null;
  line_index: number;
}

/** Shape used when inserting parsed words (before DB id is assigned) */
export interface ParsedSongWord {
  lemma: string;
  raw_word: string;
  line_index: number;
  word_index_in_line: number;
}

/** Result from the lyrics processing utility */
export interface ProcessedLyrics {
  lines: ParsedLyricLine[];
  words: ParsedSongWord[];
}

/** Song seed data shape (for the seed script) */
export interface SongSeedData {
  title: string;
  artist: string;
  language_code: string;
  youtube_video_id: string;
  duration_seconds?: number;
  difficulty_band?: "beginner" | "intermediate" | "advanced";
  lrc_lyrics: string; // LRC‑formatted lyrics
}
