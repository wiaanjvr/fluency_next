"use client";

import {
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

// Sound effect types
export type SoundEffect =
  | "tap" // Button tap - soft click
  | "success" // Correct answer - pleasant chime
  | "error" // Wrong answer - gentle tone
  | "achieve" // Achievement - brief fanfare
  | "complete" // Lesson complete - celebration
  | "whoosh" // Page transition - subtle swoosh
  | "pop"; // UI pop - bubble sound

// Audio URLs - using Web Audio API generated sounds
const SOUND_CONFIG: Record<
  SoundEffect,
  { frequency: number; duration: number; type: OscillatorType; gain: number }
> = {
  tap: { frequency: 800, duration: 0.05, type: "sine", gain: 0.1 },
  success: { frequency: 880, duration: 0.15, type: "sine", gain: 0.12 },
  error: { frequency: 220, duration: 0.2, type: "sine", gain: 0.08 },
  achieve: { frequency: 523.25, duration: 0.3, type: "sine", gain: 0.15 },
  complete: { frequency: 659.25, duration: 0.4, type: "sine", gain: 0.15 },
  whoosh: { frequency: 400, duration: 0.1, type: "sine", gain: 0.05 },
  pop: { frequency: 600, duration: 0.08, type: "sine", gain: 0.08 },
};

// Global audio context
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
  }
  return audioContext;
}

// Play a simple synthesized sound
function playSynthSound(config: (typeof SOUND_CONFIG)[SoundEffect]) {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

    // Volume envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(config.gain, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + config.duration,
    );

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + config.duration);
  } catch (error) {
    // Silently fail - sound effects are optional
    console.debug("Sound playback failed:", error);
  }
}

// Play a success chord (multiple notes)
function playSuccessChord() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - Major chord
    const duration = 0.3;
    const gain = 0.08;

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        gain,
        ctx.currentTime + 0.02 + index * 0.02,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + duration,
      );

      oscillator.start(ctx.currentTime + index * 0.05);
      oscillator.stop(ctx.currentTime + duration + index * 0.05);
    });
  } catch (error) {
    console.debug("Success chord playback failed:", error);
  }
}

// Play achievement fanfare
function playAchievementFanfare() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    // Ascending notes for fanfare feel
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const baseDuration = 0.15;
    const gain = 0.1;

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + index * 0.1;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + baseDuration,
      );

      oscillator.start(startTime);
      oscillator.stop(startTime + baseDuration);
    });
  } catch (error) {
    console.debug("Fanfare playback failed:", error);
  }
}

// Play gentle error sound (not harsh)
function playGentleError() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    // Two descending notes - gentle, not alarming
    const notes = [330, 262]; // E4, C4
    const duration = 0.15;
    const gain = 0.06;

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + index * 0.1;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.debug("Error sound playback failed:", error);
  }
}

// Main play sound function
export function playSound(sound: SoundEffect) {
  switch (sound) {
    case "success":
      playSuccessChord();
      break;
    case "achieve":
    case "complete":
      playAchievementFanfare();
      break;
    case "error":
      playGentleError();
      break;
    default:
      playSynthSound(SOUND_CONFIG[sound]);
  }
}

// Hook for sound effects with user preference support
interface UseSoundOptions {
  enabled?: boolean;
}

export function useSound(options: UseSoundOptions = {}) {
  const { enabled = true } = options;
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const play = useCallback((sound: SoundEffect) => {
    if (enabledRef.current) {
      playSound(sound);
    }
  }, []);

  const playTap = useCallback(() => play("tap"), [play]);
  const playSuccess = useCallback(() => play("success"), [play]);
  const playError = useCallback(() => play("error"), [play]);
  const playAchieve = useCallback(() => play("achieve"), [play]);
  const playComplete = useCallback(() => play("complete"), [play]);
  const playWhoosh = useCallback(() => play("whoosh"), [play]);
  const playPop = useCallback(() => play("pop"), [play]);

  return {
    play,
    playTap,
    playSuccess,
    playError,
    playAchieve,
    playComplete,
    playWhoosh,
    playPop,
  };
}

// Sound settings context (for global enable/disable)
interface SoundContextValue {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const SoundContext = createContext<SoundContextValue>({
  soundEnabled: true,
  setSoundEnabled: () => {},
});

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lingua-sound-enabled");
      return stored !== "false";
    }
    return true;
  });

  const handleSetSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("lingua-sound-enabled", String(enabled));
    }
  }, []);

  return (
    <SoundContext.Provider
      value={{ soundEnabled, setSoundEnabled: handleSetSoundEnabled }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundSettings() {
  return useContext(SoundContext);
}

// Hook that respects global sound settings
export function useSoundEffects() {
  const { soundEnabled } = useSoundSettings();
  return useSound({ enabled: soundEnabled });
}
