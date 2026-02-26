"use client";

import { useConversations } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationItem } from "./ConversationItem";
import { Search } from "lucide-react";
import { useState } from "react";
import type { Conversation } from "@/types/dive-tank";

interface ConversationListProps {
  activeId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({
  activeId,
  onSelect,
}: ConversationListProps) {
  const { user } = useAuth();
  const { conversations, loading } = useConversations(user?.id || "");
  const [search, setSearch] = useState("");

  const filtered = search
    ? conversations.filter((c) =>
        (c.other_user.full_name || "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : conversations;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-seafoam/25" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] pl-9 pr-3 py-2 text-xs text-white/70 placeholder:text-seafoam/20 outline-none focus:border-teal-500/20"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading && (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <div className="h-10 w-10 rounded-full bg-white/[0.04] animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
                  <div className="h-2.5 w-40 bg-white/[0.03] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xs text-seafoam/25">
              {search ? "No matches" : "No conversations yet"}
            </p>
          </div>
        )}

        {filtered.map((conv) => (
          <ConversationItem
            key={conv.other_user.id}
            conversation={conv}
            active={activeId === conv.other_user.id}
            onClick={() => onSelect(conv)}
          />
        ))}
      </div>
    </div>
  );
}
