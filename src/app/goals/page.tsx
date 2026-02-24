"use client";

import { useCallback, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GoalsDashboard, GoalProgressToast } from "@/components/goals";
import { OceanBackground } from "@/components/ocean";
import { useGoalTracking } from "@/hooks/useGoalTracking";

/* =============================================================================
   /goals — Goals page route

   Wraps the GoalsDashboard component with auth protection and ocean background.
   TODO: Wire onRewardClick to open the existing RewardModal/GameboardRewardModal
============================================================================= */

function GoalsPageContent() {
  const { newlyCompleted } = useGoalTracking();
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
      <OceanBackground>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
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
