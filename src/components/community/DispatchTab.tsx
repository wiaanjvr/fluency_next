"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { ThreadList } from "./ThreadList";
import { ThreadViewer } from "./ThreadViewer";
import { NewThreadComposer } from "./NewThreadComposer";
import { useCreateThread } from "@/hooks/useDispatch";
import type { DispatchThread, DispatchCategory } from "@/types/dive-tank";

export function DispatchTab() {
  const [selectedThread, setSelectedThread] = useState<DispatchThread | null>(
    null,
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const { create, creating: submitting } = useCreateThread();

  const handleCreate = async (data: {
    title: string;
    body: string;
    category: DispatchCategory;
  }) => {
    await create({
      title: data.title,
      content: data.body,
      category: data.category,
    });
    setComposerOpen(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-seafoam/40 tracking-wide uppercase">
          Dispatch Board
        </h2>
        {!composerOpen && (
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-sm text-seafoam/60 hover:text-teal-300 hover:border-teal-500/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            New Thread
          </button>
        )}
      </div>

      {/* Thread composer */}
      <AnimatePresence>
        {composerOpen && (
          <NewThreadComposer
            onSubmit={handleCreate}
            onCancel={() => setComposerOpen(false)}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      {/* Thread list */}
      <ThreadList onSelectThread={setSelectedThread} />

      {/* Thread viewer slide-over */}
      <AnimatePresence>
        {selectedThread && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSelectedThread(null)}
            />
            <ThreadViewer
              thread={selectedThread}
              onClose={() => setSelectedThread(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
