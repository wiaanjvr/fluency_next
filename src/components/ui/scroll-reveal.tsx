"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  once?: boolean;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 800,
  direction = "up",
  distance = 40,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" },
    );

    if (ref.current) {
      // Check if already in viewport on mount
      const rect = ref.current.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (inViewport) {
        setIsVisible(true);
      }

      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [once, threshold]);

  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0)";
    switch (direction) {
      case "up":
        return `translate3d(0, ${distance}px, 0)`;
      case "down":
        return `translate3d(0, -${distance}px, 0)`;
      case "left":
        return `translate3d(${distance}px, 0, 0)`;
      case "right":
        return `translate3d(-${distance}px, 0, 0)`;
      default:
        return "translate3d(0, 0, 0)";
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: mounted ? getTransform() : "translate3d(0, 0, 0)",
        opacity: mounted ? (isVisible ? 1 : 0) : 1,
        transition: mounted
          ? `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
          : "none",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

export function ScrollRevealGroup({
  children,
  className = "",
  staggerDelay = 100,
}: {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <ScrollReveal key={index} delay={index * staggerDelay}>
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}
