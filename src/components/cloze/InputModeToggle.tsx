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
  badge?: string;
}[] = [
  {
    value: "type",
    label: "Type",
    shortLabel: "Type",
    Icon: PenLine,
    badge: "Most effective",
  },
  { value: "choice", label: "Multiple Choice", shortLabel: "MC", Icon: Layers },
  { value: "wordbank", label: "Word Bank", shortLabel: "Bank", Icon: Shuffle },
];

export function InputModeToggle({ mode, onChange }: InputModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
      {modes.map(({ value, label, shortLabel, Icon, badge }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            mode === value
              ? "bg-teal-500/20 text-teal-400 border border-teal-400/30"
              : "text-white/50 hover:text-white/70 hover:bg-white/5 border border-transparent",
          )}
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{shortLabel}</span>
          {badge && (
            <span className="hidden md:inline-flex absolute -top-2.5 -right-1 px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/30 whitespace-nowrap">
              {badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
