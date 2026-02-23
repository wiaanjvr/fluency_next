"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface WaveformDisplayProps {
  /** Native speaker audio URL */
  nativeAudioUrl?: string | null;
  /** User's recorded audio blob */
  userAudioBlob?: Blob | null;
  /** Width of the display */
  width?: number;
  /** Height of the display */
  height?: number;
  /** Additional class names */
  className?: string;
}

export default function WaveformDisplay({
  nativeAudioUrl,
  userAudioBlob,
  width = 600,
  height = 120,
  className,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions for HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const drawWaveformData = (
      data: Float32Array,
      color: string,
      offsetY: number,
      amplitude: number,
    ) => {
      const step = Math.ceil(data.length / width);
      const halfHeight = height / 4;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        const idx = Math.floor(i * step);
        let sum = 0;
        let count = 0;
        for (let j = idx; j < idx + step && j < data.length; j++) {
          sum += Math.abs(data[j]);
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        const y = offsetY + avg * halfHeight * amplitude;
        const yMirror = offsetY - avg * halfHeight * amplitude;

        if (i === 0) {
          ctx.moveTo(i, y);
        } else {
          ctx.lineTo(i, y);
        }
      }
      ctx.stroke();

      // Mirror
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        const idx = Math.floor(i * step);
        let sum = 0;
        let count = 0;
        for (let j = idx; j < idx + step && j < data.length; j++) {
          sum += Math.abs(data[j]);
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        const yMirror = offsetY - avg * halfHeight * amplitude;

        if (i === 0) {
          ctx.moveTo(i, yMirror);
        } else {
          ctx.lineTo(i, yMirror);
        }
      }
      ctx.stroke();
    };

    const drawAll = async () => {
      ctx.clearRect(0, 0, width, height);

      // Draw center line
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 4);
      ctx.lineTo(width, height / 4);
      ctx.moveTo(0, (height * 3) / 4);
      ctx.lineTo(width, (height * 3) / 4);
      ctx.stroke();

      // Labels
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "rgba(61, 214, 181, 0.5)";
      ctx.fillText("Native", 4, 14);
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillText("You", 4, height / 2 + 14);

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;

      // Decode and draw native audio
      if (nativeAudioUrl) {
        try {
          const response = await fetch(nativeAudioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioCtx = new AudioCtx();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          drawWaveformData(
            channelData,
            "rgba(61, 214, 181, 0.7)",
            height / 4,
            3,
          );
          audioCtx.close();
        } catch (err) {
          console.error("Failed to decode native audio:", err);
        }
      }

      // Decode and draw user audio
      if (userAudioBlob) {
        try {
          const arrayBuffer = await userAudioBlob.arrayBuffer();
          const audioCtx = new AudioCtx();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          drawWaveformData(
            channelData,
            "rgba(255, 255, 255, 0.4)",
            (height * 3) / 4,
            3,
          );
          audioCtx.close();
        } catch (err) {
          console.error("Failed to decode user audio:", err);
        }
      }
    };

    drawAll();
  }, [nativeAudioUrl, userAudioBlob, width, height]);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 overflow-hidden",
        "bg-gradient-to-b from-white/[0.02] to-transparent",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
      />
    </div>
  );
}
