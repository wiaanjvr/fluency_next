"use client";

import { useProfileLocation } from "@/hooks/useProfileLocation";

/**
 * Invisible component that stamps the user's profile with geo data on sign-in.
 * Rendered once inside the provider tree (layout.tsx).
 */
export function ProfileLocationSync() {
  useProfileLocation();
  return null;
}
