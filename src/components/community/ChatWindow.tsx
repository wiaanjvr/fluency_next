"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Send, ArrowLeft } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { OceanAvatar } from "./OceanAvatar";
import { useDirectMessages, useSendMessage } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

interface ChatWindowProps {
  otherUserId: string;
  otherUserName: string;
  onBack?: () => void;
}

export function ChatWindow({
  otherUserId,
  otherUserName,
  onBack,
}: ChatWindowProps) {
  const { user } = useAuth();
  const { messages, loading } = useDirectMessages(user?.id || "", otherUserId);
  const { send, sending } = useSendMessage();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    await send({
      receiver_id: otherUserId,
      content: text.trim(),
    });
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        {onBack && (
          <button
            onClick={onBack}
            className="text-seafoam/40 hover:text-white transition-colors md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <OceanAvatar userId={otherUserId} size={32} />
        <div>
          <p className="text-sm font-medium text-white/70">{otherUserName}</p>
          <p className="text-[10px] text-seafoam/25">Dive Buddy</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}
              >
                <div className="h-10 w-48 rounded-2xl bg-white/[0.02] animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <OceanAvatar userId={otherUserId} size={48} />
            <p className="text-xs text-seafoam/30 mt-3">
              Start a conversation with {otherUserName}
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === user?.id;
            const prevMsg = messages[i - 1];
            const showAvatar =
              !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
              />
            );
          })}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-sm text-white/80 placeholder:text-seafoam/20 outline-none focus:border-teal-500/20 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="rounded-xl bg-teal-500/20 text-teal-300 p-2.5 hover:bg-teal-500/30 transition-colors disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
