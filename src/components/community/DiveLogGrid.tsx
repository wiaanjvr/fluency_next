"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiveLogCard } from "./DiveLogCard";
import { useDiveLogs, useCreateDiveLog } from "@/hooks/useDiveLogs";
import { OceanEmptyState } from "./OceanEmptyState";
import { DiveLogEditor } from "./DiveLogEditor";
import { PenLine } from "lucide-react";

export function DiveLogGrid() {
  const { logs, featured, loading } = useDiveLogs();
  const { create, creating: submitting } = useCreateDiveLog();
  const [editorOpen, setEditorOpen] = useState(false);

  const handleSubmit = async (data: {
    title: string;
    content: string;
    tags: string[];
  }) => {
    await create(data);
    setEditorOpen(false);
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-seafoam/40 tracking-wide uppercase">
          Dive Logs
        </h2>
        {!editorOpen && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-sm text-seafoam/60 hover:text-teal-300 hover:border-teal-500/20 transition-all"
          >
            <PenLine className="h-3.5 w-3.5" />
            Write a Dive Log
          </motion.button>
        )}
      </div>

      {/* Editor */}
      <AnimatePresence>
        {editorOpen && (
          <DiveLogEditor
            onSubmit={handleSubmit}
            onCancel={() => setEditorOpen(false)}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-white/[0.02] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && logs.length === 0 && !featured && (
        <OceanEmptyState
          message="No dive logs yet"
          actionLabel="Write the first one"
          onAction={() => setEditorOpen(true)}
        />
      )}

      {/* Grid */}
      {!loading && (logs.length > 0 || featured) && (
        <div className="space-y-5">
          {/* Featured post — full width */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <DiveLogCard log={featured} featured />
            </motion.div>
          )}

          {/* 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {logs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                >
                  <DiveLogCard log={log} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
