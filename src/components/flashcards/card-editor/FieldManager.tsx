"use client";

import { useState, useCallback } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Pin,
  PinOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteField } from "@/types/card-editor";

interface FieldManagerProps {
  fields: NoteField[];
  onChange: (fields: NoteField[]) => void;
  /** Minimum number of fields (cannot delete below this) */
  minFields?: number;
}

export function FieldManager({
  fields,
  onChange,
  minFields = 2,
}: FieldManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const addField = useCallback(() => {
    const name = `Field ${fields.length + 1}`;
    onChange([...fields, { name, sticky: false }]);
  }, [fields, onChange]);

  const removeField = useCallback(
    (index: number) => {
      if (fields.length <= minFields) return;
      onChange(fields.filter((_, i) => i !== index));
    },
    [fields, onChange, minFields],
  );

  const moveField = useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= fields.length) return;
      const newFields = [...fields];
      [newFields[index], newFields[newIndex]] = [
        newFields[newIndex],
        newFields[index],
      ];
      onChange(newFields);
    },
    [fields, onChange],
  );

  const renameField = useCallback(
    (index: number, name: string) => {
      if (!name.trim()) return;
      const newFields = [...fields];
      newFields[index] = { ...newFields[index], name: name.trim() };
      onChange(newFields);
      setEditingIndex(null);
    },
    [fields, onChange],
  );

  const toggleSticky = useCallback(
    (index: number) => {
      const newFields = [...fields];
      newFields[index] = {
        ...newFields[index],
        sticky: !newFields[index].sticky,
      };
      onChange(newFields);
    },
    [fields, onChange],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Fields
        </span>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition"
        >
          <Plus className="h-3 w-3" />
          Add field
        </button>
      </div>

      <div className="space-y-1">
        {fields.map((field, i) => (
          <div
            key={`${field.name}-${i}`}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              "bg-white/[0.03] border border-white/5",
              "group hover:border-white/10 transition",
            )}
          >
            <GripVertical className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />

            {editingIndex === i ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => renameField(i, editName)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameField(i, editName);
                  if (e.key === "Escape") setEditingIndex(null);
                }}
                autoFocus
                className="flex-1 bg-transparent text-sm text-white border-b border-teal-400/50 focus:outline-none px-0 py-0"
              />
            ) : (
              <span className="flex-1 text-sm text-white/80">{field.name}</span>
            )}

            {field.sticky && (
              <span className="text-[10px] text-amber-400/70 font-medium px-1.5 py-0.5 bg-amber-400/10 rounded">
                sticky
              </span>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => moveField(i, -1)}
                disabled={i === 0}
                className="p-1 text-white/30 hover:text-white/60 disabled:opacity-20 transition"
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => moveField(i, 1)}
                disabled={i === fields.length - 1}
                className="p-1 text-white/30 hover:text-white/60 disabled:opacity-20 transition"
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => toggleSticky(i)}
                className={cn(
                  "p-1 transition",
                  field.sticky
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-white/30 hover:text-white/60",
                )}
                title={field.sticky ? "Unpin (not sticky)" : "Pin (sticky)"}
              >
                {field.sticky ? (
                  <Pin className="h-3 w-3" />
                ) : (
                  <PinOff className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditName(field.name);
                  setEditingIndex(i);
                }}
                className="p-1 text-white/30 hover:text-white/60 transition"
                title="Rename"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => removeField(i)}
                disabled={fields.length <= minFields}
                className="p-1 text-white/30 hover:text-rose-400 disabled:opacity-20 transition"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
