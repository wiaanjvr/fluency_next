"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ============================================================================
// Dive Transition - Cinematic Signature Moment
// Award-winning production-grade dive animation
// ============================================================================

interface DiveTransitionProps {
  children: React.ReactNode;
}

interface DiveState {
  isActive: boolean;
  phase:
    | "idle"
    | "stance"
    | "launch"
    | "arc"
    | "entry"
    | "splash"
    | "submerge"
    | "complete";
  targetPath: string;
}

interface DiverPose {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  hairFlow: number;
}

interface Droplet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface SplashPath {
  id: number;
  type: "column" | "curtainLeft" | "curtainRight";
  progress: number;
}

// ============================================================================
// Premium Diver SVG - Anatomically Accurate Human Figure
// ============================================================================
function DiverSVG({
  className,
  style,
  hairFlow = 0,
  phase,
}: {
  className?: string;
  style?: React.CSSProperties;
  hairFlow?: number;
  phase?: string;
}) {
  // Hair flows more dramatically during dive
  const hairOffset = hairFlow * 15;
  const hairWave = Math.sin(hairFlow * Math.PI) * 8;

  return (
    <svg
      viewBox="0 0 60 150"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Body gradient for 3D depth */}
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f5e6d3" />
          <stop offset="40%" stopColor="#e8d4c0" />
          <stop offset="100%" stopColor="#d4bfa8" />
        </linearGradient>

        {/* Swimsuit gradient - Deep Navy */}
        <linearGradient
          id="swimsuitGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#1a365d" />
          <stop offset="50%" stopColor="#0f2442" />
          <stop offset="100%" stopColor="#0a1628" />
        </linearGradient>

        {/* Hair gradient */}
        <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a3728" />
          <stop offset="100%" stopColor="#2d1f14" />
        </linearGradient>

        {/* Shadow gradient for depth */}
        <linearGradient id="shadowGradient" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.15)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>

        {/* Highlight gradient */}
        <linearGradient
          id="highlightGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* ===== HAIR (Flowing behind) ===== */}
      <g
        className="diver-hair"
        style={{ transform: `translateX(${hairOffset}px)` }}
      >
        {/* Main hair mass */}
        <path
          d={`M30 8 
              Q${25 + hairWave} ${-2 + hairOffset} ${18 + hairWave * 0.5} ${-8 + hairOffset * 1.2}
              Q${12 + hairWave} ${-12 + hairOffset * 1.5} ${8 + hairWave * 0.3} ${-6 + hairOffset * 1.8}
              Q${6} ${2 + hairOffset * 0.5} ${12} ${12}
              Q${20} ${16} ${30} ${14}
              Z`}
          fill="url(#hairGradient)"
        />
        {/* Hair strands flowing */}
        <path
          d={`M24 6 Q${16 + hairWave * 0.8} ${-4 + hairOffset * 1.3} ${10 + hairWave * 0.6} ${-10 + hairOffset * 1.6}`}
          stroke="#3d2817"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M28 4 Q${20 + hairWave * 0.6} ${-6 + hairOffset * 1.4} ${14 + hairWave * 0.4} ${-14 + hairOffset * 1.7}`}
          stroke="#3d2817"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M22 8 Q${14 + hairWave * 0.9} ${0 + hairOffset * 1.2} ${6 + hairWave * 0.5} ${-4 + hairOffset * 1.5}`}
          stroke="#3d2817"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ===== HEAD ===== */}
      <ellipse cx="30" cy="12" rx="10" ry="11" fill="url(#bodyGradient)" />
      {/* Face shadow side */}
      <ellipse cx="32" cy="12" rx="8" ry="9" fill="url(#shadowGradient)" />
      {/* Ear */}
      <ellipse cx="40" cy="12" rx="2" ry="3" fill="url(#bodyGradient)" />

      {/* ===== NECK ===== */}
      <rect
        x="26"
        y="21"
        width="8"
        height="6"
        fill="url(#bodyGradient)"
        rx="2"
      />

      {/* ===== ARMS (Extended forward in streamlined position) ===== */}
      {/* Left arm - closer to viewer */}
      <g>
        {/* Upper arm */}
        <path
          d="M26 30 Q20 26 16 18 Q14 14 10 8"
          stroke="url(#bodyGradient)"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        {/* Forearm */}
        <path
          d="M10 8 Q6 4 2 -2"
          stroke="url(#bodyGradient)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        {/* Hand with pointed fingers */}
        <path
          d="M2 -2 L-4 -8 M2 -2 L-2 -10 M2 -2 L0 -10"
          stroke="#e8d4c0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Arm shadow */}
        <path
          d="M26 30 Q20 26 16 18 Q14 14 10 8"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          style={{ transform: "translate(1px, 1px)" }}
        />
      </g>

      {/* Right arm - further from viewer */}
      <g style={{ opacity: 0.9 }}>
        <path
          d="M34 30 Q40 26 44 18 Q46 14 50 8"
          stroke="url(#bodyGradient)"
          strokeWidth="6.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M50 8 Q54 4 58 -2"
          stroke="url(#bodyGradient)"
          strokeWidth="5.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M58 -2 L64 -8 M58 -2 L62 -10 M58 -2 L60 -10"
          stroke="#d4bfa8"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ===== TORSO ===== */}
      {/* Main torso shape */}
      <path
        d="M22 27 
           Q20 35 21 45
           Q22 55 24 65
           L36 65
           Q38 55 39 45
           Q40 35 38 27
           Z"
        fill="url(#bodyGradient)"
      />
      {/* Torso shadow for depth */}
      <path
        d="M32 27 
           Q36 35 37 45
           Q38 55 36 65
           L36 65
           Q38 55 39 45
           Q40 35 38 27
           Z"
        fill="url(#shadowGradient)"
      />

      {/* ===== SWIMSUIT ===== */}
      <path
        d="M22 50 
           Q21 55 22 62
           Q23 68 24 72
           L36 72
           Q37 68 38 62
           Q39 55 38 50
           Z"
        fill="url(#swimsuitGradient)"
      />
      {/* Swimsuit highlight */}
      <path
        d="M24 52 Q24 58 25 65 L28 65 Q27 58 27 52 Z"
        fill="rgba(255,255,255,0.1)"
      />

      {/* ===== LEGS (Together, toes pointed) ===== */}
      {/* Left thigh */}
      <path
        d="M24 72 Q23 85 24 100"
        stroke="url(#bodyGradient)"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right thigh */}
      <path
        d="M36 72 Q37 85 36 100"
        stroke="url(#bodyGradient)"
        strokeWidth="8.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Left calf */}
      <path
        d="M24 100 Q23 115 25 128"
        stroke="url(#bodyGradient)"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right calf */}
      <path
        d="M36 100 Q37 115 35 128"
        stroke="url(#bodyGradient)"
        strokeWidth="6.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ===== FEET (Pointed like a competitive diver) ===== */}
      {/* Left foot */}
      <path
        d="M25 128 Q24 135 26 142 Q27 148 28 152"
        stroke="url(#bodyGradient)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right foot */}
      <path
        d="M35 128 Q36 135 34 142 Q33 148 32 152"
        stroke="url(#bodyGradient)"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Leg shadow */}
      <path
        d="M36 72 Q37 85 36 100 Q37 115 35 128 Q36 135 34 142"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />

      {/* ===== BODY HIGHLIGHT (Left side - light source) ===== */}
      <path
        d="M22 30 Q20 45 22 60"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================================
// Water Splash SVG Components
// ============================================================================
function SplashColumn({
  progress,
  x,
  y,
}: {
  progress: number;
  x: number;
  y: number;
}) {
  // Column shoots up then falls back
  const height = Math.sin(progress * Math.PI) * 180;
  const width = 20 + Math.sin(progress * Math.PI) * 15;
  const opacity = progress < 0.7 ? 0.9 : 0.9 - (progress - 0.7) * 3;

  return (
    <svg
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - height,
        width: width,
        height: height,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <defs>
        <linearGradient id="columnGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(61, 214, 181, 0.4)" />
          <stop offset="50%" stopColor="rgba(255, 255, 255, 0.85)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.3)" />
        </linearGradient>
      </defs>
      <path
        d={`M${width * 0.3} ${height}
            Q${width * 0.2} ${height * 0.5} ${width * 0.4} ${height * 0.1}
            Q${width * 0.5} 0 ${width * 0.6} ${height * 0.1}
            Q${width * 0.8} ${height * 0.5} ${width * 0.7} ${height}
            Z`}
        fill="url(#columnGradient)"
        opacity={opacity}
      />
    </svg>
  );
}

function SplashCurtain({
  progress,
  x,
  y,
  side,
}: {
  progress: number;
  x: number;
  y: number;
  side: "left" | "right";
}) {
  const spread = Math.sin(progress * Math.PI * 0.8) * 120;
  const height = Math.sin(progress * Math.PI) * 100;
  const direction = side === "left" ? -1 : 1;
  const opacity = progress < 0.6 ? 0.8 : 0.8 - (progress - 0.6) * 2;

  const baseX = x + direction * 10;
  const endX = baseX + direction * spread;
  const midX = baseX + direction * spread * 0.6;

  return (
    <svg
      style={{
        position: "absolute",
        left: Math.min(baseX, endX) - 20,
        top: y - height - 20,
        width: Math.abs(spread) + 60,
        height: height + 40,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <defs>
        <linearGradient
          id={`curtainGradient${side}`}
          x1="50%"
          y1="100%"
          x2="50%"
          y2="0%"
        >
          <stop offset="0%" stopColor="rgba(61, 214, 181, 0.3)" />
          <stop offset="40%" stopColor="rgba(255, 255, 255, 0.7)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.2)" />
        </linearGradient>
      </defs>
      <path
        d={`M${side === "left" ? spread + 30 : 30} ${height + 20}
            Q${side === "left" ? spread * 0.6 + 30 : spread * 0.4 + 30} ${height * 0.3 + 20} 
             ${side === "left" ? 30 : spread + 30} ${20}
            Q${side === "left" ? 20 : spread + 40} ${height * 0.5 + 20}
             ${side === "left" ? spread + 30 : 30} ${height + 20}
            Z`}
        fill={`url(#curtainGradient${side})`}
        opacity={opacity}
      />
    </svg>
  );
}

function FoamRing({
  progress,
  x,
  y,
}: {
  progress: number;
  x: number;
  y: number;
}) {
  const scale = 1 + progress * 4;
  const opacity = 1 - progress;
  const baseSize = 60;

  // Create irregular organic shape
  const points = 12;
  const irregularity = 0.3;

  let pathD = "";
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radiusVariation =
      1 + Math.sin(angle * 3 + progress * 5) * irregularity;
    const r = (baseSize / 2) * radiusVariation;
    const px = baseSize / 2 + Math.cos(angle) * r;
    const py = baseSize / 2 + Math.sin(angle) * r * 0.4; // Flatten for surface perspective

    if (i === 0) {
      pathD = `M${px} ${py}`;
    } else {
      const prevAngle = ((i - 1) / points) * Math.PI * 2;
      const cpAngle = (angle + prevAngle) / 2;
      const cpR =
        (baseSize / 2) *
        (1 + Math.sin(cpAngle * 4 + progress * 3) * irregularity * 1.2);
      const cpx = baseSize / 2 + Math.cos(cpAngle) * cpR;
      const cpy = baseSize / 2 + Math.sin(cpAngle) * cpR * 0.4;
      pathD += ` Q${cpx} ${cpy} ${px} ${py}`;
    }
  }
  pathD += " Z";

  return (
    <svg
      style={{
        position: "absolute",
        left: x - (baseSize * scale) / 2,
        top: y - (baseSize * scale * 0.4) / 2,
        width: baseSize * scale,
        height: baseSize * scale * 0.4,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <defs>
        <radialGradient id="foamGradient">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
          <stop offset="60%" stopColor="rgba(255, 255, 255, 0.6)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>
      <g transform={`scale(${scale})`} style={{ transformOrigin: "center" }}>
        <path
          d={pathD}
          fill="none"
          stroke="url(#foamGradient)"
          strokeWidth={3 / scale}
          opacity={opacity}
        />
      </g>
    </svg>
  );
}

function UnderwaterSilhouette({
  progress,
  x,
  y,
}: {
  progress: number;
  x: number;
  y: number;
}) {
  const yOffset = progress * 150;
  const opacity = Math.max(0, 0.6 - progress * 0.8);
  const blur = 2 + progress * 8;
  const scale = 1 - progress * 0.3;

  return (
    <div
      style={{
        position: "absolute",
        left: x - 30,
        top: y + yOffset,
        width: 60,
        height: 150,
        opacity,
        filter: `blur(${blur}px)`,
        transform: `scale(${scale})`,
        pointerEvents: "none",
      }}
    >
      <svg
        viewBox="0 0 60 150"
        fill="none"
        style={{ width: "100%", height: "100%" }}
      >
        {/* Simplified silhouette shape */}
        <ellipse cx="30" cy="12" rx="10" ry="11" fill="rgba(10, 40, 60, 0.8)" />
        <path
          d="M22 27 Q20 45 22 65 L36 65 Q38 45 38 27 Z"
          fill="rgba(10, 40, 60, 0.8)"
        />
        <path
          d="M24 65 Q23 100 26 140"
          stroke="rgba(10, 40, 60, 0.8)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M36 65 Q37 100 34 140"
          stroke="rgba(10, 40, 60, 0.8)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// ============================================================================
// Context for triggering dive from anywhere
// ============================================================================
export const DiveTransitionContext = React.createContext<{
  triggerDive: (targetPath: string) => void;
} | null>(null);

export function useDiveTransition() {
  const context = React.useContext(DiveTransitionContext);
  if (!context) {
    throw new Error(
      "useDiveTransition must be used within DiveTransitionProvider",
    );
  }
  return context;
}

// ============================================================================
// Main Provider Component
// ============================================================================
export function DiveTransitionProvider({ children }: DiveTransitionProps) {
  const router = useRouter();
  // Feature flag to globally disable the dive animation.
  // Set to `true` to skip the animated transition and navigate immediately.
  const DISABLE_DIVE_ANIMATION = true;
  const [state, setState] = useState<DiveState>({
    isActive: false,
    phase: "idle",
    targetPath: "",
  });

  const animationRef = useRef<number | null>(null);
  const [diverPose, setDiverPose] = useState<DiverPose>({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    hairFlow: 0,
  });

  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const [splashProgress, setSplashProgress] = useState(0);
  const [foamProgress, setFoamProgress] = useState(0);
  const [silhouetteProgress, setSilhouetteProgress] = useState(0);
  const [zoomProgress, setZoomProgress] = useState(0);
  const [causticPhase, setCausticPhase] = useState(0);
  const [entryPoint, setEntryPoint] = useState({ x: 0, y: 0 });

  // Platform/cliff position
  const platformY =
    typeof window !== "undefined" ? window.innerHeight * 0.12 : 100;
  const waterSurfaceY =
    typeof window !== "undefined" ? window.innerHeight * 0.42 : 400;

  const triggerDive = useCallback(
    (targetPath: string) => {
      if (DISABLE_DIVE_ANIMATION) {
        // Immediately navigate without running the animation sequence.
        router.push(targetPath);
        return;
      }
      const centerX =
        typeof window !== "undefined" ? window.innerWidth / 2 : 500;

      setState({
        isActive: true,
        phase: "stance",
        targetPath,
      });

      setDiverPose({
        x: centerX,
        y: platformY,
        rotation: 0,
        scale: 1,
        hairFlow: 0,
      });

      setEntryPoint({ x: centerX, y: waterSurfaceY });
      setDroplets([]);
      setSplashProgress(0);
      setFoamProgress(0);
      setSilhouetteProgress(0);
      setZoomProgress(0);
    },
    [platformY, waterSurfaceY],
  );

  // Parabolic arc calculation for realistic projectile motion
  const calculateArcPosition = useCallback(
    (t: number, startX: number, startY: number, endX: number, endY: number) => {
      // Cubic bezier with gravity-influenced arc
      const arcHeight = Math.abs(endY - startY) * 0.3;

      // Control points for natural diving arc
      const cp1x = startX + (endX - startX) * 0.1;
      const cp1y = startY - arcHeight * 0.5;
      const cp2x = startX + (endX - startX) * 0.6;
      const cp2y = startY - arcHeight;

      // Cubic bezier formula
      const mt = 1 - t;
      const x =
        mt * mt * mt * startX +
        3 * mt * mt * t * cp1x +
        3 * mt * t * t * cp2x +
        t * t * t * endX;
      const y =
        mt * mt * mt * startY +
        3 * mt * mt * t * cp1y +
        3 * mt * t * t * cp2y +
        t * t * t * endY;

      // Calculate rotation based on tangent of curve
      const dx =
        -3 * mt * mt * startX +
        3 * mt * mt * cp1x -
        6 * mt * t * cp1x +
        6 * mt * t * cp2x -
        3 * t * t * cp2x +
        3 * t * t * endX;
      const dy =
        -3 * mt * mt * startY +
        3 * mt * mt * cp1y -
        6 * mt * t * cp1y +
        6 * mt * t * cp2y -
        3 * t * t * cp2y +
        3 * t * t * endY;
      const rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      return { x, y, rotation };
    },
    [],
  );

  // Animation sequence controller
  useEffect(() => {
    if (!state.isActive) return;

    const timers: NodeJS.Timeout[] = [];

    switch (state.phase) {
      case "stance":
        // Brief pause at edge - anticipation
        timers.push(
          setTimeout(() => {
            setState((s) => ({ ...s, phase: "launch" }));
          }, 400),
        );
        break;

      case "launch":
        // Quick upward spring before arc
        const launchStart = performance.now();
        const launchDuration = 200;

        const animateLaunch = (timestamp: number) => {
          const elapsed = timestamp - launchStart;
          const t = Math.min(elapsed / launchDuration, 1);

          // Ease out for spring feeling
          const easeOut = 1 - Math.pow(1 - t, 3);

          setDiverPose((prev) => ({
            ...prev,
            y: platformY - easeOut * 30, // Small upward spring
            rotation: easeOut * -15, // Slight forward lean
            hairFlow: easeOut * 0.2,
          }));

          if (t < 1) {
            animationRef.current = requestAnimationFrame(animateLaunch);
          } else {
            setState((s) => ({ ...s, phase: "arc" }));
          }
        };

        animationRef.current = requestAnimationFrame(animateLaunch);
        break;

      case "arc":
        // Main dive arc - 1.2 seconds
        const arcStart = performance.now();
        const arcDuration = 1200;
        const startX = diverPose.x;
        const startY = diverPose.y;
        const endX = entryPoint.x;
        const endY = entryPoint.y;

        const animateArc = (timestamp: number) => {
          const elapsed = timestamp - arcStart;
          const rawT = elapsed / arcDuration;

          // Ease-in for acceleration (gravity)
          const t = Math.min(rawT * rawT * (3 - 2 * rawT), 1); // Smoothstep with acceleration

          const pos = calculateArcPosition(t, startX, startY, endX, endY);

          // Clamp rotation to ~80 degrees at entry
          const finalRotation = Math.min(pos.rotation, 80);

          setDiverPose({
            x: pos.x,
            y: pos.y,
            rotation: finalRotation,
            scale: 1 - t * 0.1, // Slight scale reduction as diver moves away
            hairFlow: Math.min(t * 2, 1), // Hair flows back dramatically
          });

          if (rawT < 1) {
            animationRef.current = requestAnimationFrame(animateArc);
          } else {
            setState((s) => ({ ...s, phase: "entry" }));
          }
        };

        animationRef.current = requestAnimationFrame(animateArc);
        break;

      case "entry":
        // Water entry - trigger splash
        setState((s) => ({ ...s, phase: "splash" }));
        break;

      case "splash":
        // Generate droplets
        const newDroplets: Droplet[] = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          x: entryPoint.x + (Math.random() - 0.5) * 40,
          y: entryPoint.y,
          vx: (Math.random() - 0.5) * 8,
          vy: -8 - Math.random() * 12,
          size: 4 + Math.random() * 8,
          opacity: 0.8 + Math.random() * 0.2,
        }));
        setDroplets(newDroplets);

        // Animate splash elements
        const splashStart = performance.now();
        const splashDuration = 800;

        const animateSplash = (timestamp: number) => {
          const elapsed = timestamp - splashStart;
          const t = Math.min(elapsed / splashDuration, 1);

          setSplashProgress(t);
          setFoamProgress(Math.min(t * 1.5, 1));
          setSilhouetteProgress(t);

          // Update droplets with gravity
          setDroplets((prev) =>
            prev.map((d) => ({
              ...d,
              x: d.x + d.vx,
              y: d.y + d.vy,
              vy: d.vy + 0.8, // Gravity
              opacity: d.opacity * 0.98,
            })),
          );

          if (t < 1) {
            animationRef.current = requestAnimationFrame(animateSplash);
          } else {
            setState((s) => ({ ...s, phase: "submerge" }));
          }
        };

        animationRef.current = requestAnimationFrame(animateSplash);
        break;

      case "submerge":
        // Viewport dive effect
        const submergeStart = performance.now();
        const submergeDuration = 1000;

        const animateSubmerge = (timestamp: number) => {
          const elapsed = timestamp - submergeStart;
          const t = Math.min(elapsed / submergeDuration, 1);

          // Ease in-out for smooth transition
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

          setZoomProgress(ease);
          setCausticPhase(ease * Math.PI * 2);

          if (t < 1) {
            animationRef.current = requestAnimationFrame(animateSubmerge);
          } else {
            setState((s) => ({ ...s, phase: "complete" }));
          }
        };

        animationRef.current = requestAnimationFrame(animateSubmerge);
        break;

      case "complete":
        timers.push(
          setTimeout(() => {
            router.push(state.targetPath);
            setTimeout(() => {
              setState({ isActive: false, phase: "idle", targetPath: "" });
              setDroplets([]);
              setSplashProgress(0);
              setFoamProgress(0);
              setSilhouetteProgress(0);
              setZoomProgress(0);
            }, 300);
          }, 200),
        );
        break;
    }

    return () => {
      timers.forEach(clearTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    state.phase,
    state.isActive,
    state.targetPath,
    diverPose,
    entryPoint,
    platformY,
    calculateArcPosition,
    router,
  ]);

  // Caustic light patterns
  const causticStyle = {
    background: `
      radial-gradient(ellipse at ${30 + Math.sin(causticPhase) * 20}% ${40 + Math.cos(causticPhase * 1.3) * 15}%, 
        rgba(61, 214, 181, 0.15) 0%, transparent 40%),
      radial-gradient(ellipse at ${70 + Math.cos(causticPhase * 0.7) * 25}% ${60 + Math.sin(causticPhase * 1.1) * 20}%, 
        rgba(61, 214, 181, 0.12) 0%, transparent 35%),
      radial-gradient(ellipse at ${50 + Math.sin(causticPhase * 1.5) * 30}% ${30 + Math.cos(causticPhase) * 25}%, 
        rgba(255, 255, 255, 0.08) 0%, transparent 30%)
    `,
  };

  return (
    <DiveTransitionContext.Provider value={{ triggerDive }}>
      {children}

      {/* Dive Animation Overlay */}
      {state.isActive && (
        <div
          className={cn(
            "fixed inset-0 z-[9999] overflow-hidden",
            state.phase === "submerge" || state.phase === "complete"
              ? "pointer-events-auto"
              : "pointer-events-none",
          )}
        >
          {/* Ocean/Sky Background */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: `linear-gradient(180deg, 
                #87CEEB 0%, 
                #87CEEB ${(waterSurfaceY / window.innerHeight) * 100 - 2}%,
                #1a5f7a ${(waterSurfaceY / window.innerHeight) * 100}%,
                #0a3d47 100%)`,
              opacity:
                state.phase === "submerge" || state.phase === "complete"
                  ? 0
                  : 1,
            }}
          />

          {/* Platform/Cliff Edge */}
          {(state.phase === "stance" || state.phase === "launch") && (
            <div
              className="absolute"
              style={{
                left: diverPose.x - 60,
                top: platformY + 60,
                width: 120,
                height: 40,
              }}
            >
              <svg
                viewBox="0 0 120 40"
                fill="none"
                style={{ width: "100%", height: "100%" }}
              >
                <path
                  d="M0 0 L60 0 L120 10 L120 40 L0 40 Z"
                  fill="url(#cliffGradient)"
                />
                <defs>
                  <linearGradient
                    id="cliffGradient"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#8B7355" />
                    <stop offset="100%" stopColor="#5D4E37" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* Water Surface Line */}
          <div
            className="absolute left-0 right-0 h-1"
            style={{
              top: waterSurfaceY,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
              opacity:
                state.phase === "submerge" || state.phase === "complete"
                  ? 0
                  : 0.8,
              transition: "opacity 0.3s",
            }}
          />

          {/* The Diver */}
          {!["splash", "submerge", "complete"].includes(state.phase) && (
            <div
              style={{
                position: "absolute",
                left: diverPose.x - 30,
                top: diverPose.y - 75,
                width: 60,
                height: 150,
                transform: `rotate(${diverPose.rotation}deg) scale(${diverPose.scale})`,
                transformOrigin: "center 50%",
                transition: state.phase === "stance" ? "none" : undefined,
              }}
            >
              <DiverSVG
                className="w-full h-full"
                hairFlow={diverPose.hairFlow}
                phase={state.phase}
              />
            </div>
          )}

          {/* Splash Effects */}
          {(state.phase === "splash" || state.phase === "submerge") &&
            splashProgress > 0 && (
              <>
                <SplashColumn
                  progress={splashProgress}
                  x={entryPoint.x}
                  y={entryPoint.y}
                />
                <SplashCurtain
                  progress={splashProgress}
                  x={entryPoint.x}
                  y={entryPoint.y}
                  side="left"
                />
                <SplashCurtain
                  progress={splashProgress}
                  x={entryPoint.x}
                  y={entryPoint.y}
                  side="right"
                />
                <FoamRing
                  progress={foamProgress}
                  x={entryPoint.x}
                  y={entryPoint.y}
                />
                <UnderwaterSilhouette
                  progress={silhouetteProgress}
                  x={entryPoint.x}
                  y={entryPoint.y}
                />
              </>
            )}

          {/* Water Droplets */}
          {droplets.map((droplet) => (
            <div
              key={droplet.id}
              className="absolute rounded-full"
              style={{
                left: droplet.x - droplet.size / 2,
                top: droplet.y - droplet.size / 2,
                width: droplet.size,
                height: droplet.size,
                background: `radial-gradient(circle at 30% 30%, 
                  rgba(255,255,255,0.9) 0%, 
                  rgba(61, 214, 181, 0.6) 60%, 
                  rgba(61, 214, 181, 0.3) 100%)`,
                opacity: droplet.opacity,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Underwater Transition Overlay */}
          <div
            className="absolute inset-0 transition-all"
            style={{
              background: `linear-gradient(180deg, 
                rgba(10, 61, 71, ${zoomProgress * 0.95}) 0%, 
                rgba(5, 30, 40, ${zoomProgress * 0.98}) 50%,
                rgba(2, 15, 20, ${zoomProgress}) 100%)`,
              transform: `perspective(800px) translateZ(${zoomProgress * 400}px)`,
              transformOrigin: `${entryPoint.x}px ${entryPoint.y}px`,
            }}
          />

          {/* Caustic Light Patterns */}
          {(state.phase === "submerge" || state.phase === "complete") && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                ...causticStyle,
                opacity: zoomProgress,
              }}
            />
          )}

          {/* Loading Indicator */}
          {(state.phase === "submerge" || state.phase === "complete") && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: Math.min(zoomProgress * 2, 1) }}
            >
              <div className="flex flex-col items-center gap-6">
                {/* Animated rings */}
                <div className="relative w-20 h-20">
                  <div
                    className="absolute inset-0 rounded-full border-2 animate-ping"
                    style={{
                      borderColor: "rgba(61, 214, 181, 0.4)",
                      animationDuration: "1.5s",
                    }}
                  />
                  <div
                    className="absolute inset-2 rounded-full border-2 animate-ping"
                    style={{
                      borderColor: "rgba(61, 214, 181, 0.5)",
                      animationDuration: "1.5s",
                      animationDelay: "0.3s",
                    }}
                  />
                  <div
                    className="absolute inset-4 rounded-full border-2 animate-ping"
                    style={{
                      borderColor: "rgba(61, 214, 181, 0.6)",
                      animationDuration: "1.5s",
                      animationDelay: "0.6s",
                    }}
                  />
                  <div
                    className="absolute inset-6 rounded-full"
                    style={{ background: "rgba(61, 214, 181, 0.8)" }}
                  />
                </div>
                <span
                  className="font-body text-base tracking-wide"
                  style={{ color: "rgba(61, 214, 181, 0.9)" }}
                >
                  Diving in...
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes causticWave {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 0.25;
          }
        }
      `}</style>
    </DiveTransitionContext.Provider>
  );
}

export default DiveTransitionProvider;
