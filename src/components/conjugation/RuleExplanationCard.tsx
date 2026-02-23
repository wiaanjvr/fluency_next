"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Ruler } from "lucide-react";

interface RuleExplanationCardProps {
  explanation: string;
  defaultExpanded?: boolean;
}

export function RuleExplanationCard({
  explanation,
  defaultExpanded = false,
}: RuleExplanationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return (
    <div
      className={cn(
        "rounded-2xl border-[1.5px] border-white/5 bg-white/[0.02]",
        "border-l-[3px] border-l-ocean-turquoise/40",
        "overflow-hidden transition-all duration-300",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3",
          "text-sm text-muted-foreground font-light",
          "transition-colors hover:text-foreground",
        )}
      >
        <Ruler className="h-3.5 w-3.5 text-ocean-turquoise shrink-0" />
        <span>Grammar note</span>
        {expanded ? (
          <ChevronUp className="ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-sm font-light text-foreground/80 leading-relaxed">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
