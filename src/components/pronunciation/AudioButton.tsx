"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioButtonProps {
  /** URL of the audio file, or null to trigger TTS generation */
  src: string | null;
  /** Text to synthesize if no src is provided */
  text?: string;
  /** Language code for TTS */
  language?: string;
  /** Visual label shown below the button */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional classes */
  className?: string;
  /** Called when playback starts */
  onPlay?: () => void;
  /** Called when playback ends */
  onEnd?: () => void;
}

const sizeMap = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

const iconSizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export default function AudioButton({
  src,
  text,
  language = "de",
  label,
  size = "md",
  className,
  onPlay,
  onEnd,
}: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(src);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setAudioUrl(src);
  }, [src]);

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(61, 214, 181, 0.8)";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const generateAudio = useCallback(async () => {
    if (!text) return null;
    setLoading(true);
    try {
      const res = await fetch("/api/pronunciation/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          data?.details || data?.error || `Audio API failed (${res.status})`;
        throw new Error(message);
      }

      const generatedUrl = data?.audio_url || data?.url;
      if (generatedUrl) {
        setAudioUrl(generatedUrl);
        return generatedUrl;
      }

      throw new Error("No audio URL returned by API");
    } catch (err) {
      console.error("Audio generation failed:", err);
    } finally {
      setLoading(false);
    }
    return null;
  }, [text, language]);

  const play = useCallback(async () => {
    let url = audioUrl;

    // Generate audio on-demand if no URL
    if (!url && text) {
      url = await generateAudio();
      if (!url) return;
    }

    if (!url) return;

    try {
      // Create AudioContext for visualization (needs user gesture on iOS)
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio();
      // crossOrigin must be set BEFORE setting src to ensure the browser
      // sends CORS headers — required for MediaElementAudioSource to work
      // with Supabase (and any other cross-origin host).
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audioRef.current = audio;

      // Wire up analyzer for waveform
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyserRef.current = analyser;

      audio.onplay = () => {
        setPlaying(true);
        onPlay?.();
        drawWaveform();
      };

      audio.onended = () => {
        setPlaying(false);
        cancelAnimationFrame(animFrameRef.current);
        onEnd?.();
        audioContext.close();
      };

      audio.onerror = () => {
        setPlaying(false);
        cancelAnimationFrame(animFrameRef.current);
        audioContext.close();
      };

      await audio.play();
    } catch (err) {
      console.error("Playback failed:", err);
      setPlaying(false);
    }
  }, [audioUrl, text, generateAudio, drawWaveform, onPlay, onEnd]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        onClick={playing ? stop : play}
        disabled={loading}
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
          "border border-white/20 backdrop-blur-sm",
          sizeMap[size],
          playing
            ? "bg-[var(--turquoise)]/20 border-[var(--turquoise)]/50 shadow-[0_0_20px_rgba(61,214,181,0.3)]"
            : "bg-white/5 hover:bg-[var(--turquoise)]/10 hover:border-[var(--turquoise)]/30",
          loading && "opacity-60 cursor-wait",
        )}
        aria-label={playing ? "Stop audio" : "Play audio"}
      >
        {loading ? (
          <Loader2
            className={cn(
              iconSizeMap[size],
              "animate-spin text-[var(--turquoise)]",
            )}
          />
        ) : (
          <Volume2
            className={cn(
              iconSizeMap[size],
              "transition-colors duration-300",
              playing ? "text-[var(--turquoise)]" : "text-[var(--seafoam)]",
            )}
          />
        )}

        {/* Glow ring on playback */}
        {playing && (
          <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[var(--turquoise)]" />
        )}
      </button>

      {/* Mini waveform canvas visible during playback */}
      {playing && (
        <canvas ref={canvasRef} width={80} height={24} className="opacity-80" />
      )}

      {label && (
        <span
          className="text-xs font-body"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
