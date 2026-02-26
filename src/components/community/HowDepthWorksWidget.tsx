"use client";

export function HowDepthWorksWidget() {
  const steps = [
    "Submit a writing, speaking, or grammar exercise for review.",
    "Fellow learners review your work with structured corrections.",
    "Review others to earn Depth Points (DP) and climb the leaderboard.",
    "Higher ranks unlock deeper content and community features.",
  ];

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-seafoam/40 mb-4">
        How The Depth Works
      </h3>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center text-[11px] font-bold">
              {i + 1}
            </span>
            <p className="text-[13px] text-seafoam/50 leading-relaxed">
              {step}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
        <p className="text-[12px] text-seafoam/35 italic leading-relaxed">
          💡 Quality reviews earn more DP than quick ones. Be thorough, be kind
          — we&apos;re all learning together in these waters.
        </p>
      </div>
    </div>
  );
}
