"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Default ocean-metaphor labels aligned with Fluensea onboarding steps
const DEFAULT_LABELS = [
  "Surface",
  "Choose",
  "Assess",
  "Listen",
  "Read",
  "Results",
  "Interests",
  "Dive",
];

interface ProgressDepthMeterProps {
  /** 1-based current step number */
  currentStep: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Optional custom labels shown on hover */
  labels?: string[];
  className?: string;
}

export function ProgressDepthMeter({
  currentStep,
  totalSteps = 8,
  labels = DEFAULT_LABELS,
  className,
}: ProgressDepthMeterProps) {
  // Track previous step to know which direction fill is moving
  const [renderedStep, setRenderedStep] = useState(currentStep);
  const prevStepRef = useRef(currentStep);
  // The 1-based step that just transitioned from "current" → "completed" (null when idle)
  const [sweepStep, setSweepStep] = useState<number | null>(null);

  // Tiny delay so React paints the baseline width before the transition fires
  useEffect(() => {
    const id = requestAnimationFrame(() => setRenderedStep(currentStep));
    return () => cancelAnimationFrame(id);
  }, [currentStep]);

  // Detect forward step changes and trigger the sweep animation on the pip
  // that was just completed (i.e., the previous step number).
  useEffect(() => {
    if (currentStep > prevStepRef.current) {
      const justCompleted = prevStepRef.current;
      setSweepStep(justCompleted);

      // Remove the sweep class after the animation finishes (450ms + buffer)
      const timer = setTimeout(() => setSweepStep(null), 520);
      prevStepRef.current = currentStep;
      return () => clearTimeout(timer);
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  // The connector line sits *between* adjacent nodes, so there are (n-1) segments
  const segments = totalSteps - 1;

  return (
    <div
      className={cn("progress-depth-meter", className)}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      {/* ── Track (behind nodes & connector) ── */}
      <div className="pdm-track">
        {/* Gray baseline */}
        <div className="pdm-track-base" />

        {/* Teal gradient fill — width animates with CSS transition */}
        <div
          className="pdm-track-fill"
          style={{
            width:
              segments > 0 ? `${((renderedStep - 1) / segments) * 100}%` : "0%",
          }}
        />
      </div>

      {/* ── Nodes ── */}
      <div className="pdm-nodes">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const completed = stepNum < renderedStep;
          const current = stepNum === renderedStep;
          const isSweeping = stepNum === sweepStep;
          const label = labels[i] ?? `Step ${stepNum}`;

          return (
            <div key={i} className="pdm-node-wrapper">
              {/* Node circle */}
              <div
                className={cn(
                  "pdm-node",
                  completed && "pdm-node--completed",
                  current && "pdm-node--current",
                  !completed && !current && "pdm-node--upcoming",
                  // Left-to-right flash sweep — applied only while fresh
                  isSweeping && "pdm-node--sweep",
                )}
                aria-hidden="true"
              />

              {/* Hover label */}
              <span className="pdm-label" aria-hidden="true">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
