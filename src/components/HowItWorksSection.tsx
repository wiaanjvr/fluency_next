"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Volume2,
  Brain,
  Mic,
  RotateCcw,
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Compass,
  MessageCircle,
  Swords,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ============================================================
   STEP DATA — titles + descriptions kept verbatim
   ============================================================ */
const STEPS = [
  {
    icon: Volume2,
    title: "Listen & absorb",
    desc: "Let the language wash over you first",
  },
  {
    icon: Brain,
    title: "Flow with context",
    desc: "95% familiar, 5% new — ride the current",
  },
  {
    icon: Mic,
    title: "Surface & speak",
    desc: "Express from real understanding",
  },
  {
    icon: RotateCcw,
    title: "Dive deeper",
    desc: "Spaced repetition guides your depth",
  },
] as const;

/* ============================================================
   UNIFIED KNOWLEDGE GRAPH — 8 mode nodes + edges
   Node indices match GRAPH_NODES order.
   Skill edges reflect shared skill tags between modes.
   ============================================================ */
type GraphNode = {
  id: number;
  label: string;
  Icon: LucideIcon;
  cx: number; // position in 240×90 SVG viewBox
  cy: number;
  skill: string;
};

const GRAPH_NODES: GraphNode[] = [
  {
    id: 0,
    label: "Free Reading",
    Icon: BookOpen,
    cx: 20,
    cy: 22,
    skill: "reading",
  },
  { id: 1, label: "Cloze", Icon: PenLine, cx: 68, cy: 14, skill: "writing" },
  { id: 2, label: "Flashcards", Icon: Layers, cx: 122, cy: 22, skill: "vocab" },
  {
    id: 3,
    label: "Conjugation",
    Icon: GitBranch,
    cx: 176,
    cy: 14,
    skill: "grammar",
  },
  {
    id: 4,
    label: "Pronunciation",
    Icon: Mic,
    cx: 28,
    cy: 70,
    skill: "speaking",
  },
  { id: 5, label: "Grammar", Icon: Compass, cx: 86, cy: 76, skill: "grammar" },
  {
    id: 6,
    label: "Conversation",
    Icon: MessageCircle,
    cx: 154,
    cy: 70,
    skill: "speaking",
  },
  { id: 7, label: "Duel", Icon: Swords, cx: 212, cy: 76, skill: "compete" },
];

const GRAPH_EDGES: [number, number][] = [
  [0, 1], // Free Reading ↔ Cloze (reading)
  [0, 2], // Free Reading ↔ Flashcards (vocab)
  [0, 5], // Free Reading ↔ Grammar (reading)
  [1, 3], // Cloze ↔ Conjugation (writing)
  [1, 5], // Cloze ↔ Grammar (reading)
  [2, 7], // Flashcards ↔ Duel (competitive vocab)
  [3, 5], // Conjugation ↔ Grammar
  [3, 4], // Conjugation ↔ Pronunciation (output)
  [4, 6], // Pronunciation ↔ Conversation (speaking/listening)
  [6, 5], // Conversation ↔ Grammar (contextual)
];

const SKILL_COLORS: Record<string, string> = {
  reading: "#8ab4f8",
  writing: "#c4b5fd",
  vocab: "#2DD4BF",
  grammar: "#a78bfa",
  speaking: "#f9a8d4",
  compete: "#fb923c",
};

type WaveConfig = {
  primaryNode: number;
  activeNodes: number[];
  activityLabel: string;
};

const WAVE_CONFIGS: WaveConfig[] = [
  { primaryNode: 0, activeNodes: [0, 4, 6], activityLabel: "LISTEN FIRST" },
  { primaryNode: 1, activeNodes: [1, 5, 0], activityLabel: "NEW IN CONTEXT" },
  { primaryNode: 4, activeNodes: [4, 6, 3], activityLabel: "YOUR TURN" },
  { primaryNode: 2, activeNodes: [2, 7, 1], activityLabel: "REVIEW" },
];

const INTERVAL_MS = 3500;

/* ============================================================
   KNOWLEDGE GRAPH — persistent SVG constellation
   ============================================================ */
function KnowledgeGraph({
  activeNodes,
  primaryNode,
}: {
  activeNodes: number[];
  primaryNode: number;
}) {
  return (
    <div className="hiw-kg-wrapper" aria-hidden="true">
      <p className="hiw-kg-label">UNIFIED KNOWLEDGE GRAPH</p>
      <svg
        viewBox="0 0 240 90"
        className="hiw-kg-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {GRAPH_EDGES.map(([a, b], i) => {
          const na = GRAPH_NODES[a];
          const nb = GRAPH_NODES[b];
          const bothActive = activeNodes.includes(a) && activeNodes.includes(b);
          return (
            <line
              key={i}
              x1={na.cx}
              y1={na.cy}
              x2={nb.cx}
              y2={nb.cy}
              stroke={
                bothActive ? "rgba(45,212,191,0.35)" : "rgba(255,255,255,0.05)"
              }
              strokeWidth={bothActive ? 1 : 0.5}
            />
          );
        })}

        {GRAPH_NODES.map((node) => {
          const isPrimary = node.id === primaryNode;
          const isActive = activeNodes.includes(node.id);
          const color = SKILL_COLORS[node.skill];
          return (
            <g key={node.id}>
              {isPrimary && (
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={7}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.35"
                />
              )}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={isPrimary ? 4 : isActive ? 3 : 2}
                fill={
                  isPrimary
                    ? color
                    : isActive
                      ? color
                      : "rgba(255,255,255,0.12)"
                }
                opacity={isPrimary ? 1 : isActive ? 0.65 : 1}
              />
              <text
                x={node.cx}
                y={node.cy + (node.cy < 45 ? -7 : 10)}
                textAnchor="middle"
                fontSize="5.5"
                fill={
                  isPrimary
                    ? color
                    : isActive
                      ? "rgba(255,255,255,0.45)"
                      : "rgba(255,255,255,0.15)"
                }
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================
   ENGINE ROUTING DISPLAY
   ============================================================ */
function EngineRouting({
  primaryNode,
  activeNodes,
}: {
  primaryNode: number;
  activeNodes: number[];
}) {
  const primary = GRAPH_NODES[primaryNode];
  const PrimaryIcon = primary.Icon;
  const primaryColor = SKILL_COLORS[primary.skill];
  const alternatives = activeNodes
    .filter((id) => id !== primaryNode)
    .map((id) => GRAPH_NODES[id]);

  return (
    <div className="hiw-engine-block">
      <div className="hiw-engine-row">
        <span className="hiw-engine-tag">ENGINE SELECTED</span>
        <div className="hiw-engine-alts" aria-label="Also available">
          {alternatives.map((alt) => {
            const AltIcon = alt.Icon;
            return (
              <span
                key={alt.id}
                className="hiw-engine-alt-chip"
                title={alt.label}
              >
                <AltIcon width={9} height={9} />
                {alt.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="hiw-engine-primary" style={{ color: primaryColor }}>
        <div
          className="hiw-engine-icon-wrap"
          style={{
            background: `${primaryColor}18`,
            borderColor: `${primaryColor}40`,
          }}
        >
          <PrimaryIcon width={14} height={14} />
        </div>
        <span className="hiw-engine-mode-name">{primary.label}</span>
        <span
          className="hiw-engine-active-dot"
          style={{ background: primaryColor }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);
  const [audioProgress, setAudioProgress] = useState(33);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoveredRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedRef = useRef(false);

  useEffect(() => {
    prefersReducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  const transitionToStep = useCallback((next: number) => {
    setCardVisible(false);
    setShowAnswer(false);
    setTimeout(() => {
      setActiveStep(next);
      setCardVisible(true);
    }, 200);
  }, []);

  const startInterval = useCallback(() => {
    if (prefersReducedRef.current) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isHoveredRef.current) {
        setActiveStep((prev) => {
          const next = (prev + 1) % 4;
          setCardVisible(false);
          setShowAnswer(false);
          setTimeout(() => setCardVisible(true), 200);
          return next;
        });
      }
    }, INTERVAL_MS);
  }, []);

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startInterval]);

  useEffect(() => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (activeStep === 0) {
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 96) return 30;
          return prev + 0.4;
        });
      }, 50);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [activeStep]);

  /* --- IntersectionObserver for scroll entrance --- */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (prefersReducedRef.current) {
      setSectionVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  /* --- Manual step selection --- */
  const handleStepClick = useCallback(
    (index: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      transitionToStep(index);
      startInterval();
    },
    [transitionToStep, startInterval],
  );

  const wave = WAVE_CONFIGS[activeStep];

  return (
    <section
      ref={sectionRef}
      className="hiw-section"
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
    >
      {/* Ambient radial glow behind card */}
      <div className="hiw-ambient-glow" aria-hidden="true" />

      <div className="hiw-container">
        {/* Section label */}
        <div
          className={`hiw-label-wrapper${sectionVisible ? " hiw-label-visible" : ""}`}
        >
          <span className="hiw-rule" aria-hidden="true" />
          <p className="hiw-overline">HOW IT WORKS</p>
          <span className="hiw-rule" aria-hidden="true" />
        </div>

        {/* Headline — "waves" receives shimmer */}
        <h2
          className={`hiw-headline${sectionVisible ? " hiw-headline-visible" : ""}`}
        >
          Four{" "}
          <span className="hiw-waves-shimmer" aria-label="waves">
            waves
          </span>
          . Every lesson.
        </h2>

        {/* Sub-headline — engine + 8 modes */}
        <p
          className={`hiw-sub-headline${sectionVisible ? " hiw-sub-headline-visible" : ""}`}
        >
          One engine. Eight modes. Always the right next challenge.
        </p>

        {/* Two-column grid */}
        <div className="hiw-grid">
          {/* ===== LEFT: Four steps ===== */}
          <div className="hiw-steps">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === i;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  className={[
                    "hiw-step",
                    isActive ? "hiw-step--active" : "",
                    sectionVisible ? "hiw-step-visible" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    transitionDelay: sectionVisible
                      ? `${i * 100 + 150}ms`
                      : "0ms",
                  }}
                  onClick={() => handleStepClick(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStepClick(i);
                    }
                  }}
                >
                  {/* Icon */}
                  <div
                    className={`hiw-step-icon-wrap${isActive ? " hiw-step-icon-wrap--active" : ""}`}
                  >
                    <Icon
                      className="hiw-step-icon"
                      style={{ color: isActive ? "#2DD4BF" : "#2A5F6A" }}
                    />
                  </div>

                  {/* Text */}
                  <div className="hiw-step-body">
                    <h3
                      className="hiw-step-title"
                      style={{ color: isActive ? "#E8F4F8" : "#7A9BAA" }}
                    >
                      {step.title}
                    </h3>
                    <p className="hiw-step-desc">{step.desc}</p>

                    {/* Progress bar — only on active step, only if motion allowed */}
                    {isActive && !prefersReducedRef.current && (
                      <div className="hiw-progress-track" aria-hidden="true">
                        <div key={`pb-${i}`} className="hiw-progress-fill" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== RIGHT: Lesson preview card ===== */}
          <div
            className={`hiw-card${sectionVisible ? " hiw-card-visible" : ""}`}
            aria-live="polite"
            aria-label="Lesson preview — updates with each step"
          >
            {/* Card header */}
            <div className="hiw-card-header">
              <span className="hiw-card-label">LESSON PREVIEW</span>
              <span className="hiw-card-level">A1 • Beginner</span>
            </div>

            {/* Animated card body */}
            <div
              className="hiw-card-body"
              style={{
                opacity: cardVisible ? 1 : 0,
                transition: "opacity 300ms ease",
              }}
            >
              {/* Engine routing — always shown, swaps per wave */}
              <EngineRouting
                primaryNode={wave.primaryNode}
                activeNodes={wave.activeNodes}
              />

              <div className="hiw-card-divider" aria-hidden="true" />

              {/* Per-step activity */}
              <div className="hiw-card-activity">
                {activeStep === 0 && (
                  <StepListenContent label={wave.activityLabel} />
                )}
                {activeStep === 1 && (
                  <StepFlowContent label={wave.activityLabel} />
                )}
                {activeStep === 2 && (
                  <StepSpeakContent label={wave.activityLabel} />
                )}
                {activeStep === 3 && (
                  <StepDiveContent
                    label={wave.activityLabel}
                    showAnswer={showAnswer}
                    onShowAnswer={() => setShowAnswer(true)}
                  />
                )}
              </div>

              {/* Unified Knowledge Graph — persistent */}
              <KnowledgeGraph
                activeNodes={wave.activeNodes}
                primaryNode={wave.primaryNode}
              />
            </div>

            {/* Audio player */}
            <div className="hiw-audio-player">
              <button
                className="hiw-play-btn"
                aria-label="Play audio sample"
                type="button"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <polygon points="3,1 13,7 3,13" fill="#0D2137" />
                </svg>
              </button>

              <div className="hiw-audio-track" aria-hidden="true">
                <div
                  className="hiw-audio-fill"
                  style={{
                    width: `${audioProgress}%`,
                    transition:
                      activeStep === 0
                        ? "width 0.08s linear"
                        : "width 0.5s ease",
                  }}
                />
              </div>

              <span className="hiw-audio-time">0:47</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CARD ACTIVITY CONTENT — per step
   ============================================================ */

function StepListenContent({ label }: { label: string }) {
  return (
    <div className="hiw-card-step">
      <p className="hiw-card-step-label">{label}</p>
      <p
        className="hiw-card-sentence"
        style={{ filter: "blur(2px)", userSelect: "none" }}
        aria-label="Foreign language sentence — focus on listening, not reading"
      >
        Le soleil se couche sur la mer turquoise.
      </p>
      <p className="hiw-card-sentence-sub">Let it wash over you.</p>
    </div>
  );
}

function StepFlowContent({ label }: { label: string }) {
  return (
    <div className="hiw-card-step">
      <p className="hiw-card-step-label">{label}</p>
      <p className="hiw-card-sentence">
        Le soleil se <span className="hiw-highlight-word">couche</span> sur la
        mer <span className="hiw-highlight-word">turquoise</span>.
      </p>
      <div className="hiw-vocab-chips">
        <span className="hiw-vocab-chip">
          couche <span className="hiw-chip-def">sets / lies down</span>
        </span>
        <span className="hiw-vocab-chip">
          turquoise <span className="hiw-chip-def">turquoise</span>
        </span>
      </div>
    </div>
  );
}

function StepSpeakContent({ label }: { label: string }) {
  const barHeights = [3, 6, 10, 7, 12, 9, 5, 8, 11, 6, 4, 7, 9, 5, 3];
  return (
    <div className="hiw-card-step">
      <p className="hiw-card-step-label">{label}</p>
      <div className="hiw-speak-prompt">
        <div className="hiw-mic-circle" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect
              x="7"
              y="1"
              width="6"
              height="11"
              rx="3"
              stroke="#2DD4BF"
              strokeWidth="1.5"
            />
            <path
              d="M4 10c0 3.314 2.686 6 6 6s6-2.686 6-6"
              stroke="#2DD4BF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="16"
              x2="10"
              y2="19"
              stroke="#2DD4BF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="hiw-waveform" aria-hidden="true">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="hiw-waveform-bar"
              style={{
                height: `${h * 2}px`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>
        <p className="hiw-speak-cue">Speak now</p>
      </div>
    </div>
  );
}

function StepDiveContent({
  label,
  showAnswer,
  onShowAnswer,
}: {
  label: string;
  showAnswer: boolean;
  onShowAnswer: () => void;
}) {
  return (
    <div className="hiw-card-step">
      <p className="hiw-card-step-label">{label}</p>
      <div className="hiw-srs-card">
        <p className="hiw-srs-word">couche</p>

        {showAnswer ? (
          <>
            <p className="hiw-srs-answer">sets / lies down</p>
            <div
              className="hiw-srs-ratings"
              role="group"
              aria-label="Rate your recall"
            >
              <button className="hiw-rating hiw-rating--hard" type="button">
                Hard
              </button>
              <button className="hiw-rating hiw-rating--ok" type="button">
                Good
              </button>
              <button className="hiw-rating hiw-rating--easy" type="button">
                Easy
              </button>
            </div>
          </>
        ) : (
          <button
            className="hiw-show-answer-btn"
            onClick={onShowAnswer}
            type="button"
          >
            Show answer
          </button>
        )}
      </div>
    </div>
  );
}
