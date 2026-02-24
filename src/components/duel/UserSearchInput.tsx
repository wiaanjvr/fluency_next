"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, User as UserIcon, X, Mail } from "lucide-react";
import type { UserSearchResult } from "@/types/duel";

// ── Helpers ──────────────────────────────────────────────────────────────────

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

interface UserSearchInputProps {
  onSelect: (user: UserSearchResult) => void;
  selectedUser: UserSearchResult | null;
  onDeselect: () => void;
}

export default function UserSearchInput({
  onSelect,
  selectedUser,
  onDeselect,
}: UserSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false); // tracks if a search completed
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Debounced search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/duels/search-users?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
          setSearched(true);
          setActiveIndex(-1);
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ── Select handler ───────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (user: UserSearchResult) => {
      onSelect(user);
      setQuery("");
      setResults([]);
      setOpen(false);
      setSearched(false);
    },
    [onSelect],
  );

  // ── Email invite option (shown when query is a valid email with no exact match) ─

  const emailInviteItem: UserSearchResult | null =
    searched &&
    isValidEmail(query) &&
    !results.some((r) => r.email.toLowerCase() === query.trim().toLowerCase())
      ? {
          id: "",
          email: query.trim().toLowerCase(),
          display_name: null,
          avatar_url: null,
          is_guest: true,
        }
      : null;

  // Include email invite as the last virtual item for keyboard nav
  const displayedItems = emailInviteItem
    ? [...results, emailInviteItem]
    : results;

  // ── Keyboard navigation ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || displayedItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, displayedItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx = activeIndex >= 0 ? activeIndex : 0;
        if (displayedItems[idx]) {
          handleSelect(displayedItems[idx]);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, displayedItems, activeIndex, handleSelect],
  );

  const showDropdown =
    open &&
    query.trim().length >= 2 &&
    (results.length > 0 || searched || !!emailInviteItem);

  // ── Selected state ───────────────────────────────────────────────────────────

  if (selectedUser) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-4 p-4 rounded-2xl"
        style={{
          background: "rgba(13, 27, 42, 0.7)",
          border: "1px solid rgba(61, 214, 181, 0.2)",
        }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-[rgba(61,214,181,0.1)] border border-[rgba(61,214,181,0.2)]">
          {selectedUser.avatar_url ? (
            <img
              src={selectedUser.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-5 h-5" style={{ color: "#3dd6b5" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-body text-sm font-medium"
            style={{ color: "#f7fafc" }}
          >
            {selectedUser.display_name || selectedUser.email}
          </p>
          <p className="font-body text-xs" style={{ color: "#718096" }}>
            {selectedUser.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body text-xs" style={{ color: "#3dd6b5" }}>
            ✓ Selected
          </span>
          <button
            onClick={onDeselect}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" style={{ color: "#718096" }} />
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Search input ─────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors pointer-events-none"
          style={{ color: open ? "#3dd6b5" : "#718096" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Use onBlur with a delay so mousedown on results fires first
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name or email…"
          className="w-full pl-11 pr-10 py-4 rounded-2xl bg-transparent outline-none font-body text-sm transition-all duration-300"
          style={{
            color: "#e8d5b0",
            background: "rgba(255, 255, 255, 0.02)",
            border: open
              ? "1px solid rgba(61, 214, 181, 0.3)"
              : "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: open ? "0 0 20px rgba(61, 214, 181, 0.08)" : "none",
          }}
        />
        {searching && (
          <Loader2
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
            style={{ color: "#3dd6b5" }}
          />
        )}
      </div>

      {/* Hint */}
      {!open && query.length === 0 && (
        <p
          className="mt-1.5 font-body text-[11px] pl-1"
          style={{ color: "#4a5568" }}
        >
          Type a name or email — then click or press ↵ to select
        </p>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
            style={{
              background: "rgba(13, 27, 42, 0.97)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(61, 214, 181, 0.12)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {results.length === 0 && !emailInviteItem ? (
              <div
                className="px-4 py-5 font-body text-sm text-center"
                style={{ color: "#4a5568" }}
              >
                No users found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                {results.map((u, i) => (
                  <motion.button
                    key={u.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(u);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 cursor-pointer border-b border-white/[0.03] last:border-0"
                    style={{
                      background:
                        i === activeIndex
                          ? "rgba(61, 214, 181, 0.08)"
                          : "transparent",
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden bg-white/5 flex-shrink-0">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon
                          className="w-4 h-4"
                          style={{ color: "#718096" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-body text-sm truncate"
                        style={{ color: "#e8d5b0" }}
                      >
                        {u.display_name || u.email}
                      </p>
                      {u.display_name && (
                        <p
                          className="font-body text-xs truncate"
                          style={{ color: "#718096" }}
                        >
                          {u.email}
                        </p>
                      )}
                    </div>
                    {i === 0 && results.length === 1 && !emailInviteItem && (
                      <span
                        className="font-body text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: "rgba(61,214,181,0.08)",
                          color: "#3dd6b5",
                          border: "1px solid rgba(61,214,181,0.15)",
                        }}
                      >
                        ↵
                      </span>
                    )}
                  </motion.button>
                ))}

                {/* Email invite row */}
                {emailInviteItem && (
                  <motion.button
                    key="email-invite"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: results.length * 0.04 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(emailInviteItem);
                    }}
                    onMouseEnter={() => setActiveIndex(results.length)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 cursor-pointer"
                    style={{
                      background:
                        activeIndex === results.length
                          ? "rgba(61, 214, 181, 0.08)"
                          : "transparent",
                      borderTop:
                        results.length > 0
                          ? "1px solid rgba(61,214,181,0.08)"
                          : "none",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "rgba(61,214,181,0.08)",
                        border: "1px solid rgba(61,214,181,0.15)",
                      }}
                    >
                      <Mail className="w-4 h-4" style={{ color: "#3dd6b5" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-body text-sm truncate"
                        style={{ color: "#e8d5b0" }}
                      >
                        {emailInviteItem.email}
                      </p>
                      <p
                        className="font-body text-xs"
                        style={{ color: "#4a7b69" }}
                      >
                        Not signed up yet — send them an invite
                      </p>
                    </div>
                    <span
                      className="font-body text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: "rgba(61,214,181,0.08)",
                        color: "#3dd6b5",
                        border: "1px solid rgba(61,214,181,0.15)",
                      }}
                    >
                      Invite
                    </span>
                  </motion.button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
