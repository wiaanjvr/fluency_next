"use client";

import { useState } from "react";
import { Mic, Square, Trash2, Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder, useMediaUpload } from "./media-utils";

interface AudioRecorderProps {
  userId: string;
  onRecorded: (url: string) => void;
  onClose: () => void;
}

export function AudioRecorder({
  userId,
  onRecorded,
  onClose,
}: AudioRecorderProps) {
  const {
    recording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();
  const { upload, uploading } = useMediaUpload(userId);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleSave = async () => {
    if (!audioBlob) return;
    const file = new File([audioBlob], `recording_${Date.now()}.webm`, {
      type: "audio/webm",
    });
    const result = await upload(file);
    if (result) {
      onRecorded(result.url);
      onClose();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Generate preview URL for playback
  if (audioBlob && !audioUrl) {
    setAudioUrl(URL.createObjectURL(audioBlob));
  }

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">
          Audio Recorder
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-white/40 hover:text-white/70 transition"
        >
          Cancel
        </button>
      </div>

      {!audioBlob ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition",
              recording
                ? "bg-rose-500 hover:bg-rose-400 animate-pulse"
                : "bg-teal-500 hover:bg-teal-400",
            )}
          >
            {recording ? (
              <Square className="h-6 w-6 text-white" />
            ) : (
              <Mic className="h-6 w-6 text-[#0a1628]" />
            )}
          </button>
          <span className="text-sm text-white/50 font-mono">
            {recording ? formatTime(duration) : "Tap to record"}
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearRecording();
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition"
            >
              <Trash2 className="h-4 w-4" />
              Re-record
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition",
                "bg-teal-500 hover:bg-teal-400 text-[#0a1628]",
                uploading && "opacity-50 cursor-not-allowed",
              )}
            >
              {uploading ? (
                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Use recording"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
