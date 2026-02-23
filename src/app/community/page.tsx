"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import {
  SubmissionCard,
  langFlag,
} from "@/components/community/SubmissionCard";
import { SubmissionModal } from "@/components/community/SubmissionModal";
import { SubmitExerciseModal } from "@/components/community/SubmitExerciseModal";
import { useCommunityStore } from "@/lib/store/communityStore";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Plus, Users } from "lucide-react";
import "@/styles/ocean-theme.css";

export default function CommunityPage() {
  const { user } = useAuth();
  const {
    mySubmissions,
    mySubmissionsLoading,
    mySubmissionsHasMore,
    fetchMySubmissions,
    loadMoreMySubmissions,
  } = useCommunityStore();

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("fr");

  // Load user's target language and my submissions
  useEffect(() => {
    if (user?.id) {
      fetchMySubmissions(user.id);
      // Fetch user profile for language header
      const supabase = createClient();
      supabase
        .from("profiles")
        .select("target_language")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.target_language) setTargetLanguage(data.target_language);
        });
    }
  }, [user?.id, fetchMySubmissions]);

  const LANGUAGE_NAMES: Record<string, string> = {
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    en: "English",
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--midnight)]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-ocean-turquoise/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-ocean-turquoise" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-semibold text-sand">
                  Community
                </h1>
                <p className="text-sm text-seafoam/50">
                  {langFlag(targetLanguage)}{" "}
                  {LANGUAGE_NAMES[targetLanguage] ?? targetLanguage}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSubmitModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-ocean-turquoise/15 px-4 py-2.5 text-sm font-medium text-ocean-turquoise hover:bg-ocean-turquoise/25 transition-colors border border-ocean-turquoise/20"
            >
              <Plus className="h-4 w-4" />
              Submit for Review
            </button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="review-others" className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger
                value="review-others"
                className="flex-1 sm:flex-none"
              >
                Review Others
              </TabsTrigger>
              <TabsTrigger
                value="my-submissions"
                className="flex-1 sm:flex-none"
              >
                My Submissions
              </TabsTrigger>
            </TabsList>

            {/* Feed tab */}
            <TabsContent value="review-others">
              <CommunityFeed />
            </TabsContent>

            {/* My submissions tab */}
            <TabsContent value="my-submissions">
              {mySubmissionsLoading && mySubmissions.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-ocean-turquoise/10 p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : mySubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-20 w-20 rounded-full bg-ocean-turquoise/5 flex items-center justify-center mb-6">
                    <span className="text-3xl">🌊</span>
                  </div>
                  <h3 className="text-lg font-display font-semibold text-sand/80 mb-2">
                    No submissions yet
                  </h3>
                  <p className="text-sm text-seafoam/40 max-w-sm mb-6">
                    Submit your writing or speaking exercises to get feedback
                    from the community.
                  </p>
                  <button
                    onClick={() => setSubmitModalOpen(true)}
                    className="rounded-2xl bg-ocean-turquoise/15 px-5 py-2.5 text-sm font-medium text-ocean-turquoise hover:bg-ocean-turquoise/25 transition-colors border border-ocean-turquoise/20"
                  >
                    Submit your first exercise
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mySubmissions.map((submission) => (
                      <SubmissionCard
                        key={submission.id}
                        submission={submission}
                        onClick={() => {
                          setSelectedSubmissionId(submission.id);
                          setDetailModalOpen(true);
                        }}
                      />
                    ))}
                  </div>

                  {mySubmissionsHasMore && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={() =>
                          user?.id && loadMoreMySubmissions(user.id)
                        }
                        disabled={mySubmissionsLoading}
                        className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-medium text-seafoam/60 hover:bg-white/10 transition-colors border border-white/5 disabled:opacity-50"
                      >
                        {mySubmissionsLoading ? "Loading…" : "Load more"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Submit Exercise Modal */}
        <SubmitExerciseModal
          open={submitModalOpen}
          onOpenChange={setSubmitModalOpen}
        />

        {/* Submission Detail Modal (for My Submissions tab) */}
        <SubmissionModal
          submissionId={selectedSubmissionId}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      </div>
    </ProtectedRoute>
  );
}
