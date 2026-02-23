"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type AudioCaptureState =
  | "idle"
  | "requesting"
  | "ready"
  | "recording"
  | "error";

interface UseAudioCaptureOptions {
  /** Minimum chunk duration in ms (default 100) */
  minChunkMs?: number;
  /** Called with each audio chunk (base64-encoded) */
  onAudioChunk?: (base64: string, mimeType: string) => void;
  /** Called with real-time audio level 0-1 */
  onAudioLevel?: (level: number) => void;
}

export function useAudioCapture({
  minChunkMs = 100,
  onAudioChunk,
  onAudioLevel,
}: UseAudioCaptureOptions = {}) {
  const [state, setState] = useState<AudioCaptureState>("idle");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const onAudioChunkRef = useRef(onAudioChunk);
  const onAudioLevelRef = useRef(onAudioLevel);

  // Keep callback refs current
  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);
  useEffect(() => {
    onAudioLevelRef.current = onAudioLevel;
  }, [onAudioLevel]);

  // Measure mic level via AnalyserNode
  const startLevelMonitoring = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, rms * 3); // amplify a bit
      onAudioLevelRef.current?.(level);
      levelFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopLevelMonitoring = useCallback(() => {
    if (levelFrameRef.current !== null) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
  }, []);

  /** Request mic permission and initialise MediaRecorder */
  const requestMic = useCallback(async () => {
    try {
      setState("requesting");
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Set up analyser for level monitoring
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setState("ready");
    } catch (err: unknown) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone access in your browser settings."
          : "Could not access microphone. Please check your device.";
      setError(msg);
      setState("error");
    }
  }, []);

  /** Start recording and streaming audio chunks */
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    // Prefer webm/opus, fallback to webm
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType,
      audioBitsPerSecond: 64000,
    });

    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        onAudioChunkRef.current?.(base64, mimeType);
      }
    };

    recorder.start(Math.max(minChunkMs, 100));
    recorderRef.current = recorder;
    setState("recording");
    startLevelMonitoring();
  }, [minChunkMs, startLevelMonitoring]);

  /** Stop recording */
  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    stopLevelMonitoring();
    setState("ready");
  }, [stopLevelMonitoring]);

  /** Release all media resources */
  const releaseMic = useCallback(() => {
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setState("idle");
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    error,
    requestMic,
    startRecording,
    stopRecording,
    releaseMic,
  };
}
