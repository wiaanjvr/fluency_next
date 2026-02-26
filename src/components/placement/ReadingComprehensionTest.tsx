"use client";

import React, { useState, useEffect } from "react";
import { ReadingTestItem, TestResponse } from "@/types/placement-test";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

interface ReadingComprehensionTestProps {
  item: ReadingTestItem;
  itemIndex: number;
  totalItems: number;
  onAnswer: (response: TestResponse) => void;
}

export function ReadingComprehensionTest({
  item,
  itemIndex,
  totalItems,
  onAnswer,
}: ReadingComprehensionTestProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Reset state when item changes
    setSelectedIndex(null);
  }, [item.id]);

  const handleSelectOption = (index: number) => {
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;

    const response: TestResponse = {
      itemId: item.id,
      selectedIndex,
      isCorrect: selectedIndex === item.correctIndex,
      timeSpentMs: Date.now() - startTime,
    };

    onAnswer(response);
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      A1: "Beginner",
      A2: "Elementary",
      B1: "Intermediate",
      B2: "Upper Intermediate",
      C1: "Advanced",
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <Card className="ocean-card w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4 text-sm text-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Reading {itemIndex + 1} of {totalItems}
            </CardTitle>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-900/40 text-teal-300 border border-teal-700/30">
            {getDifficultyLabel(item.difficulty)}
          </span>
        </div>

        {/* Passage */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <p className="text-sm leading-relaxed text-gray-300">
            {item.passage}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 text-sm text-gray-300">
        {/* Question */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">{item.question}</h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {item.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-all duration-150",
                "border-white/10 bg-white/[0.03] text-gray-200",
                "hover:border-teal-500/40 hover:bg-teal-500/[0.08] hover:translate-x-1",
                selectedIndex === index
                  ? "border-teal-400/60 bg-teal-500/[0.15] translate-x-0"
                  : "",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold mr-3 flex-shrink-0 transition-colors duration-150",
                  selectedIndex === index
                    ? "bg-teal-500 text-white"
                    : "bg-white/10 text-gray-300",
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={selectedIndex === null}
          className={cn(
            "w-full transition-all duration-200",
            selectedIndex === null
              ? "opacity-40 cursor-not-allowed pointer-events-none"
              : "shadow-[0_0_20px_rgba(0,212,184,0.25)]",
          )}
          size="lg"
        >
          Submit Answer
        </Button>
      </CardContent>
    </Card>
  );
}
