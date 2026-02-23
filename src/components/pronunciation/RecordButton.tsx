"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordButtonProps {
  /** Called with the recorded audio blob when recording stops */
  onRecordingComplete: (blob: Blob) => void;
  /** Whether recording is allowed */
  disabled?: boolean;
  /** Size variant */
  size?: "md" | "lg";
  /** Additional class names */
  className?: string;
  /** Whether to show a permission request modal first */
  showPermissionHint?: boolean;
  /** Called with amplitude data during recording for external visualization */
  onAmplitudeData?: (amplitude: number) => void;
}

export default function RecordButton({
  onRecordingComplete,
  disabled = false,
  size = "lg",
  className,
  showPermissionHint = true,
  onAmplitudeData,
}: RecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Calculate amplitude for external use
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const amplitude = Math.sqrt(sum / bufferLength);
      onAmplitudeData?.(amplitude);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw amplitude bars
      const barCount = 20;
      const barWidth = canvas.width / barCount - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step];
        const barHeight = ((val - 100) / 156) * canvas.height;
        const x = i * (barWidth + 2);
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
        ctx.fillRect(x, y, barWidth, Math.max(2, barHeight));
      }
    };

    draw();
  }, [onAmplitudeData]);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setHasPermission(true);
      setPermissionDenied(false);
      return true;
    } catch {
      setPermissionDenied(true);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!hasPermission && showPermissionHint) {
      setShowHint(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Set up analyser
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob);

        // Cleanup
        cancelAnimationFrame(animRef.current);
        analyserRef.current = null;
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setRecording(true);
      setElapsed(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      drawWaveform();
    } catch (err) {
      console.error("Failed to start recording:", err);
      setPermissionDenied(true);
    }
  }, [hasPermission, showPermissionHint, onRecordingComplete, drawWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recording]);

  const handlePermissionConfirm = useCallback(async () => {
    const granted = await requestPermission();
    setShowHint(false);
    if (granted) {
      // Auto-start after permission granted
      setTimeout(() => startRecording(), 100);
    }
  }, [requestPermission, startRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const buttonSize = size === "lg" ? "w-20 h-20 min-w-[80px]" : "w-14 h-14";
  const iconSize = size === "lg" ? "w-8 h-8" : "w-6 h-6";

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Permission hint modal */}
      {showHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-2xl border border-white/10 p-8 max-w-sm w-full mx-4 space-y-4"
            style={{ background: "rgba(13, 33, 55, 0.95)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(61, 214, 181, 0.15)" }}
              >
                <Mic
                  className="w-5 h-5"
                  style={{ color: "var(--turquoise)" }}
                />
              </div>
              <h3
                className="font-display text-lg font-semibold"
                style={{ color: "var(--sand)" }}
              >
                Microphone Access
              </h3>
            </div>
            <p
              className="font-body text-sm leading-relaxed"
              style={{ color: "var(--seafoam)", opacity: 0.8 }}
            >
              Fluensea needs your microphone to record your pronunciation and
              provide feedback. Your recordings are only used for comparison —
              they're never stored permanently.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowHint(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-body transition-colors hover:bg-white/5"
                style={{ color: "var(--seafoam)" }}
              >
                Cancel
              </button>
              <button
                onClick={handlePermissionConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, var(--turquoise), var(--teal))",
                  color: "var(--midnight)",
                }}
              >
                Allow Microphone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission denied message */}
      {permissionDenied && (
        <div
          className="text-xs font-body text-center max-w-48 mb-1"
          style={{ color: "var(--coral)" }}
        >
          Microphone access denied. Please enable it in your browser settings to
          use pronunciation training.
        </div>
      )}

      {/* Record button */}
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled}
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
          "border-2",
          buttonSize,
          recording
            ? "bg-red-500/20 border-red-400/60 shadow-[0_0_24px_rgba(239,68,68,0.3)]"
            : "bg-white/5 border-white/20 hover:bg-red-500/10 hover:border-red-400/30",
          disabled && "opacity-40 cursor-not-allowed",
        )}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        {recording ? (
          <Square className={cn(iconSize, "text-red-400")} />
        ) : (
          <Mic
            className={cn(
              iconSize,
              "transition-colors",
              "text-[var(--seafoam)] group-hover:text-red-400",
            )}
          />
        )}

        {/* Pulsing ring while recording */}
        {recording && (
          <>
            <div className="absolute inset-0 rounded-full animate-ping opacity-15 bg-red-500" />
            <div className="absolute inset-[-4px] rounded-full border-2 border-red-400/30 animate-pulse" />
          </>
        )}
      </button>

      {/* Timer */}
      {recording && (
        <span className="text-sm font-body tabular-nums text-red-400">
          {formatTime(elapsed)}
        </span>
      )}

      {/* Waveform during recording */}
      {recording && (
        <canvas
          ref={canvasRef}
          width={200}
          height={40}
          className="w-full max-w-[200px] opacity-80"
        />
      )}

      {/* Label */}
      {!recording && (
        <span
          className="text-xs font-body"
          style={{ color: "var(--seafoam)", opacity: 0.6 }}
        >
          {permissionDenied ? "Mic blocked" : "Tap to record"}
        </span>
      )}
    </div>
  );
}
