"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground } from "@/components/ocean";
import {
  AppNav,
  ContextualNav,
  MobileBottomNav,
} from "@/components/navigation";
import LoadingScreen from "@/components/ui/LoadingScreen";
import YouTubePlayer from "@/components/songs/YouTubePlayer";
import LyricLine from "@/components/songs/LyricLine";
import WordPopover from "@/components/songs/WordPopover";
import { ArrowLeft, Music, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Song, SongLyricLine } from "@/types/songs";
import "@/styles/ocean-theme.css";

// ============================================================================
// Song Player Page — /songs/[songId]
// ============================================================================

interface SelectedWord {
  word: string;
  lemma: string;
}

function SongPlayerContent() {
  const params = useParams();
  const router = useRouter();
  const songId = params?.songId as string;

  // Data state
  const [song, setSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<SongLyricLine[]>([]);
  const [userVocab, setUserVocab] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  // Word popover state
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());

  // Completion tracking
  const [hasEnded, setHasEnded] = useState(false);
  const completionSent = useRef(false);

  // ------------------------------------------------------------------
  // Fetch song data + user vocab
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!songId) return;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch lyrics + song metadata
        const lyricsRes = await fetch(`/api/songs/${songId}/lyrics`);
        if (!lyricsRes.ok) throw new Error("Song not found");
        const lyricsData = await lyricsRes.json();

        setSong(lyricsData.song);
        setLyrics(lyricsData.lyrics ?? []);

        // Fetch user's known words
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const langCode = lyricsData.song?.language_code ?? "de";
          const { data: knownWords } = await supabase
            .from("learner_words_v2")
            .select("lemma, word")
            .eq("user_id", user.id)
            .eq("language", langCode)
            .in("status", ["known", "mastered"]);

          const vocabSet = new Set<string>();
          for (const row of knownWords ?? []) {
            const lemma = (row.lemma || row.word || "").toLowerCase().trim();
            if (lemma) vocabSet.add(lemma);
          }
          setUserVocab(vocabSet);
        }
      } catch (err) {
        console.error("Song player fetch error:", err);
        setError("Could not load this song. It may not exist.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [songId]);

  // ------------------------------------------------------------------
  // Determine the active lyric line from current playback time
  // ------------------------------------------------------------------
  useEffect(() => {
    if (lyrics.length === 0) return;

    let active = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTimeMs >= lyrics[i].start_time_ms) {
        active = i;
        break;
      }
    }
    setActiveLineIndex(active);
  }, [currentTimeMs, lyrics]);

  // ------------------------------------------------------------------
  // Time update handler from YouTube player
  // ------------------------------------------------------------------
  const handleTimeUpdate = useCallback((timeMs: number) => {
    setCurrentTimeMs(timeMs);
  }, []);

  // ------------------------------------------------------------------
  // Video ended → send completion
  // ------------------------------------------------------------------
  const handleVideoEnded = useCallback(() => {
    setHasEnded(true);
  }, []);

  // Send completion data
  useEffect(() => {
    if (!hasEnded || completionSent.current || !songId) return;
    completionSent.current = true;

    const wordsArray = Array.from(markedWords);
    fetch(`/api/songs/${songId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completion_percentage: 100,
        new_words: wordsArray,
      }),
    }).catch((err) => console.error("Completion POST error:", err));
  }, [hasEnded, songId, markedWords]);

  // ------------------------------------------------------------------
  // Word actions
  // ------------------------------------------------------------------
  const handleWordClick = useCallback((word: string, lemma: string) => {
    setSelectedWord({ word, lemma });
  }, []);

  const handleMarkAsLearning = useCallback((lemma: string) => {
    setMarkedWords((prev) => new Set(prev).add(lemma));
    setSelectedWord(null);
  }, []);

  const handleClosePopover = useCallback(() => {
    setSelectedWord(null);
  }, []);

  // ------------------------------------------------------------------
  // Manual finish (user leaves before video ends)
  // ------------------------------------------------------------------
  const handleFinish = useCallback(() => {
    if (completionSent.current || !songId) return;
    completionSent.current = true;

    const maxTime =
      lyrics.length > 0 ? lyrics[lyrics.length - 1].start_time_ms : 1;
    const pct =
      maxTime > 0
        ? Math.min(100, Math.round((currentTimeMs / maxTime) * 100))
        : 0;

    fetch(`/api/songs/${songId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completion_percentage: pct,
        new_words: Array.from(markedWords),
      }),
    })
      .catch((err) => console.error("Completion POST error:", err))
      .finally(() => router.push("/songs"));
  }, [songId, currentTimeMs, lyrics, markedWords, router]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <Music className="w-12 h-12 text-white/30 mb-4" />
        <p className="text-white/60 text-lg mb-4">
          {error || "Song not found"}
        </p>
        <Link
          href="/songs"
          className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/80 hover:bg-white/15 transition-colors text-sm"
        >
          Back to songs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleFinish}
          className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
          aria-label="Finish and go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">
            {song.title}
          </h1>
          <p className="text-sm text-white/50 truncate">{song.artist}</p>
        </div>
        {markedWords.size > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 rounded-full px-3 py-1">
            <CheckCircle className="w-3.5 h-3.5" />
            {markedWords.size} learned
          </div>
        )}
      </div>

      {/* YouTube player */}
      <YouTubePlayer
        videoId={song.youtube_video_id}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        className="aspect-video w-full rounded-xl overflow-hidden border border-white/[0.08]"
      />

      {/* Lyrics */}
      <div
        className={cn(
          "rounded-2xl border border-white/[0.07]",
          "bg-gradient-to-b from-[#0e2340]/80 to-[#091527]/90",
          "p-4 max-h-[50vh] overflow-y-auto scroll-smooth",
          "space-y-1",
        )}
      >
        {lyrics.length === 0 ? (
          <p className="text-center text-white/40 py-8">
            No synced lyrics available for this song.
          </p>
        ) : (
          lyrics.map((line, idx) => (
            <LyricLine
              key={line.id ?? idx}
              line={line}
              userVocab={userVocab}
              isActive={activeLineIndex === idx}
              onWordClick={handleWordClick}
            />
          ))
        )}
      </div>

      {/* Completion overlay */}
      {hasEnded && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-semibold text-white">Song complete!</h2>
          <p className="text-sm text-white/60">
            You encountered{" "}
            <span className="text-amber-300 font-medium">
              {markedWords.size}
            </span>{" "}
            new words during this session.
          </p>
          <Link
            href="/songs"
            className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/80 hover:bg-white/15 transition-colors text-sm font-medium"
          >
            Choose another song
          </Link>
        </div>
      )}

      {/* Word popover */}
      {selectedWord && (
        <WordPopover
          word={selectedWord.word}
          lemma={selectedWord.lemma}
          onClose={handleClosePopover}
          onMarkAsLearning={handleMarkAsLearning}
          isMarked={markedWords.has(selectedWord.lemma)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Page wrapper
// ============================================================================

export default function SongPlayerPage() {
  return (
    <ProtectedRoute>
      <OceanBackground>
        <AppNav />
        <ContextualNav />
        <MobileBottomNav />
        <main className="min-h-screen pt-20 pb-12 px-4 md:px-8">
          <SongPlayerContent />
        </main>
      </OceanBackground>
    </ProtectedRoute>
  );
}
