"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Tag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** All known tags for autocomplete suggestions */
  allTags?: string[];
  placeholder?: string;
  className?: string;
  /** Enable hierarchical tag support with :: separator */
  hierarchical?: boolean;
}

/** Split a hierarchical tag into its segments */
function getTagSegments(tag: string): string[] {
  return tag.split("::").map((s) => s.trim());
}

/** Get the leaf (last segment) of a hierarchical tag */
function getTagLeaf(tag: string): string {
  const segments = getTagSegments(tag);
  return segments[segments.length - 1];
}

/** Get depth of a hierarchical tag (0 = root) */
function getTagDepth(tag: string): number {
  return tag.split("::").length - 1;
}

export function TagsInput({
  tags,
  onChange,
  allTags = [],
  placeholder = "Add a tag...",
  className,
  hierarchical = true,
}: TagsInputProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!input.trim()) {
      // When focused with empty input and hierarchical, show top-level tags
      if (hierarchical && focused) {
        const topLevel = allTags.filter((t) => !tags.includes(t)).slice(0, 8);
        return topLevel;
      }
      return [];
    }

    const query = input.toLowerCase();

    if (hierarchical) {
      // For hierarchical tags, match against full path and leaf name
      // Also support partial path matching (e.g., "lang::" shows children of "language")
      const matches = allTags
        .filter((t) => {
          if (tags.includes(t)) return false;
          const lower = t.toLowerCase();
          // Match full path
          if (lower.includes(query)) return true;
          // Match leaf name
          if (getTagLeaf(t).toLowerCase().includes(query)) return true;
          return false;
        })
        .sort((a, b) => {
          // Prioritize exact prefix matches
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aStarts = aLower.startsWith(query);
          const bStarts = bLower.startsWith(query);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          // Then sort by depth (prefer shallower tags)
          const aDepth = getTagDepth(a);
          const bDepth = getTagDepth(b);
          if (aDepth !== bDepth) return aDepth - bDepth;
          return a.localeCompare(b);
        })
        .slice(0, 10);

      return matches;
    }

    // Non-hierarchical: original behavior
    return allTags
      .filter((t) => t.toLowerCase().includes(query) && !tags.includes(t))
      .slice(0, 8);
  }, [input, allTags, tags, hierarchical, focused]);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInput("");
      setSelectedSuggestion(-1);
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        addTag(suggestions[selectedSuggestion]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "Tab" && hierarchical && input.includes("::")) {
      // Tab-complete partial hierarchy (e.g., "lang::" → show completions)
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        addTag(suggestions[selectedSuggestion]);
      }
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setInput("");
      setSelectedSuggestion(-1);
      inputRef.current?.blur();
    }
  };

  // Reset suggestion selection when input changes
  useEffect(() => {
    setSelectedSuggestion(-1);
  }, [input]);

  /** Render a tag pill with hierarchy-aware display */
  const renderTagPill = (tag: string) => {
    if (hierarchical && tag.includes("::")) {
      const segments = getTagSegments(tag);
      return (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-medium",
            "bg-teal-500/15 text-teal-300 border border-teal-500/20",
          )}
          title={tag}
        >
          <Tag className="h-2.5 w-2.5 mr-0.5 shrink-0" />
          {segments.map((segment, i) => (
            <span key={i} className="inline-flex items-center">
              {i > 0 && (
                <ChevronRight className="h-2.5 w-2.5 text-teal-500/40 mx-0.5 shrink-0" />
              )}
              <span
                className={i < segments.length - 1 ? "text-teal-400/50" : ""}
              >
                {segment}
              </span>
            </span>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="ml-1 hover:text-white transition"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      );
    }

    return (
      <span
        key={tag}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium",
          "bg-teal-500/15 text-teal-300 border border-teal-500/20",
        )}
      >
        <Tag className="h-2.5 w-2.5" />
        {tag}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeTag(tag);
          }}
          className="ml-0.5 hover:text-white transition"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  };

  /** Render a suggestion item with hierarchy highlighting */
  const renderSuggestion = (suggestion: string, i: number) => {
    if (hierarchical && suggestion.includes("::")) {
      const segments = getTagSegments(suggestion);
      return (
        <button
          key={suggestion}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => addTag(suggestion)}
          className={cn(
            "w-full text-left px-3 py-1.5 text-sm transition flex items-center",
            i === selectedSuggestion
              ? "bg-teal-500/15 text-teal-300"
              : "text-white/70 hover:bg-white/5 hover:text-white",
          )}
        >
          {segments.map((segment, j) => (
            <span key={j} className="inline-flex items-center">
              {j > 0 && (
                <ChevronRight className="h-3 w-3 text-white/20 mx-1 shrink-0" />
              )}
              <span className={j < segments.length - 1 ? "text-white/40" : ""}>
                {segment}
              </span>
            </span>
          ))}
        </button>
      );
    }

    return (
      <button
        key={suggestion}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addTag(suggestion)}
        className={cn(
          "w-full text-left px-3 py-1.5 text-sm transition",
          i === selectedSuggestion
            ? "bg-teal-500/15 text-teal-300"
            : "text-white/70 hover:bg-white/5 hover:text-white",
        )}
      >
        {suggestion}
      </button>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2",
          "bg-white/5 transition min-h-[42px]",
          focused
            ? "border-teal-400/50 ring-1 ring-teal-400/30"
            : "border-white/10",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => renderTagPill(tag))}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 200);
            if (input.trim()) addTag(input);
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      {/* Hint for hierarchical input */}
      {hierarchical && focused && input && !input.includes("::") && (
        <div className="absolute -bottom-5 left-1 text-[10px] text-white/25">
          Use :: for nested tags (e.g. language::french)
        </div>
      )}

      {/* Autocomplete dropdown */}
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0d2137] border border-white/10 rounded-xl py-1 shadow-2xl max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, i) => renderSuggestion(suggestion, i))}

          {/* Create new tag hint */}
          {input.trim() &&
            !suggestions.some(
              (s) => s.toLowerCase() === input.trim().toLowerCase(),
            ) && (
              <div className="px-3 py-1.5 text-xs text-white/30 border-t border-white/5 mt-1">
                Press Enter to create &quot;{input.trim()}&quot;
              </div>
            )}
        </div>
      )}
    </div>
  );
}
