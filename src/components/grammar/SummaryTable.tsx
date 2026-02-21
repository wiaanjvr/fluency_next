"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { SummaryTableData } from "@/types/grammar.types";

interface SummaryTableProps {
  data: SummaryTableData;
  className?: string;
  accentColor?: string;
}

export function SummaryTable({
  data,
  className,
  accentColor = "#0077B6",
}: SummaryTableProps) {
  if (!data || !data.headers || !data.rows) return null;

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border/50",
        className,
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white" style={{ backgroundColor: accentColor }}>
            {data.headers.map((header, i) => (
              <th
                key={i}
                className={cn(
                  "px-4 py-3 text-left font-medium whitespace-nowrap sticky top-0",
                  i === 0 && "rounded-tl-xl",
                  i === data.headers.length - 1 && "rounded-tr-xl",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={cn(
                "border-t border-border/30 transition-colors",
                rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20",
                "hover:bg-ocean-turquoise/5",
              )}
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className={cn(
                    "px-4 py-2.5 whitespace-nowrap",
                    cellIdx === 0 && "font-medium text-foreground",
                  )}
                >
                  {/* Highlight text wrapped in ** */}
                  {cell.includes("**") ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: cell.replace(
                          /\*\*(.*?)\*\*/g,
                          '<mark class="bg-[#F4A261]/30 text-foreground px-0.5 rounded font-semibold">$1</mark>',
                        ),
                      }}
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
