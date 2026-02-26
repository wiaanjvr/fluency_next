"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppNav } from "@/components/navigation";
import { CommunityPageLayout } from "@/components/community/CommunityPageLayout";
import { useAuth } from "@/contexts/AuthContext";
import "@/styles/ocean-theme.css";

export default function CommunityPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <AppNav />
      <CommunityPageLayout />
    </ProtectedRoute>
  );
}
