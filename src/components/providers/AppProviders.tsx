"use client";

import React, { type ReactNode } from "react";
import { ActiveLanguageProvider } from "@/contexts/ActiveLanguageContext";
import { ProgressionProvider } from "@/components/progression";
import {
  ImmerseProvider,
  ImmersePlayer,
  ImmerseSelectModal,
} from "@/components/immerse";
import { LevelUpModal } from "@/components/progression/LevelUpModal";

// ============================================================================
// AppProviders — Composes dashboard-level providers in correct order
//
// ActiveLanguageProvider → ProgressionProvider → ImmerseProvider
// Also renders persistent root-level modals/players:
//   - ImmersePlayer (floating mini-player)
//   - ImmerseSelectModal (stream selector)
//   - LevelUpModal is rendered by ProgressionProvider internally
// ============================================================================

interface AppProvidersProps {
  children: ReactNode;
  /** Initial word count from server or parent data fetch */
  initialWordCount?: number;
}

export function AppProviders({
  children,
  initialWordCount = 0,
}: AppProvidersProps) {
  return (
    <ActiveLanguageProvider>
      <ProgressionProvider initialWordCount={initialWordCount}>
        <ImmerseProvider>
          {children}
          <ImmersePlayer />
          <ImmerseSelectModal />
        </ImmerseProvider>
      </ProgressionProvider>
    </ActiveLanguageProvider>
  );
}
