"use client";

import { useEffect, useState } from "react";

interface UseOnboardingAnimationOptions {
  /** When true, the animate-in class is scheduled after `delay` ms */
  isVisible: boolean;
  /** Delay in milliseconds before applying the active class (default: 0) */
  delay?: number;
}

interface UseOnboardingAnimationReturn {
  /**
   * CSS class string to spread onto the target element.
   *
   * - `"ob-anim-out"` — initial / hidden state  (opacity:0, translateY:12px)
   * - `"ob-anim-in"`  — revealed state           (opacity:1, translateY:0)
   *
   * Define these classes in onboarding-layout.css or equivalent.
   * Stagger multiple elements by passing increasing `delay` values.
   *
   * @example
   * ```tsx
   * const { animationClass } = useOnboardingAnimation({ isVisible: true, delay: 200 });
   * return <p className={animationClass}>Appears 200ms after mount</p>;
   * ```
   */
  animationClass: string;
}

/**
 * Returns a CSS animation class for staggered entrance reveals within a
 * single onboarding step.
 *
 * Pairs with `.ob-anim-out` / `.ob-anim-in` in onboarding-layout.css.
 */
export function useOnboardingAnimation({
  isVisible,
  delay = 0,
}: UseOnboardingAnimationOptions): UseOnboardingAnimationReturn {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setActive(false);
      return;
    }

    if (delay === 0) {
      setActive(true);
      return;
    }

    const timer = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(timer);
  }, [isVisible, delay]);

  return { animationClass: active ? "ob-anim-in" : "ob-anim-out" };
}
