"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, MessageCircle } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { FindDiveBuddyModal } from "./FindDiveBuddyModal";
import { OceanEmptyState } from "./OceanEmptyState";
import type { Conversation } from "@/types/dive-tank";

export function MessagesTab() {
  const [selected, setSelected] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [buddyModalOpen, setBuddyModalOpen] = useState(false);

  const handleSelectConversation = (conv: Conversation) => {
    setSelected({
      userId: conv.other_user.id,
      name: conv.other_user.full_name || "Diver",
    });
  };

  const handleSelectBuddy = (buddy: {
    id: string;
    full_name: string | null;
  }) => {
    setSelected({
      userId: buddy.id,
      name: buddy.full_name || "Diver",
    });
    setBuddyModalOpen(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-seafoam/40 tracking-wide uppercase flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Messages
        </h2>
        <button
          onClick={() => setBuddyModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-sm text-seafoam/60 hover:text-teal-300 hover:border-teal-500/20 transition-all"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Find Dive Buddy
        </button>
      </div>

      {/* Split pane */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden min-h-[500px] flex">
        {/* Conversation list — left pane */}
        <div
          className={`w-full md:w-80 md:border-r border-white/[0.06] shrink-0 ${
            selected ? "hidden md:flex md:flex-col" : "flex flex-col"
          }`}
        >
          <ConversationList
            activeId={selected?.userId}
            onSelect={handleSelectConversation}
          />
        </div>

        {/* Chat — right pane */}
        <div
          className={`flex-1 ${!selected ? "hidden md:flex" : "flex"} flex-col`}
        >
          {selected ? (
            <ChatWindow
              otherUserId={selected.userId}
              otherUserName={selected.name}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <OceanEmptyState message="Select a conversation or find a dive buddy to start chatting" />
            </div>
          )}
        </div>
      </div>

      {/* Find Buddy Modal */}
      <AnimatePresence>
        {buddyModalOpen && (
          <FindDiveBuddyModal
            open={buddyModalOpen}
            onClose={() => setBuddyModalOpen(false)}
            onSelect={handleSelectBuddy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
