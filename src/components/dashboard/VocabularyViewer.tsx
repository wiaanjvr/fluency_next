"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserWord } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  List,
  Network,
  Grid,
  Loader2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { VocabularyListView } from "./VocabularyListView";
import { VocabularyNetworkView } from "./VocabularyNetworkView";
import { VocabularyCardView } from "./VocabularyCardView";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "network" | "cards";

interface VocabularyViewerProps {
  userId: string;
  language: string;
}

export function VocabularyViewer({ userId, language }: VocabularyViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [words, setWords] = useState<UserWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const supabase = createClient();

  useEffect(() => {
    const fetchVocabulary = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_words")
          .select("*")
          .eq("user_id", userId)
          .eq("language", language)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setWords(data || []);
      } catch (error) {
        console.error("Error fetching vocabulary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVocabulary();
  }, [userId, language, supabase]);

  // Filter and search words
  const filteredWords = useMemo(() => {
    return words.filter((word) => {
      const matchesSearch =
        searchQuery === "" ||
        word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.lemma.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || word.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [words, searchQuery, filterStatus]);

  const viewButtons = [
    { mode: "list" as ViewMode, icon: List, label: "List" },
    { mode: "network" as ViewMode, icon: Network, label: "Network" },
    { mode: "cards" as ViewMode, icon: Grid, label: "Cards" },
  ];

  if (loading) {
    return (
      <Card className="w-full p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your vocabulary...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Vocabulary</h2>
          <p className="text-sm text-muted-foreground">
            {filteredWords.length} of {words.length} words
          </p>
        </div>

        {/* View mode selector */}
        <div className="flex gap-2">
          {viewButtons.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(mode)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Search and filter controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vocabulary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Filter by status */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="learning">Learning</option>
              <option value="known">Known</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>
      </Card>

      {/* View content */}
      <div className="min-h-[400px]">
        {viewMode === "list" && (
          <VocabularyListView words={filteredWords} language={language} />
        )}
        {viewMode === "network" && (
          <VocabularyNetworkView words={filteredWords} language={language} />
        )}
        {viewMode === "cards" && (
          <VocabularyCardView words={filteredWords} language={language} />
        )}
      </div>
    </div>
  );
}
