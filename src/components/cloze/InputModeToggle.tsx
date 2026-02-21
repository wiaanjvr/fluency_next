"use client";

import type { InputMode } from "@/types/cloze";
import { cn } from "@/lib/utils";
import { PenLine, Layers, Shuffle } from "lucide-react";

interface InputModeToggleProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

const modes: {
  value: InputMode;
  label: string;
  shortLabel: string;
  Icon: React.ElementType;
}[] = [
  { value: "type", label: "Type", shortLabel: "Type", Icon: PenLine },
  { value: "choice", label: "Multiple Choice", shortLabel: "MC", Icon: Layers },
  { value: "wordbank", label: "Word Bank", shortLabel: "Bank", Icon: Shuffle },
];

export function InputModeToggle({ mode, onChange }: InputModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
      {modes.map(({ value, label, shortLabel, Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            mode === value
              ? "bg-teal-500/20 text-teal-400 border border-teal-400/30"
              : "text-white/50 hover:text-white/70 hover:bg-white/5 border border-transparent",
          )}
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
