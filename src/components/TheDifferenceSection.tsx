"use client";

import { useRef, useEffect, useState, useCallback } from "react";

/* ============================================================
   THE DIFFERENCE SECTION
   Left:  headline + body copy + four methodology pills
   Right: animated progress card with scroll-triggered counters
   Scroll entrance: left slides from -24px, right from +24px
   Progress bars + counters begin 750ms after section enters
   ============================================================ */

type Tab = "7days" | "30days" | "alltime";

/* rAF-based counter — cubic-ease-out, fires after `delay` ms */
function animateCounter(
  from: number,
  to: number,
  duration: number,
  setter: (val: number) => void,
  delay: number,
): void {
  setTimeout(() => {
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setter(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, delay);
}

export function TheDifferenceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [animated, setAnimated] = useState(false);
  const [vocabCount, setVocabCount] = useState(0);
  const [speakingCount, setSpeakingCount] = useState(0);
  const [daysCount, setDaysCount] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("30days");

  const triggerAnimations = useCallback((instant: boolean) => {
    setAnimated(true);
    if (instant) {
      // prefers-reduced-motion: show final values immediately
      setVocabCount(847);
      setSpeakingCount(72);
      setDaysCount(47);
    } else {
      // Bars fire at 750ms total from scroll trigger (600ms entrance + 150ms buffer)
      animateCounter(0, 847, 1200, setVocabCount, 0);
      animateCounter(0, 72, 1200, setSpeakingCount, 300);
      animateCounter(0, 47, 1200, setDaysCount, 450);
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced) {
      section.classList.add("diff-visible");
      triggerAnimations(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("diff-visible");
          // Wait for card entrance (150ms delay + 600ms duration) before bars start
          setTimeout(() => triggerAnimations(false), 750);
          observer.disconnect(); // animate only once
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [triggerAnimations]);

  const PILLS = [
    "Comprehensible input",
    "Spaced repetition",
    "Native content",
    "Speaking practice",
  ] as const;

  const TAB_LABELS: Record<Tab, string> = {
    "7days": "7 days",
    "30days": "30 days",
    alltime: "All time",
  };

  return (
    <section ref={sectionRef} className="diff-section">
      {/* Depth background elements */}
      <div className="diff-ambient-glow" aria-hidden="true" />
      <div className="diff-light-shaft" aria-hidden="true" />

      <div className="diff-container">
        {/* ── Section label ── */}
        <div
          className="diff-label-wrapper"
          aria-label="Section: The Difference"
        >
          <span className="diff-rule" aria-hidden="true" />
          <p className="diff-overline">The Difference</p>
          <span className="diff-rule" aria-hidden="true" />
        </div>

        {/* ── Two-column grid ── */}
        <div className="diff-grid">
          {/* ─── LEFT COLUMN ─── */}
          <div className="diff-left">
            {/* Headline — two lines, one thought */}
            <div className="diff-headline-block">
              <span className="diff-line1">Put in the reps.</span>
              <span className="diff-line2 diff-shimmer">Earn the results.</span>
            </div>

            {/* Body copy */}
            <p className="diff-body">
              Each lesson builds on what you know, adding carefully measured
              challenges.{" "}
              <span className="diff-bold-teal">Track your streak</span>.
              Complete your daily sessions. Watch your{" "}
              <span className="diff-bold-teal">vocabulary expand</span>.{" "}
              <span className="diff-bold-teal">
                Consistency turns effort into fluency
              </span>
              .
            </p>

            {/* Four methodology pills */}
            <div
              className="diff-pills"
              role="list"
              aria-label="Learning methodology"
            >
              {PILLS.map((pill) => (
                <div key={pill} className="diff-pill" role="listitem">
                  <span className="diff-pill-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>{pill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT COLUMN — Progress Card ─── */}
          <div className="diff-right">
            <div className="diff-card">
              {/* Card header */}
              <div className="diff-card-header">
                <div className="diff-pulse-wrap" aria-hidden="true">
                  <div className="diff-pulse-dot" />
                </div>
                <span className="diff-card-title">Your progress</span>
              </div>

              {/* Timeframe toggle */}
              <div
                className="diff-tabs"
                role="tablist"
                aria-label="Progress timeframe"
              >
                {(["7days", "30days", "alltime"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={`diff-tab${activeTab === tab ? " diff-tab-active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>

              {/* ── Metrics ── */}
              <div className="diff-metrics">
                {/* Known vocabulary */}
                <div className="diff-metric">
                  <div className="diff-metric-row">
                    <span className="diff-metric-label">Known vocabulary</span>
                    <span className="diff-metric-value">
                      {animated ? vocabCount : 0}&nbsp;words
                    </span>
                  </div>
                  <div className="diff-bar-track">
                    <div
                      className="diff-bar-fill"
                      role="progressbar"
                      aria-valuenow={animated ? 72 : 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Known vocabulary progress"
                      style={{
                        width: animated ? "72%" : "0%",
                        transitionDelay: "0ms",
                      }}
                    />
                  </div>
                </div>

                {/* Comprehension */}
                <div className="diff-metric">
                  <div className="diff-metric-row">
                    <span className="diff-metric-label">Comprehension</span>
                    <span
                      className="diff-metric-value diff-fade-in"
                      style={{
                        opacity: animated ? 1 : 0,
                        transition: "opacity 600ms ease-out",
                        transitionDelay: animated ? "150ms" : "0ms",
                      }}
                    >
                      A2
                    </span>
                  </div>
                  <div className="diff-bar-track">
                    <div
                      className="diff-bar-fill"
                      role="progressbar"
                      aria-valuenow={animated ? 45 : 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Comprehension level progress"
                      style={{
                        width: animated ? "45%" : "0%",
                        transitionDelay: "150ms",
                      }}
                    />
                  </div>
                </div>

                {/* Speaking confidence */}
                <div className="diff-metric">
                  <div className="diff-metric-row">
                    <span className="diff-metric-label">
                      Speaking confidence
                    </span>
                    <span className="diff-metric-value">
                      {animated ? speakingCount : 0}%
                    </span>
                  </div>
                  <div className="diff-bar-track">
                    <div
                      className="diff-bar-fill"
                      role="progressbar"
                      aria-valuenow={animated ? 72 : 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Speaking confidence progress"
                      style={{
                        width: animated ? "72%" : "0%",
                        transitionDelay: "300ms",
                      }}
                    />
                  </div>
                </div>

                {/* Days consistent — streak hook */}
                <div className="diff-metric">
                  <div className="diff-metric-row">
                    <span className="diff-metric-label">
                      Days consistent{" "}
                      <span className="diff-flame" aria-label="streak">
                        🔥
                      </span>
                    </span>
                    <span className="diff-metric-value diff-streak-value">
                      {animated ? daysCount : 0}&nbsp;days
                    </span>
                  </div>
                  <div className="diff-bar-track">
                    <div
                      className="diff-bar-fill diff-bar-streak"
                      role="progressbar"
                      aria-valuenow={animated ? 65 : 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Days consistent progress"
                      style={{
                        width: animated ? "65%" : "0%",
                        transitionDelay: "450ms",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="diff-card-footer">
                Based on 30 days of consistent practice
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
