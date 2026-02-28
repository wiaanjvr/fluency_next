"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Tag,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  FolderTree,
  Search,
  Merge,
  AlertCircle,
  Check,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlashcardTag, TagTreeNode } from "@/types/sync-tags-import";
import {
  fetchAllTags,
  fetchTagCardCounts,
  buildTagTree,
  renameTagGlobally,
  deleteTagGlobally,
  ensureTagExists,
  mergeTags,
  getTagLeafName,
  getTagDepth,
} from "@/lib/tags";

// ── Props ──────────────────────────────────────────────────────────────────

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** Called when tags change — parent can refresh card list */
  onTagsChanged?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function TagManager({
  open,
  onClose,
  userId,
  onTagsChanged,
}: TagManagerProps) {
  const [tags, setTags] = useState<FlashcardTag[]>([]);
  const [cardCounts, setCardCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Editing state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // New tag state
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagParent, setNewTagParent] = useState("");

  // Merge state
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  // Feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    tagName: string;
    childCount: number;
  } | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const [allTags, counts] = await Promise.all([
        fetchAllTags(userId),
        fetchTagCardCounts(userId),
      ]);
      setTags(allTags);
      setCardCounts(counts);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load tags",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) loadTags();
  }, [open, loadTags]);

  // Clear feedback after 3s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  // ── Tree building ────────────────────────────────────────────────────

  const tagTree = useMemo(() => {
    return buildTagTree(tags, cardCounts);
  }, [tags, cardCounts]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tagTree;

    const q = search.toLowerCase();
    const filterNodes = (nodes: TagTreeNode[]): TagTreeNode[] => {
      return nodes
        .map((node) => {
          const childMatches = filterNodes(node.children);
          const selfMatches = node.tag.name.toLowerCase().includes(q);

          if (selfMatches || childMatches.length > 0) {
            return { ...node, children: childMatches };
          }
          return null;
        })
        .filter(Boolean) as TagTreeNode[];
    };

    return filterNodes(tagTree);
  }, [tagTree, search]);

  // ── Actions ──────────────────────────────────────────────────────────

  const toggleExpand = (tagName: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(tagName)) next.delete(tagName);
      else next.add(tagName);
      return next;
    });
  };

  const handleRename = async (oldName: string) => {
    if (!editValue.trim() || editValue === oldName) {
      setEditingTag(null);
      return;
    }

    try {
      const affected = await renameTagGlobally(userId, {
        oldName,
        newName: editValue.trim(),
      });
      setFeedback({
        type: "success",
        message: `Renamed "${oldName}" → "${editValue.trim()}" (${affected} cards updated)`,
      });
      setEditingTag(null);
      await loadTags();
      onTagsChanged?.();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Rename failed",
      });
    }
  };

  const handleDelete = async (tagName: string, includeChildren: boolean) => {
    try {
      const affected = await deleteTagGlobally(userId, {
        tagName,
        includeChildren,
      });
      setFeedback({
        type: "success",
        message: `Deleted "${tagName}" (${affected} cards updated)`,
      });
      setConfirmDelete(null);
      await loadTags();
      onTagsChanged?.();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const fullName = newTagParent
      ? `${newTagParent}::${newTagName.trim()}`
      : newTagName.trim();

    try {
      await ensureTagExists(userId, fullName);
      setFeedback({ type: "success", message: `Created tag "${fullName}"` });
      setShowNewTag(false);
      setNewTagName("");
      setNewTagParent("");
      await loadTags();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Create failed",
      });
    }
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget.trim()) return;

    try {
      const affected = await mergeTags(userId, mergeSource, mergeTarget.trim());
      setFeedback({
        type: "success",
        message: `Merged "${mergeSource}" → "${mergeTarget.trim()}" (${affected} cards)`,
      });
      setMergeSource(null);
      setMergeTarget("");
      await loadTags();
      onTagsChanged?.();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Merge failed",
      });
    }
  };

  const requestDelete = (tagName: string) => {
    const childCount = tags.filter((t) =>
      t.name.startsWith(tagName + "::"),
    ).length;
    setConfirmDelete({ tagName, childCount });
  };

  // ── Render ───────────────────────────────────────────────────────────

  if (!open) return null;

  const renderTagNode = (node: TagTreeNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.tag.name);
    const hasChildren = node.children.length > 0;
    const isEditing = editingTag === node.tag.name;
    const isMerging = mergeSource === node.tag.name;

    return (
      <div key={node.tag.name} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-2 px-3 py-2 rounded-lg transition",
            "hover:bg-white/5",
            isMerging && "bg-amber-500/10 border border-amber-400/20",
          )}
          style={{ paddingLeft: `${12 + node.depth * 20}px` }}
        >
          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(node.tag.name)}
            className={cn(
              "w-4 h-4 flex items-center justify-center",
              hasChildren
                ? "text-white/40 hover:text-white/70"
                : "text-transparent",
            )}
          >
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              ))}
          </button>

          {/* Tag icon */}
          <Hash className="h-3.5 w-3.5 text-teal-400/60 flex-shrink-0" />

          {/* Tag name or edit input */}
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(node.tag.name);
                if (e.key === "Escape") setEditingTag(null);
              }}
              onBlur={() => handleRename(node.tag.name)}
              autoFocus
              className="flex-1 bg-white/5 border border-teal-400/30 rounded-lg px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400/50"
            />
          ) : (
            <span className="flex-1 text-sm text-white/80 truncate">
              {node.depth > 0 ? getTagLeafName(node.tag.name) : node.tag.name}
            </span>
          )}

          {/* Card count badge */}
          <span className="text-xs text-white/30 tabular-nums">
            {node.cardCount}
          </span>

          {/* Actions (visible on hover) */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => {
                  setEditingTag(node.tag.name);
                  setEditValue(node.tag.name);
                }}
                title="Rename"
                className="p-1 rounded text-white/30 hover:text-teal-300 hover:bg-white/5 transition"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMergeSource(node.tag.name);
                  setMergeTarget("");
                }}
                title="Merge into another tag"
                className="p-1 rounded text-white/30 hover:text-amber-300 hover:bg-white/5 transition"
              >
                <Merge className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => requestDelete(node.tag.name)}
                title="Delete"
                className="p-1 rounded text-white/30 hover:text-rose-300 hover:bg-white/5 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Merge input */}
        {isMerging && (
          <div className="ml-12 mr-3 mt-1 mb-2 flex items-center gap-2">
            <span className="text-xs text-amber-300/70">Merge into:</span>
            <input
              type="text"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              placeholder="Target tag name..."
              autoFocus
              className="flex-1 bg-white/5 border border-amber-400/30 rounded-lg px-2 py-1 text-sm text-white placeholder:text-white/20 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleMerge();
                if (e.key === "Escape") setMergeSource(null);
              }}
            />
            <button
              type="button"
              onClick={handleMerge}
              className="px-2 py-1 text-xs bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition"
            >
              Merge
            </button>
            <button
              type="button"
              onClick={() => setMergeSource(null)}
              className="px-2 py-1 text-xs text-white/40 hover:text-white/70 transition"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>{node.children.map(renderTagNode)}</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-2xl border border-white/10",
          "bg-[#0d2137] shadow-2xl flex flex-col max-h-[85vh]",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10">
              <FolderTree className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Tag Manager</h2>
              <p className="text-xs text-white/40">
                {tags.length} tags · Use :: for hierarchy (e.g. grammar::verbs)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 transition"
            />
          </div>

          {/* Add tag button */}
          <button
            type="button"
            onClick={() => setShowNewTag(!showNewTag)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition",
              showNewTag
                ? "bg-teal-500/20 text-teal-300"
                : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10",
            )}
          >
            <Plus className="h-4 w-4" />
            Add Tag
          </button>
        </div>

        {/* New tag form */}
        {showNewTag && (
          <div className="px-6 py-3 border-b border-white/5 bg-teal-500/5">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newTagParent}
                onChange={(e) => setNewTagParent(e.target.value)}
                placeholder="Parent tag (optional)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50"
              />
              <span className="text-white/30">::</span>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name"
                autoFocus
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTag();
                }}
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                className="px-3 py-2 bg-teal-500/20 text-teal-300 rounded-xl text-sm font-medium hover:bg-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              "mx-6 mt-3 flex items-center gap-2 rounded-xl p-3 text-sm",
              feedback.type === "success"
                ? "bg-teal-500/10 border border-teal-400/20 text-teal-300"
                : "bg-rose-500/10 border border-rose-400/20 text-rose-300",
            )}
          >
            {feedback.type === "success" ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            {feedback.message}
          </div>
        )}

        {/* Tag tree */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <Tag className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {search ? "No tags match your search" : "No tags yet"}
              </p>
              {!search && (
                <p className="text-xs mt-1">
                  Add tags to cards or create them here
                </p>
              )}
            </div>
          ) : (
            filteredTree.map(renderTagNode)
          )}
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl">
            <div className="bg-[#0d2137] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
              <h3 className="text-base font-semibold text-white mb-2">
                Delete tag &ldquo;{confirmDelete.tagName}&rdquo;?
              </h3>
              <p className="text-sm text-white/50 mb-4">
                This will remove the tag from all cards that have it.
                {confirmDelete.childCount > 0 && (
                  <> This tag has {confirmDelete.childCount} child tag(s).</>
                )}
              </p>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDelete.tagName, false)}
                  className="w-full px-3 py-2 bg-rose-500/20 text-rose-300 rounded-xl text-sm font-medium hover:bg-rose-500/30 transition"
                >
                  Delete this tag only
                </button>

                {confirmDelete.childCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(confirmDelete.tagName, true)}
                    className="w-full px-3 py-2 bg-rose-500/10 text-rose-300/70 rounded-xl text-sm hover:bg-rose-500/20 transition"
                  >
                    Delete with all children ({confirmDelete.childCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="w-full px-3 py-2 text-white/40 hover:text-white/70 text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
