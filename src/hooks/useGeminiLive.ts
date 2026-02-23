"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ============================================================================
// Types
// ============================================================================
export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type SessionPhase = "idle" | "listening" | "responding";

export interface TranscriptEntry {
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

export interface SessionConfig {
  targetLanguage: string;
  topic: string;
  customTopic?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  sessionLengthMinutes: number;
}

interface UseGeminiLiveOptions {
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onPhaseChange?: (phase: SessionPhase) => void;
  onAudioOutput?: (audioBase64: string) => void;
  onError?: (error: string) => void;
  onSessionEnd?: (reason: string) => void;
}

// ============================================================================
// Gemini Live WebSocket hook
// ============================================================================
export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef<SessionConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const lastAudioTimeRef = useRef(Date.now());
  const mountedRef = useRef(true);
  const statusRef = useRef<ConnectionStatus>("disconnected");
  const [silenceWarning, setSilenceWarning] = useState(false);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Safely close a WebSocket regardless of its readyState.
  // Calling .close() on a CONNECTING socket causes a browser warning
  // ("WebSocket is closed before the connection is established"), so
  // instead we override onopen to close it once the handshake finishes.
  const safeCloseWs = useCallback((ws: WebSocket) => {
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.onopen = () => {
        ws.onopen = null;
        ws.close();
      };
      ws.onerror = null;
      ws.onmessage = null;
      ws.onclose = null;
    } else if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    // CLOSING / CLOSED: nothing to do
  }, []);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Sync phase to callback
  useEffect(() => {
    optionsRef.current.onPhaseChange?.(phase);
  }, [phase]);

  // -------------------------------------------------------------------------
  // Audio playback
  // -------------------------------------------------------------------------
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    const ctx = getAudioContext();
    const buffer = audioQueueRef.current.shift()!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      if (audioQueueRef.current.length > 0) {
        playNextAudio();
      } else {
        setPhase("listening");
      }
    };
    source.start();
  }, [getAudioContext]);

  const enqueueAudio = useCallback(
    async (base64: string) => {
      try {
        const ctx = getAudioContext();
        const raw = atob(base64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
        audioQueueRef.current.push(audioBuffer);
        playNextAudio();
      } catch {
        // If decode fails, skip this chunk
      }
    },
    [getAudioContext, playNextAudio],
  );

  // -------------------------------------------------------------------------
  // Silence detection
  // -------------------------------------------------------------------------
  const endSessionRef = useRef<(reason?: string) => void>(() => {});

  const resetSilenceTimers = useCallback(() => {
    lastAudioTimeRef.current = Date.now();
    if (mountedRef.current) setSilenceWarning(false);

    if (silenceWarningRef.current) clearTimeout(silenceWarningRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    silenceWarningRef.current = setTimeout(() => {
      if (mountedRef.current) setSilenceWarning(true);
    }, 8000);

    silenceTimerRef.current = setTimeout(() => {
      endSessionRef.current("silence_timeout");
    }, 30000);
  }, []);

  // -------------------------------------------------------------------------
  // Session timer
  // -------------------------------------------------------------------------
  const startTimer = useCallback((durationMinutes: number) => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const totalMs = durationMinutes * 60 * 1000;

    // 1-minute warning
    if (totalMs > 60000) {
      setTimeout(() => {
        // We'll use transcript as a carrier for the warning
      }, totalMs - 60000);
    }

    // Hard cut
    sessionEndRef.current = setTimeout(() => {
      endSession("time_limit");
    }, totalMs);
  }, []);

  const stopAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silenceWarningRef.current) {
      clearTimeout(silenceWarningRef.current);
      silenceWarningRef.current = null;
    }
    if (sessionEndRef.current) {
      clearTimeout(sessionEndRef.current);
      sessionEndRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Build system instruction
  // -------------------------------------------------------------------------
  const buildSystemInstruction = useCallback((config: SessionConfig) => {
    const topicText =
      config.topic === "Custom"
        ? config.customTopic || "Free conversation"
        : config.topic;
    return `You are a friendly, encouraging language tutor having a natural spoken conversation with a ${config.difficulty} learner of ${config.targetLanguage}. Topic: ${topicText}.

Rules:
- Speak naturally at a pace appropriate for ${config.difficulty}
- Keep responses to 2–3 sentences maximum to allow back-and-forth
- If the user makes a grammar or vocabulary error, gently correct it once, then continue the conversation — do NOT lecture
- Stay fully in ${config.targetLanguage} for Intermediate and Advanced; use English clarifications sparingly for Beginner
- Be warm, curious, and conversational — like a native-speaking friend, not a teacher`;
  }, []);

  // -------------------------------------------------------------------------
  // Connect
  // -------------------------------------------------------------------------
  const connect = useCallback(
    (config: SessionConfig) => {
      // Close any existing connection first
      if (wsRef.current) {
        safeCloseWs(wsRef.current);
        wsRef.current = null;
      }

      configRef.current = config;
      setStatus("connecting");
      setTranscript([]);
      transcriptRef.current = [];
      setTokensUsed(0);
      audioQueueRef.current = [];
      isPlayingRef.current = false;

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        setStatus("error");
        optionsRef.current.onError?.("Gemini API key not configured");
        return;
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }

        // Send setup message
        const setupMsg = {
          setup: {
            model: "models/gemini-2.5-flash",
            generationConfig: {
              responseModalities: ["AUDIO", "TEXT"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede",
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: buildSystemInstruction(config) }],
            },
          },
        };

        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);

          // Setup complete
          if (data.setupComplete) {
            setStatus("connected");
            setPhase("listening");
            startTimer(config.sessionLengthMinutes);
            resetSilenceTimers();
            return;
          }

          // Server content
          if (data.serverContent) {
            const parts = data.serverContent.modelTurn?.parts || [];

            for (const part of parts) {
              // Text response
              if (part.text) {
                setPhase("responding");
                const entry: TranscriptEntry = {
                  role: "ai",
                  text: part.text,
                  timestamp: Date.now(),
                };
                transcriptRef.current = [...transcriptRef.current, entry];
                setTranscript([...transcriptRef.current]);
                setTokensUsed((prev) => prev + Math.ceil(part.text.length / 4));
                optionsRef.current.onTranscriptUpdate?.([
                  ...transcriptRef.current,
                ]);
              }

              // Audio response
              if (part.inlineData?.data) {
                setPhase("responding");
                optionsRef.current.onAudioOutput?.(part.inlineData.data);
                enqueueAudio(part.inlineData.data);
              }
            }

            // If turn is complete and no more audio queued, switch back to listening
            if (data.serverContent.turnComplete) {
              if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
                setPhase("listening");
              }
              resetSilenceTimers();
            }
          }
        } catch {
          // Ignore parse errors from non-JSON messages
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus("error");
        optionsRef.current.onError?.("WebSocket connection error");
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        if (statusRef.current !== "disconnected") {
          setStatus("disconnected");
          setPhase("idle");
          stopAllTimers();
        }
      };
    },
    [
      buildSystemInstruction,
      enqueueAudio,
      resetSilenceTimers,
      safeCloseWs,
      startTimer,
      stopAllTimers,
    ],
  );

  // -------------------------------------------------------------------------
  // Send audio chunk
  // -------------------------------------------------------------------------
  const sendAudio = useCallback(
    (base64: string, mimeType: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      resetSilenceTimers();

      const msg = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: mimeType,
              data: base64,
            },
          ],
        },
      };

      wsRef.current.send(JSON.stringify(msg));
    },
    [resetSilenceTimers],
  );

  // -------------------------------------------------------------------------
  // Send text (for user transcript tracking)
  // -------------------------------------------------------------------------
  const addUserTranscript = useCallback((text: string) => {
    const entry: TranscriptEntry = {
      role: "user",
      text,
      timestamp: Date.now(),
    };
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript([...transcriptRef.current]);
  }, []);

  // -------------------------------------------------------------------------
  // End session
  // -------------------------------------------------------------------------
  const endSession = useCallback(
    (reason = "user_ended") => {
      stopAllTimers();

      if (wsRef.current) {
        safeCloseWs(wsRef.current);
        wsRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      audioQueueRef.current = [];
      isPlayingRef.current = false;

      if (mountedRef.current) {
        setStatus("disconnected");
        setPhase("idle");
        setSilenceWarning(false);
      }

      optionsRef.current.onSessionEnd?.(reason);
    },
    [safeCloseWs, stopAllTimers],
  );

  // Keep endSessionRef current so silence timers always call the latest version
  useEffect(() => {
    endSessionRef.current = endSession;
  }, [endSession]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopAllTimers();
      if (wsRef.current) {
        safeCloseWs(wsRef.current);
        wsRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    phase,
    transcript,
    elapsedSeconds,
    tokensUsed,
    silenceWarning,
    connect,
    sendAudio,
    addUserTranscript,
    endSession,
  };
}
