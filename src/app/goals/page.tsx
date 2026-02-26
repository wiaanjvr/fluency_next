"use client";

import { useCallback, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GoalsDashboard, GoalProgressToast } from "@/components/goals";
import { OceanBackground } from "@/components/ocean";
import {
  AppNav,
  ContextualNav,
  MobileBottomNav,
} from "@/components/navigation";
import { useActiveLanguage } from "@/contexts/ActiveLanguageContext";
import { useGoalTracking } from "@/hooks/useGoalTracking";

/* =============================================================================
   /goals — Chart page (analytics & goals)

   Accessible via the Chart icon in the secondary nav.
   Shows contextual breadcrumb ("← Back to Course") and page header with
   current language and depth level context.
============================================================================= */

function GoalsPageContent() {
  const { newlyCompleted } = useGoalTracking();
  const { activeLanguage } = useActiveLanguage();
  const [, setShowReward] = useState(false);

  const handleRewardClick = useCallback(() => {
    // TODO: Open the GameboardRewardModal from the existing rewards system
    setShowReward(true);
  }, []);

  const handleClearCompleted = useCallback(() => {
    // Toasts auto-dismiss
  }, []);

  return (
    <div className="min-h-screen">
      <AppNav />
      <ContextualNav />
      <MobileBottomNav />

      <OceanBackground>
        <div className="container mx-auto px-4 pt-24 pb-8 max-w-4xl">
          {/* Page header with language context */}
          <div className="mb-6">
            <h1
              className="font-display text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: "var(--sand, #e8dcc8)" }}
            >
              Chart
            </h1>
            <p
              className="font-body text-sm mt-1"
              style={{ color: "var(--seafoam, #a8d5c2)", opacity: 0.65 }}
            >
              {activeLanguage.flag} {activeLanguage.name} — Goals & Analytics
            </p>
          </div>

          <GoalsDashboard onRewardClick={handleRewardClick} />
        </div>
      </OceanBackground>

      {/* Goal completion toasts */}
      <GoalProgressToast
        completedGoals={newlyCompleted}
        onClear={handleClearCompleted}
      />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsPageContent />
    </ProtectedRoute>
  );
}
