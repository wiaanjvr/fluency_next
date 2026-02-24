"use client";

import { useEffect, useRef } from "react";

interface WaterCausticsProps {
  className?: string;
  opacity?: number;
  disabled?: boolean;
}

export default function WaterCaustics({
  className = "",
  opacity = 0.04,
  disabled = false,
}: WaterCausticsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    if (disabled) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      // Lower resolution for performance
      const scale = 0.25;
      canvas.width = canvas.offsetWidth * scale;
      canvas.height = canvas.offsetHeight * scale;
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      timeRef.current += 0.008;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;

      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = x / w;
          const ny = y / h;

          // Overlapping sine waves for caustic patterns
          const v1 = Math.sin(nx * 8 + t * 0.7) * Math.cos(ny * 6 - t * 0.5);
          const v2 =
            Math.sin((nx + ny) * 5 + t * 0.4) *
            Math.cos(nx * 4 - ny * 3 + t * 0.6);
          const v3 = Math.sin(nx * 3 - t * 0.3) * Math.sin(ny * 7 + t * 0.5);

          const value = (v1 + v2 + v3) / 3;
          const brightness = Math.max(0, value) * 255;

          const idx = (y * w + x) * 4;
          // Teal-tinted caustics
          data[idx] = brightness * 0.3; // R
          data[idx + 1] = brightness * 0.85; // G
          data[idx + 2] = brightness * 0.75; // B
          data[idx + 3] = brightness * 0.6; // A
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{
        opacity,
        imageRendering: "auto",
        filter: "blur(8px)",
        mixBlendMode: "screen",
      }}
    />
  );
}
