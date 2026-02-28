"use client";

import { useRef, useEffect } from "react";
import {
  MoreHorizontal,
  Pencil,
  Flag,
  Bookmark,
  Pause,
  Trash2,
  EyeOff,
  Info,
  Volume2,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MoreMenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  active?: boolean;
  onClick: () => void;
}

interface StudyMoreMenuProps {
  open: boolean;
  onClose: () => void;
  actions: MoreMenuAction[];
}

/**
 * Floating "More" menu attached to the card during review.
 * Shows actions: edit, flag, mark, suspend, bury, info, delete, audio.
 */
export function StudyMoreMenu({ open, onClose, actions }: StudyMoreMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Slight delay to avoid triggering on the same click that opened the menu
    const timer = setTimeout(
      () => document.addEventListener("click", handleClick),
      10,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute right-0 top-full mt-2 z-50 w-56",
        "rounded-xl border border-white/10 bg-[#0d2137] shadow-2xl",
        "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150",
      )}
    >
      <div className="py-1.5">
        {actions.map((action, i) => (
          <button
            key={action.key}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition",
              action.danger
                ? "text-rose-300 hover:bg-rose-500/10"
                : action.active
                  ? "text-teal-300 hover:bg-teal-500/10"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="flex-shrink-0 opacity-60">{action.icon}</span>
            <span className="flex-1 text-left">{action.label}</span>
            {action.shortcut && (
              <kbd className="text-[10px] text-white/30 bg-white/5 rounded px-1.5 py-0.5 font-mono">
                {action.shortcut}
              </kbd>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The "More" trigger button (three dots), placed in the card header bar.
 */
export function MoreMenuTrigger({
  onClick,
  isFlagged,
  isMarked,
}: {
  onClick: () => void;
  isFlagged?: boolean;
  isMarked?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {isFlagged && (
        <Flag className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
      )}
      {isMarked && (
        <Bookmark className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
      )}
      <button
        onClick={onClick}
        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition"
        title="More actions (.)"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Build the standard set of "More" menu actions. */
export function buildMoreMenuActions({
  isFlagged,
  isMarked,
  hasAudio,
  onEdit,
  onFlag,
  onMark,
  onSuspend,
  onBury,
  onInfo,
  onDelete,
  onReplayAudio,
  onRecordVoice,
}: {
  isFlagged: boolean;
  isMarked: boolean;
  hasAudio: boolean;
  onEdit: () => void;
  onFlag: () => void;
  onMark: () => void;
  onSuspend: () => void;
  onBury: () => void;
  onInfo: () => void;
  onDelete: () => void;
  onReplayAudio: () => void;
  onRecordVoice: () => void;
}): MoreMenuAction[] {
  return [
    {
      key: "edit",
      label: "Edit Card",
      icon: <Pencil className="h-4 w-4" />,
      shortcut: "E",
      onClick: onEdit,
    },
    {
      key: "flag",
      label: isFlagged ? "Unflag Card" : "Flag Card",
      icon: <Flag className="h-4 w-4" />,
      shortcut: "F",
      active: isFlagged,
      onClick: onFlag,
    },
    {
      key: "mark",
      label: isMarked ? "Unmark Card" : "Mark Card",
      icon: <Bookmark className="h-4 w-4" />,
      shortcut: "M",
      active: isMarked,
      onClick: onMark,
    },
    {
      key: "replay",
      label: "Replay Audio",
      icon: <Volume2 className="h-4 w-4" />,
      shortcut: "R",
      onClick: onReplayAudio,
    },
    {
      key: "record",
      label: "Record & Compare",
      icon: <Mic className="h-4 w-4" />,
      onClick: onRecordVoice,
    },
    {
      key: "info",
      label: "Card Info",
      icon: <Info className="h-4 w-4" />,
      shortcut: "I",
      onClick: onInfo,
    },
    {
      key: "bury",
      label: "Bury (until tomorrow)",
      icon: <EyeOff className="h-4 w-4" />,
      shortcut: "B",
      onClick: onBury,
    },
    {
      key: "suspend",
      label: "Suspend",
      icon: <Pause className="h-4 w-4" />,
      shortcut: "S",
      onClick: onSuspend,
    },
    {
      key: "delete",
      label: "Delete Card",
      icon: <Trash2 className="h-4 w-4" />,
      shortcut: "Del",
      danger: true,
      onClick: onDelete,
    },
  ];
}
