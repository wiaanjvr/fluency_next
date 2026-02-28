"use client";

import { useState, useCallback } from "react";
import { Upload, X, Image, Music, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaUpload } from "./media-utils";
import { getMediaType, ALL_ACCEPTED_TYPES } from "@/types/card-editor";

interface MediaDropZoneProps {
  userId: string;
  onMediaInserted: (html: string) => void;
  className?: string;
}

export function MediaDropZone({
  userId,
  onMediaInserted,
  className,
}: MediaDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const { upload, uploading, error, clearError } = useMediaUpload(userId);

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const result = await upload(file);
        if (!result) continue;

        const type = getMediaType(file.type);
        let html = "";
        switch (type) {
          case "image":
            html = `<img src="${result.url}" alt="${result.filename}" class="max-w-full rounded-lg my-2" />`;
            break;
          case "audio":
            html = `[sound:${result.url}]`;
            break;
          case "video":
            html = `<video controls src="${result.url}" class="max-w-full rounded-lg my-2"></video>`;
            break;
        }
        onMediaInserted(html);
      }
    },
    [upload, onMediaInserted],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles],
  );

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer",
          dragging
            ? "border-teal-400 bg-teal-500/10"
            : "border-white/10 hover:border-white/20 bg-white/[0.02]",
        )}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ALL_ACCEPTED_TYPES.join(",");
          input.multiple = true;
          input.onchange = () => {
            if (input.files?.length) {
              handleFiles(Array.from(input.files));
            }
          };
          input.click();
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
            <span className="text-xs text-white/50">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5 text-white/30" />
              <Music className="h-5 w-5 text-white/30" />
              <Video className="h-5 w-5 text-white/30" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Upload className="h-3 w-3" />
              Drop media or click to browse
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <span className="text-xs text-rose-300">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-rose-300 hover:text-rose-200 transition"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
