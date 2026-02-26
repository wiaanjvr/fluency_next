"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Search, UserPlus } from "lucide-react";
import { OceanAvatar } from "./OceanAvatar";

interface FindDiveBuddyModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (buddy: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }) => void;
}

export function FindDiveBuddyModal({
  open,
  onClose,
  onSelect,
}: FindDiveBuddyModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, current_level")
        .ilike("display_name", `%${searchTerm.trim()}%`)
        .limit(10);

      setResults(
        (data || []).map((p: any) => ({
          id: p.id,
          full_name: p.display_name || "Diver",
          avatar_url: p.avatar_url,
        })),
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl bg-[var(--deep-navy)] border border-white/[0.08] p-5 mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-teal-300 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Find a Dive Buddy
          </h3>
          <button
            onClick={onClose}
            className="text-seafoam/30 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-seafoam/25" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name..."
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] pl-9 pr-3 py-2.5 text-sm text-white/70 placeholder:text-seafoam/20 outline-none focus:border-teal-500/20"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-xl bg-teal-500/15 text-teal-300 px-4 py-2.5 text-sm hover:bg-teal-500/25 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] animate-pulse"
                >
                  <div className="h-9 w-9 rounded-full bg-white/[0.04]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 bg-white/[0.04] rounded" />
                    <div className="h-2.5 w-12 bg-white/[0.03] rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && searchTerm && (
            <p className="text-xs text-seafoam/25 text-center py-6">
              No divers found
            </p>
          )}

          {results.map((buddy) => (
            <button
              key={buddy.id}
              onClick={() => onSelect(buddy)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left"
            >
              <OceanAvatar userId={buddy.id} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 font-medium truncate">
                  {buddy.full_name || "Diver"}
                </p>
              </div>
              <span className="text-[10px] text-teal-400/50">Message</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
