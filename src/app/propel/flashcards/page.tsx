"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import {
  NewDeckModal,
  EditDeckModal,
  DeckCard,
  FlashcardOnboarding,
  useFlashcardOnboarding,
} from "@/components/flashcards";
import { Plus, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deck, DeckStats, FlashcardLanguage } from "@/types/flashcards";
import "@/styles/ocean-theme.css";

// ============================================================================
// FlashcardsContent
// ============================================================================
function FlashcardsContent({
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckStats, setDeckStats] = useState<Record<string, DeckStats>>({});
  const [loading, setLoading] = useState(true);
  const { ambientView, setAmbientView } = useAmbientPlayer();
  const showOnboarding = useFlashcardOnboarding();

  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDecks = useCallback(async () => {
    const { data } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const deckList = (data || []) as Deck[];
    setDecks(deckList);

    // Fetch stats for each deck
    const statsMap: Record<string, DeckStats> = {};
    for (const deck of deckList) {
      const { data: schedules } = await supabase
        .from("card_schedules")
        .select("state, due")
        .eq("user_id", userId)
        .in(
          "card_id",
          // Subquery: get card IDs for this deck
          (
            await supabase
              .from("flashcards")
              .select("id")
              .eq("deck_id", deck.id)
          ).data?.map((c) => c.id) || [],
        );

      const now = new Date();
      const newCount = schedules?.filter((s) => s.state === "new").length || 0;
      const learningCount =
        schedules?.filter(
          (s) => s.state === "learning" || s.state === "relearning",
        ).length || 0;
      const reviewCount =
        schedules?.filter((s) => s.state === "review").length || 0;
      const dueCount =
        schedules?.filter((s) => new Date(s.due) <= now).length || 0;

      statsMap[deck.id] = { newCount, learningCount, reviewCount, dueCount };
    }
    setDeckStats(statsMap);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const handleCreateDeck = async (data: {
    name: string;
    language: FlashcardLanguage;
    description: string;
    new_per_day: number;
    review_per_day: number;
  }) => {
    await supabase.from("decks").insert({
      user_id: userId,
      name: data.name,
      language: data.language,
      description: data.description || null,
      new_per_day: data.new_per_day,
      review_per_day: data.review_per_day,
    });
    await fetchDecks();
  };

  const handleEditDeck = async (data: {
    name: string;
    language: FlashcardLanguage;
    description: string;
    new_per_day: number;
    review_per_day: number;
  }) => {
    if (!editingDeck) return;
    await supabase
      .from("decks")
      .update({
        name: data.name,
        language: data.language,
        description: data.description || null,
        new_per_day: data.new_per_day,
        review_per_day: data.review_per_day,
      })
      .eq("id", editingDeck.id)
      .eq("user_id", userId);
    setEditingDeck(null);
    await fetchDecks();
  };

  const handleDeleteDeck = async () => {
    if (!editingDeck) return;
    // Delete schedules, cards, then deck (cascade handles most, but be explicit)
    const { data: cards } = await supabase
      .from("flashcards")
      .select("id")
      .eq("deck_id", editingDeck.id);
    if (cards?.length) {
      const cardIds = cards.map((c) => c.id);
      await supabase.from("card_schedules").delete().in("card_id", cardIds);
      await supabase.from("review_log").delete().eq("deck_id", editingDeck.id);
    }
    await supabase.from("flashcards").delete().eq("deck_id", editingDeck.id);
    await supabase.from("decks").delete().eq("id", editingDeck.id);
    setEditingDeck(null);
    await fetchDecks();
  };

  const handleNavigation = useCallback(
    (href: string) => {
      setIsNavigating(true);
      router.push(href);
    },
    [router],
  );

  if (isNavigating) {
    return <LoadingScreen />;
  }

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />
      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel/flashcards"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      <div className="relative z-10 min-h-screen pt-28 pb-24 px-6 md:pl-[370px]">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-teal-400" />
                </div>
                <h1
                  className="font-display text-4xl md:text-5xl font-bold tracking-tight"
                  style={{ color: "var(--sand)" }}
                >
                  Flashcards
                </h1>
              </div>
              <p
                className="font-body text-lg"
                style={{ color: "var(--seafoam)", opacity: 0.75 }}
              >
                Your decks. Your pace. Your depth.
              </p>
              <div
                className="h-px w-16 mt-2"
                style={{
                  background:
                    "linear-gradient(90deg, var(--turquoise) 0%, transparent 100%)",
                }}
              />
            </div>

            <button
              onClick={() => setShowNewDeck(true)}
              className={cn(
                "flex items-center gap-2 rounded-xl py-2.5 px-5",
                "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium text-sm",
                "transition shadow-lg shadow-teal-500/20",
              )}
            >
              <Plus className="h-4 w-4" />
              New Deck
            </button>
          </div>

          {/* Deck Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Layers className="h-16 w-16 text-white/10 mx-auto" />
              <p className="text-white/40 text-lg">No decks yet</p>
              <p className="text-white/25 text-sm">
                Create your first deck to start reviewing flashcards.
              </p>
              <button
                onClick={() => setShowNewDeck(true)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl py-2.5 px-5 mt-2",
                  "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium text-sm",
                  "transition shadow-lg shadow-teal-500/20",
                )}
              >
                <Plus className="h-4 w-4" />
                Create Deck
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  stats={
                    deckStats[deck.id] || {
                      newCount: 0,
                      learningCount: 0,
                      reviewCount: 0,
                      dueCount: 0,
                    }
                  }
                  onEdit={(d) => setEditingDeck(d)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NewDeckModal
        open={showNewDeck}
        onClose={() => setShowNewDeck(false)}
        onSubmit={handleCreateDeck}
      />

      <EditDeckModal
        open={!!editingDeck}
        deck={editingDeck}
        onClose={() => setEditingDeck(null)}
        onSave={handleEditDeck}
        onDelete={handleDeleteDeck}
      />

      {showOnboarding && decks.length === 0 && (
        <FlashcardOnboarding
          onDismiss={() => {}}
          onCreateDeck={() => setShowNewDeck(true)}
        />
      )}
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function FlashcardsPage() {
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
        .eq("user_id", user.id);

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
      <FlashcardsContent
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
