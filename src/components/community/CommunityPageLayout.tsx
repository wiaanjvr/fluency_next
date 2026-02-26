"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CommunityHero } from "./CommunityHero";
import { CommunitySidebar } from "./CommunitySidebar";
import { OceanAmbient } from "./OceanAmbient";
import { PeerReviewTab } from "./PeerReviewTab";
import { SpeakingLabTab } from "./SpeakingLabTab";
import { DiveLogsTab } from "./DiveLogsTab";
import { DispatchTab } from "./DispatchTab";
import { MessagesTab } from "./MessagesTab";
import type { CommunityTab } from "@/types/dive-tank";

export function CommunityPageLayout() {
  const [activeTab, setActiveTab] = useState<CommunityTab>("peer-review");
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const renderTab = () => {
    switch (activeTab) {
      case "peer-review":
        return <PeerReviewTab onSubmitClick={() => setSubmitModalOpen(true)} />;
      case "speaking-lab":
        return <SpeakingLabTab />;
      case "dive-logs":
        return <DiveLogsTab />;
      case "dispatch":
        return <DispatchTab />;
      case "messages":
        return <MessagesTab />;
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--midnight)]">
      {/* Ocean ambient effects */}
      <OceanAmbient />

      {/* Hero + Tab bar */}
      <CommunityHero
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSubmitClick={() => setSubmitModalOpen(true)}
      />

      {/* Main content area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex gap-8">
          {/* Main column */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Sidebar — hidden on Messages tab (full-width layout) */}
          {activeTab !== "messages" && (
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-20">
                <CommunitySidebar />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
