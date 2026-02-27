"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Plus, ChevronDown } from "lucide-react";
import {
  useActiveLanguage,
  type UserLanguage,
} from "@/contexts/ActiveLanguageContext";
import {
  getDepthLevel,
  getProgressToNextLevel,
} from "@/lib/progression/depthLevels";

// ============================================================================
// LanguageDepthSelector — Compact pill that opens a dropdown panel
//
// Shows: flag + language name + depth level (e.g. "🇩🇪 German · Shallows")
// Dropdown: language list + depth progress (read-only)
// Switching language updates ActiveLanguageContext
// ============================================================================

interface LanguageDepthSelectorProps {
  wordCount: number;
  className?: string;
}

export function LanguageDepthSelector({
  wordCount,
  className,
}: LanguageDepthSelectorProps) {
  const { activeLanguage, setActiveLanguage, userLanguages, isLoading } =
    useActiveLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const depthLevel = getDepthLevel(wordCount);
  const progress = getProgressToNextLevel(wordCount);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelectLanguage = async (lang: UserLanguage) => {
    if (lang.code === activeLanguage.code) {
      setIsOpen(false);
      return;
    }
    await setActiveLanguage(lang.code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger pill */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 transition-all duration-200 group"
        style={{
          padding: "4px 12px",
          borderRadius: 20,
          background: "var(--ocean-depth-3, #132638)",
          border: `1px solid ${isOpen ? "var(--ocean-teal-primary, #00d4aa)" : "var(--teal-border, rgba(0,212,170,0.18))"}`,
        }}
        aria-label={`${activeLanguage.name}, ${depthLevel.name}. Click to switch language.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none">{activeLanguage.flag}</span>
        <span
          className="hidden sm:inline"
          style={{
            fontFamily: "var(--font-inter, 'Inter', sans-serif)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary, #F0FDFA)",
          }}
        >
          {activeLanguage.name}
        </span>
        <span
          className="hidden sm:inline"
          style={{
            fontFamily: "var(--font-inter, 'Inter', sans-serif)",
            fontSize: 12,
            fontWeight: 400,
            color: depthLevel.colorPrimaryHex,
          }}
        >
          · {depthLevel.name}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          style={{ color: "var(--text-ghost, #2D5A52)" }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-0 top-full mt-2 z-50"
            style={{ transformOrigin: "top left", width: 280 }}
          >
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--bg-elevated, #052030)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow:
                  "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
              role="listbox"
              aria-label="Select language"
            >
              {/* Section 1: Languages */}
              <div className="p-2">
                <div
                  className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    color: "var(--text-ghost, #2D5A52)",
                    fontFamily:
                      "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  }}
                >
                  Languages
                </div>

                {isLoading ? (
                  <div
                    className="px-2 py-3 text-xs"
                    style={{ color: "var(--text-muted, #2E5C54)" }}
                  >
                    Loading…
                  </div>
                ) : (
                  <>
                    {userLanguages.map((lang) => {
                      const isActive = lang.code === activeLanguage.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => handleSelectLanguage(lang)}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors duration-150"
                          style={{
                            background: isActive
                              ? "rgba(255,255,255,0.06)"
                              : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.03)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                          role="option"
                          aria-selected={isActive}
                        >
                          <span className="text-lg leading-none">
                            {lang.flag}
                          </span>
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            <span
                              className="text-sm font-medium truncate"
                              style={{
                                color: isActive
                                  ? "var(--text-primary, #F0FDFA)"
                                  : "var(--text-secondary, #7BA8A0)",
                                fontFamily:
                                  "var(--font-inter, 'Inter', sans-serif)",
                              }}
                            >
                              {lang.name}
                            </span>
                            <span
                              className="text-[10px] tabular-nums"
                              style={{
                                color: "var(--text-muted, #2E5C54)",
                                fontFamily:
                                  "var(--font-inter, 'Inter', system-ui, sans-serif)",
                              }}
                            >
                              {lang.wordCount.toLocaleString()} words
                            </span>
                          </div>
                          {isActive && (
                            <Check
                              className="w-4 h-4 flex-shrink-0"
                              style={{ color: "var(--teal, #0D9488)" }}
                            />
                          )}
                        </button>
                      );
                    })}

                    {/* Add language */}
                    <button
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors duration-150 mt-1"
                      style={{ color: "var(--text-muted, #2E5C54)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.03)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                      onClick={() => {
                        // TODO: Navigate to language setup or open modal
                        setIsOpen(false);
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{
                          border: "1px dashed var(--text-ghost, #2D5A52)",
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className="text-sm"
                        style={{
                          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        }}
                      >
                        Add language
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />

              {/* Section 2: Current depth (read-only) */}
              <div className="p-3">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{
                    color: "var(--text-ghost, #2D5A52)",
                    fontFamily:
                      "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  }}
                >
                  Current Depth
                </div>

                <div className="flex items-center gap-3">
                  {/* Mini depth gauge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${depthLevel.colorPrimaryHex}22, ${depthLevel.colorSecondaryHex}11)`,
                      border: `1.5px solid ${depthLevel.colorPrimaryHex}44`,
                    }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: depthLevel.colorPrimaryHex,
                        fontFamily:
                          "var(--font-inter, 'Inter', system-ui, sans-serif)",
                      }}
                    >
                      {depthLevel.id}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: depthLevel.colorPrimaryHex,
                          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        }}
                      >
                        {depthLevel.name}
                      </span>
                      <span
                        className="text-[10px] tabular-nums"
                        style={{
                          color: "var(--text-muted, #2E5C54)",
                          fontFamily:
                            "var(--font-inter, 'Inter', system-ui, sans-serif)",
                        }}
                      >
                        {progress.percentage}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${depthLevel.colorPrimaryHex}, ${depthLevel.colorSecondaryHex})`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    {progress.next && (
                      <span
                        className="text-[10px] mt-1 block"
                        style={{
                          color: "var(--text-muted, #2E5C54)",
                          fontFamily:
                            "var(--font-inter, 'Inter', system-ui, sans-serif)",
                        }}
                      >
                        {progress.wordsRemaining} words to {progress.next.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
