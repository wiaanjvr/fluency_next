"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: {
    border: "rgba(61, 214, 181, 0.25)",
    icon: "#3dd6b5",
    bg: "rgba(61, 214, 181, 0.08)",
  },
  error: {
    border: "rgba(248, 113, 113, 0.25)",
    icon: "#f87171",
    bg: "rgba(248, 113, 113, 0.08)",
  },
  info: {
    border: "rgba(59, 130, 246, 0.25)",
    icon: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.08)",
  },
};

// Global toast state
let toastListeners: ((toasts: ToastData[]) => void)[] = [];
let toastQueue: ToastData[] = [];

export function showToast(type: ToastType, message: string, duration = 3000) {
  const toast: ToastData = {
    id: `toast-${Date.now()}-${Math.random()}`,
    type,
    message,
    duration,
  };
  toastQueue = [...toastQueue, toast];
  toastListeners.forEach((fn) => fn(toastQueue));

  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== toast.id);
    toastListeners.forEach((fn) => fn(toastQueue));
  }, duration);
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastData[]) => setToasts([...newToasts]);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    toastListeners.forEach((fn) => fn(toastQueue));
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          const colors = COLORS[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{
                duration: 0.35,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-full"
              style={{
                background: "rgba(13, 27, 42, 0.85)",
                backdropFilter: "blur(20px)",
                border: `1px solid ${colors.border}`,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: colors.icon }}
              />
              <span
                className="font-body text-sm font-medium"
                style={{ color: "#e8d5b0" }}
              >
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                className="ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" style={{ color: "#718096" }} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
