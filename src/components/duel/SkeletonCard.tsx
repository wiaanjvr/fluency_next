"use client";

import { motion } from "framer-motion";

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({
  lines = 3,
  className = "",
}: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-3xl p-5 ${className}`}
      style={{
        background: "rgba(13, 27, 42, 0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(61, 214, 181, 0.08)",
      }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar skeleton */}
        <div className="w-12 h-12 rounded-full flex-shrink-0 skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="skeleton-shimmer rounded-full"
              style={{
                height: i === 0 ? "14px" : "10px",
                width: i === 0 ? "60%" : i === 1 ? "40%" : "80%",
              }}
            />
          ))}
        </div>
        {/* Badge skeleton */}
        <div className="w-16 h-6 rounded-full skeleton-shimmer flex-shrink-0" />
      </div>

      <style jsx>{`
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.07) 50%,
            rgba(255, 255, 255, 0.03) 100%
          );
          background-size: 200% 100%;
          animation: shimmerMove 1.5s ease-in-out infinite;
        }
        @keyframes shimmerMove {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </motion.div>
  );
}
