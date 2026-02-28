// ============================================================================
// Tag management library — hierarchical tags, bulk ops, rename/delete
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  FlashcardTag,
  TagTreeNode,
  TagRenamePayload,
  TagDeletePayload,
  BulkTagOperation,
} from "@/types/sync-tags-import";

// ── Hierarchy helpers ──────────────────────────────────────────────────────

/** Split a hierarchical tag into segments: "grammar::verbs::past" → ["grammar", "grammar::verbs", "grammar::verbs::past"] */
export function getTagAncestors(tagName: string): string[] {
  const parts = tagName.split("::");
  const ancestors: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i + 1).join("::"));
  }
  return ancestors;
}

/** Get the parent tag name: "grammar::verbs::past" → "grammar::verbs" */
export function getParentTagName(tagName: string): string | null {
  const parts = tagName.split("::");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join("::");
}

/** Get the leaf name: "grammar::verbs::past" → "past" */
export function getTagLeafName(tagName: string): string {
  const parts = tagName.split("::");
  return parts[parts.length - 1];
}

/** Get the depth of a tag: "grammar::verbs::past" → 2 */
export function getTagDepth(tagName: string): number {
  return tagName.split("::").length - 1;
}

/** Check if tag is a child of another: isChildOf("grammar::verbs", "grammar") → true */
export function isChildOf(child: string, parent: string): boolean {
  return child.startsWith(parent + "::");
}

// ── Tag tree building ──────────────────────────────────────────────────────

/** Build a tree from a flat list of tags with card counts */
export function buildTagTree(
  tags: FlashcardTag[],
  cardCountMap: Map<string, number>,
): TagTreeNode[] {
  const nodeMap = new Map<string, TagTreeNode>();

  // Create nodes
  for (const tag of tags) {
    nodeMap.set(tag.name, {
      tag,
      children: [],
      cardCount: cardCountMap.get(tag.name) ?? 0,
      depth: getTagDepth(tag.name),
    });
  }

  // Build tree structure
  const roots: TagTreeNode[] = [];
  for (const node of nodeMap.values()) {
    const parentName = getParentTagName(node.tag.name);
    if (parentName && nodeMap.has(parentName)) {
      nodeMap.get(parentName)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children alphabetically
  const sortNodes = (nodes: TagTreeNode[]) => {
    nodes.sort((a, b) => a.tag.name.localeCompare(b.tag.name));
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);

  // Roll up card counts (children count towards parent)
  const rollUp = (node: TagTreeNode): number => {
    let total = node.cardCount;
    for (const child of node.children) {
      total += rollUp(child);
    }
    node.cardCount = total;
    return total;
  };
  for (const root of roots) rollUp(root);

  return roots;
}

// ── Database operations ────────────────────────────────────────────────────

/** Fetch all tags for the current user */
export async function fetchAllTags(userId: string): Promise<FlashcardTag[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flashcard_tags")
    .select("*")
    .eq("user_id", userId)
    .order("name");

  if (error) throw new Error(`Failed to fetch tags: ${error.message}`);
  return data ?? [];
}

/** Get card counts per tag for the current user */
export async function fetchTagCardCounts(
  userId: string,
): Promise<Map<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flashcards")
    .select("tags")
    .eq("user_id", userId)
    .not("tags", "is", null);

  if (error) throw new Error(`Failed to fetch tag counts: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.tags) continue;
    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

/** Ensure a tag (and all ancestors) exist in the normalised table */
export async function ensureTagExists(
  userId: string,
  tagName: string,
): Promise<FlashcardTag> {
  const supabase = createClient();
  const ancestors = getTagAncestors(tagName);
  let parentId: string | null = null;

  let lastTag: FlashcardTag | null = null;

  for (const ancestor of ancestors) {
    // Upsert each ancestor
    const result = await supabase
      .from("flashcard_tags")
      .upsert(
        {
          user_id: userId,
          name: ancestor,
          parent_id: parentId,
        },
        { onConflict: "user_id,name" },
      )
      .select()
      .single();

    if (result.error || !result.data)
      throw new Error(
        `Failed to create tag "${ancestor}": ${result.error?.message}`,
      );
    const tag = result.data as unknown as FlashcardTag;
    parentId = tag.id;
    lastTag = tag;
  }

  return lastTag!;
}

/** Ensure multiple tags exist at once */
export async function ensureTagsExist(
  userId: string,
  tagNames: string[],
): Promise<void> {
  for (const name of tagNames) {
    await ensureTagExists(userId, name);
  }
}

/** Rename a tag globally (calls the DB function) */
export async function renameTagGlobally(
  userId: string,
  payload: TagRenamePayload,
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rename_tag_globally", {
    p_user_id: userId,
    p_old_name: payload.oldName,
    p_new_name: payload.newName,
  });

  if (error) throw new Error(`Failed to rename tag: ${error.message}`);

  // Also update the normalised table entry
  await supabase
    .from("flashcard_tags")
    .update({ name: payload.newName, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("name", payload.oldName);

  return data ?? 0;
}

/** Delete a tag globally (calls the DB function) */
export async function deleteTagGlobally(
  userId: string,
  payload: TagDeletePayload,
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("delete_tag_globally", {
    p_user_id: userId,
    p_tag_name: payload.tagName,
    p_include_children: payload.includeChildren,
  });

  if (error) throw new Error(`Failed to delete tag: ${error.message}`);
  return data ?? 0;
}

/** Bulk add or remove tags on multiple cards */
export async function bulkTagOperation(
  userId: string,
  operation: BulkTagOperation,
): Promise<number> {
  const supabase = createClient();
  let affected = 0;

  if (operation.action === "add") {
    // Ensure tags exist in normalised table
    await ensureTagsExist(userId, operation.tags);

    // For each card, add the new tags
    for (const cardId of operation.cardIds) {
      const { data: card } = await supabase
        .from("flashcards")
        .select("tags")
        .eq("id", cardId)
        .eq("user_id", userId)
        .single();

      if (!card) continue;

      const existing = card.tags ?? [];
      const merged = [...new Set([...existing, ...operation.tags])];

      const { error } = await supabase
        .from("flashcards")
        .update({ tags: merged })
        .eq("id", cardId)
        .eq("user_id", userId);

      if (!error) affected++;
    }
  } else {
    // Remove tags
    for (const cardId of operation.cardIds) {
      const { data: card } = await supabase
        .from("flashcards")
        .select("tags")
        .eq("id", cardId)
        .eq("user_id", userId)
        .single();

      if (!card) continue;

      const existing: string[] = card.tags ?? [];
      const filtered = existing.filter(
        (t: string) => !operation.tags.includes(t),
      );

      const { error } = await supabase
        .from("flashcards")
        .update({ tags: filtered })
        .eq("id", cardId)
        .eq("user_id", userId);

      if (!error) affected++;
    }
  }

  return affected;
}

/** Get all unique tags from the flashcards text[] column (fast) */
export async function fetchDistinctTagsFromCards(
  userId: string,
): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flashcards")
    .select("tags")
    .eq("user_id", userId)
    .not("tags", "is", null);

  if (error) throw new Error(`Failed to fetch distinct tags: ${error.message}`);

  const tagSet = new Set<string>();
  for (const row of data ?? []) {
    if (!row.tags) continue;
    for (const tag of row.tags) {
      tagSet.add(tag);
    }
  }

  return [...tagSet].sort();
}

/** Merge two tags: rename sourceTag → targetTag */
export async function mergeTags(
  userId: string,
  sourceTag: string,
  targetTag: string,
): Promise<number> {
  return renameTagGlobally(userId, {
    oldName: sourceTag,
    newName: targetTag,
  });
}

/** Search tags by prefix (for autocomplete) */
export function filterTagSuggestions(
  allTags: string[],
  query: string,
  currentTags: string[],
  limit = 10,
): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return allTags
    .filter((t) => t.toLowerCase().includes(q) && !currentTags.includes(t))
    .slice(0, limit);
}

/** Get all tags that match a hierarchical prefix */
export function getChildTags(allTags: string[], parentTag: string): string[] {
  return allTags.filter(
    (t) => t === parentTag || t.startsWith(parentTag + "::"),
  );
}
