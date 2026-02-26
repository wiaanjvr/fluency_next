"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  AddCardModal,
  CSVImportModal,
  AnkiImportModal,
  EditDeckModal,
} from "@/components/flashcards";
import {
  ArrowLeft,
  Plus,
  Upload,
  FileArchive,
  Play,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Deck,
  Flashcard,
  FlashcardLanguage,
  CardSchedule,
  CardState,
} from "@/types/flashcards";
import "@/styles/ocean-theme.css";

// ============================================================================
// State badge component
// ============================================================================
function StateBadge({ state }: { state: CardState }) {
  const config: Record<CardState, { bg: string; text: string; label: string }> =
    {
      new: { bg: "bg-white/10", text: "text-white/60", label: "New" },
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
    </span>
  );
}

// ============================================================================
// Types
// ============================================================================
type Tab = "all" | "due" | "new" | "learning" | "review";

interface CardWithSchedule extends Flashcard {
  schedule?: CardSchedule;
}

// ============================================================================
// DeckDetailContent
// ============================================================================
function DeckDetailContent({
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
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const supabase = createClient();
  const { ambientView, setAmbientView } = useAmbientPlayer();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [showAddCard, setShowAddCard] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [showAnki, setShowAnki] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showEditDeck, setShowEditDeck] = useState(false);

  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDeckData = useCallback(async () => {
    // Fetch deck
    const { data: deckData } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .eq("user_id", userId)
      .single();

    if (!deckData) {
      router.replace("/propel/flashcards");
      return;
    }
    setDeck(deckData as Deck);

    // Fetch cards + schedules
    const { data: flashcardsData } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const cardList = (flashcardsData || []) as Flashcard[];

    // Fetch schedules for these cards
    const cardIds = cardList.map((c) => c.id);
    const { data: schedulesData } = cardIds.length
      ? await supabase
          .from("card_schedules")
          .select("*")
          .eq("user_id", userId)
          .in("card_id", cardIds)
      : { data: [] };

    const scheduleMap = new Map(
      ((schedulesData || []) as CardSchedule[]).map((s) => [s.card_id, s]),
    );

    setCards(
      cardList.map((c) => ({
        ...c,
        schedule: scheduleMap.get(c.id),
      })),
    );
    setLoading(false);
  }, [supabase, deckId, userId, router]);

  useEffect(() => {
    fetchDeckData();
  }, [fetchDeckData]);

  // Add or edit single card
  const handleAddCard = async (data: {
    front: string;
    back: string;
    example_sentence?: string;
    example_translation?: string;
    word_class?: string;
    grammar_notes?: string;
    tags?: string[];
  }) => {
    if (editingCard) {
      // Update existing card
      await supabase
        .from("flashcards")
        .update({
          front: data.front,
          back: data.back,
          example_sentence: data.example_sentence || null,
          example_translation: data.example_translation || null,
          word_class: data.word_class || null,
          grammar_notes: data.grammar_notes || null,
          tags: data.tags || null,
        })
        .eq("id", editingCard.id)
        .eq("user_id", userId);
      setEditingCard(null);
    } else {
      // Insert new card
      const { data: card } = await supabase
        .from("flashcards")
        .insert({
          deck_id: deckId,
          user_id: userId,
          front: data.front,
          back: data.back,
          example_sentence: data.example_sentence || null,
          example_translation: data.example_translation || null,
          word_class: data.word_class || null,
          grammar_notes: data.grammar_notes || null,
          tags: data.tags || null,
          source: "manual",
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

        // Fix #19: Also create a user_words entry so the KG can link this card
        // to the unified vocabulary system. Without this, session-end KG sync
        // silently does nothing for manually-created cards.
        if (deck) {
          await supabase.from("user_words").upsert(
            {
              user_id: userId,
              word: data.front.toLowerCase(),
              lemma: data.front.toLowerCase(),
              language: deck.language,
              status: "new",
            },
            { onConflict: "user_id,word,language", ignoreDuplicates: true },
          );
        }
      }
    }
    await fetchDeckData();
  };

  // Edit/Delete deck
  const handleEditDeck = async (data: {
    name: string;
    language: FlashcardLanguage;
    description: string;
    new_per_day: number;
    review_per_day: number;
  }) => {
    await supabase
      .from("decks")
      .update({
        name: data.name,
        language: data.language,
        description: data.description || null,
        new_per_day: data.new_per_day,
        review_per_day: data.review_per_day,
      })
      .eq("id", deckId)
      .eq("user_id", userId);
    setShowEditDeck(false);
    await fetchDeckData();
  };

  const handleDeleteDeck = async () => {
    const { data: deckCards } = await supabase
      .from("flashcards")
      .select("id")
      .eq("deck_id", deckId);
    if (deckCards?.length) {
      const cardIds = deckCards.map((c) => c.id);
      await supabase.from("card_schedules").delete().in("card_id", cardIds);
      await supabase.from("review_log").delete().eq("deck_id", deckId);
    }
    await supabase.from("flashcards").delete().eq("deck_id", deckId);
    await supabase.from("decks").delete().eq("id", deckId);
    router.replace("/propel/flashcards");
  };

  // CSV import
  const handleCSVImport = async (
    rows: {
      front: string;
      back: string;
      example_sentence?: string;
      example_translation?: string;
      word_class?: string;
      grammar_notes?: string;
    }[],
  ) => {
    const flashcardRows = rows.map((r) => ({
      deck_id: deckId,
      user_id: userId,
      front: r.front,
      back: r.back,
      example_sentence: r.example_sentence || null,
      example_translation: r.example_translation || null,
      word_class: r.word_class || null,
      grammar_notes: r.grammar_notes || null,
      source: "csv",
    }));

    const { data: inserted } = await supabase
      .from("flashcards")
      .insert(flashcardRows)
      .select("id");

    if (inserted) {
      const scheduleRows = inserted.map((c) => ({
        user_id: userId,
        card_id: c.id,
        state: "new",
        due: new Date().toISOString(),
      }));
      await supabase.from("card_schedules").insert(scheduleRows);
    }
    await fetchDeckData();
  };

  // Anki import
  const handleAnkiImport = async (
    ankiCards: {
      front: string;
      back: string;
      example_sentence?: string;
      tags?: string[];
    }[],
  ) => {
    const flashcardRows = ankiCards.map((c) => ({
      deck_id: deckId,
      user_id: userId,
      front: c.front,
      back: c.back,
      example_sentence: c.example_sentence || null,
      tags: c.tags || null,
      source: "anki",
    }));

    const { data: inserted } = await supabase
      .from("flashcards")
      .insert(flashcardRows)
      .select("id");

    if (inserted) {
      const scheduleRows = inserted.map((c) => ({
        user_id: userId,
        card_id: c.id,
        state: "new",
        due: new Date().toISOString(),
      }));
      await supabase.from("card_schedules").insert(scheduleRows);
    }
    await fetchDeckData();
  };

  // Delete card
  const handleDeleteCard = async (cardId: string) => {
    await supabase.from("card_schedules").delete().eq("card_id", cardId);
    await supabase.from("flashcards").delete().eq("id", cardId);
    await fetchDeckData();
  };

  // Filter cards by tab and search
  const filteredCards = useMemo(() => {
    let result = cards;
    const now = new Date();

    switch (tab) {
      case "due":
        result = result.filter(
          (c) => c.schedule && new Date(c.schedule.due) <= now,
        );
        break;
      case "new":
        result = result.filter((c) => c.schedule?.state === "new");
        break;
      case "learning":
        result = result.filter(
          (c) =>
            c.schedule?.state === "learning" ||
            c.schedule?.state === "relearning",
        );
        break;
      case "review":
        result = result.filter((c) => c.schedule?.state === "review");
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q),
      );
    }

    return result;
  }, [cards, tab, search]);

  const handleNavigation = useCallback(
    (href: string) => {
      setIsNavigating(true);
      router.push(href);
    },
    [router],
  );

  if (isNavigating) return <LoadingScreen />;

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All Cards" },
    { key: "due", label: "Due" },
    { key: "new", label: "New" },
    { key: "learning", label: "Learning" },
    { key: "review", label: "Review" },
  ];

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />
      <AppNav
        streak={streak}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />
      <ContextualNav />
      <MobileBottomNav wordsEncountered={wordsEncountered} />

      <div className="relative z-10 min-h-screen pt-28 pb-24 px-6 md:pl-[370px]">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
            </div>
          ) : deck ? (
            <>
              {/* Back button + title */}
              <div className="mb-8">
                <Link
                  href="/propel/flashcards"
                  className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Decks
                </Link>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1
                      className="font-display text-3xl md:text-4xl font-bold tracking-tight"
                      style={{ color: "var(--sand)" }}
                    >
                      {deck.name}
                    </h1>
                    <p className="text-white/50 text-sm mt-1">
                      {deck.card_count} card{deck.card_count !== 1 ? "s" : ""} ·{" "}
                      {deck.language.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowEditDeck(true)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl py-2.5 px-4",
                        "border border-white/10 text-white/60 hover:text-white hover:border-white/20",
                        "text-sm font-medium transition",
                      )}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <Link
                      href={`/propel/flashcards/${deckId}/study`}
                      className={cn(
                        "flex items-center gap-2 rounded-xl py-2.5 px-5",
                        "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium text-sm",
                        "transition shadow-lg shadow-teal-500/20",
                      )}
                    >
                      <Play className="h-4 w-4" />
                      Study Now
                    </Link>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setShowAddCard(true)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl py-2 px-4",
                    "border border-white/10 text-white/70 hover:text-white hover:border-white/20",
                    "text-sm transition",
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Add Card
                </button>
                <button
                  onClick={() => setShowCSV(true)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl py-2 px-4",
                    "border border-white/10 text-white/70 hover:text-white hover:border-white/20",
                    "text-sm transition",
                  )}
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </button>
                <button
                  onClick={() => setShowAnki(true)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl py-2 px-4",
                    "border border-white/10 text-white/70 hover:text-white hover:border-white/20",
                    "text-sm transition",
                  )}
                >
                  <FileArchive className="h-4 w-4" />
                  Import Anki
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap",
                      tab === t.key
                        ? "bg-teal-500/15 text-teal-300 border border-teal-400/30"
                        : "text-white/40 hover:text-white/60 border border-transparent",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cards..."
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5",
                    "text-white placeholder:text-white/30 text-sm",
                    "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
                    "transition",
                  )}
                />
              </div>

              {/* Card table */}
              {filteredCards.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/30">
                    {cards.length === 0
                      ? "No cards yet. Add some!"
                      : "No cards match your filter."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="text-left px-4 py-3 text-white/50 font-medium">
                          Front
                        </th>
                        <th className="text-left px-4 py-3 text-white/50 font-medium">
                          Back
                        </th>
                        <th className="text-left px-4 py-3 text-white/50 font-medium hidden sm:table-cell">
                          State
                        </th>
                        <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">
                          Due
                        </th>
                        <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">
                          Reps
                        </th>
                        <th className="text-right px-4 py-3 text-white/50 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCards.map((card) => (
                        <tr
                          key={card.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition"
                        >
                          <td className="px-4 py-3 text-white max-w-[200px] truncate">
                            {card.front}
                          </td>
                          <td className="px-4 py-3 text-white/70 max-w-[200px] truncate">
                            {card.back}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <StateBadge
                              state={
                                (card.schedule?.state as CardState) || "new"
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs hidden md:table-cell">
                            {card.schedule
                              ? new Date(card.schedule.due).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs hidden md:table-cell">
                            {card.schedule?.reps ?? 0}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingCard(card);
                                  setShowAddCard(true);
                                }}
                                className="p-1.5 rounded-lg text-white/30 hover:text-teal-400 hover:bg-teal-500/10 transition"
                                title="Edit card"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Delete card"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <AddCardModal
        open={showAddCard}
        onClose={() => {
          setShowAddCard(false);
          setEditingCard(null);
        }}
        onSubmit={handleAddCard}
        editCard={editingCard}
      />
      <CSVImportModal
        open={showCSV}
        onClose={() => setShowCSV(false)}
        onImport={handleCSVImport}
      />
      <AnkiImportModal
        open={showAnki}
        onClose={() => setShowAnki(false)}
        onImport={handleAnkiImport}
      />
      <EditDeckModal
        open={showEditDeck}
        deck={deck}
        onClose={() => setShowEditDeck(false)}
        onSave={handleEditDeck}
        onDelete={handleDeleteDeck}
      />
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function DeckDetailPage() {
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
      <DeckDetailContent
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
