"use client";

import { useState, useCallback } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Gift, Heart, Sparkles, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlobalGivingProjectPicker } from "./GlobalGivingProjectPicker";
import type { RewardOption } from "@/types/rewards";
import { cn } from "@/lib/utils";

/* =============================================================================
   REWARD MODAL
   
   Shown when a user completes ALL monthly goals. Lets them choose between:
   A) Full 50% discount on next month's billing
   B) Split: discount + charity donation via GlobalGiving
============================================================================= */

interface RewardModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Reward amount in cents (50% of subscription) */
  rewardAmount: number;
  /** Reward row ID from the database */
  rewardId: string;
  /** Callback after the user confirms their choice */
  onConfirm?: () => void;
}

export function RewardModal({
  isOpen,
  onClose,
  rewardAmount,
  rewardId,
  onConfirm,
}: RewardModalProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<"choose" | "split">("choose");
  const [splitPercent, setSplitPercent] = useState(60); // discount %
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed amounts in cents
  const discountCents = Math.round((splitPercent / 100) * rewardAmount);
  const charityCents = rewardAmount - discountCents;

  // Format cents to Rand display string
  const formatRand = (cents: number) => `R${(cents / 100).toFixed(2)}`;

  // ── Save reward choice to API ────────────────────────────────────────────
  const saveChoice = useCallback(
    async (option: RewardOption) => {
      setSaving(true);
      setError(null);

      try {
        const body: Record<string, any> = {
          option,
          discount_amount: option === "discount" ? rewardAmount : discountCents,
          charity_amount: option === "discount" ? 0 : charityCents,
        };

        if (option === "split" && selectedProject) {
          body.globalgiving_project_id = selectedProject.id;
          body.globalgiving_project_name = selectedProject.name;
        }

        const res = await fetch("/api/rewards/save-choice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save choice");
        }

        setSaved(true);
        onConfirm?.();

        // Auto-close after a brief celebration pause
        setTimeout(() => onClose(), 2500);
      } catch (err) {
        console.error("Error saving reward choice:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSaving(false);
      }
    },
    [
      rewardAmount,
      discountCents,
      charityCents,
      selectedProject,
      onClose,
      onConfirm,
    ],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <Card className="max-w-lg w-full mx-4 shadow-lg relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Success state ─────────────────────────────────────────── */}
        {saved && (
          <div className="p-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-feedback-success/20 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-feedback-success" />
            </div>
            <h3 className="text-2xl font-light">Choice saved!</h3>
            <p className="text-muted-foreground text-sm">
              Your reward will be applied on your next billing date.
            </p>
          </div>
        )}

        {/* ── Step 1: Choose option ─────────────────────────────────── */}
        {!saved && step === "choose" && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-ocean-turquoise/20 flex items-center justify-center mb-3">
                <Gift className="h-7 w-7 text-ocean-turquoise" />
              </div>
              <CardTitle className="text-xl">You crushed your goals!</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Your reward:{" "}
                <span className="text-ocean-turquoise font-semibold">
                  50% off ({formatRand(rewardAmount)})
                </span>
              </p>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              {/* Option A — Full discount */}
              <button
                onClick={() => saveChoice("discount")}
                disabled={saving}
                className={cn(
                  "w-full p-4 rounded-2xl border-[1.5px] border-border text-left transition-all duration-200",
                  "hover:border-ocean-turquoise hover:bg-ocean-turquoise/5",
                  "active:scale-[0.99]",
                  saving && "opacity-50 pointer-events-none",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ocean-turquoise/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-ocean-turquoise" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Take the full discount
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRand(rewardAmount)} off your next month&apos;s bill
                    </p>
                  </div>
                </div>
              </button>

              {/* Option B — Split */}
              <button
                onClick={() => setStep("split")}
                disabled={saving}
                className={cn(
                  "w-full p-4 rounded-2xl border-[1.5px] border-border text-left transition-all duration-200",
                  "hover:border-ocean-turquoise hover:bg-ocean-turquoise/5",
                  "active:scale-[0.99]",
                  saving && "opacity-50 pointer-events-none",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center flex-shrink-0">
                    <Heart className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Split between discount + charity
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose how much goes to your bill vs. a cause you love
                    </p>
                  </div>
                </div>
              </button>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}
            </CardContent>
          </>
        )}

        {/* ── Step 2: Split configuration ───────────────────────────── */}
        {!saved && step === "split" && (
          <>
            <CardHeader className="pb-2">
              <button
                onClick={() => {
                  setStep("choose");
                  setError(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                &larr; Back
              </button>
              <CardTitle className="text-lg">
                Split your {formatRand(rewardAmount)} reward
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 pt-0">
              {/* Live amounts display */}
              <div className="flex items-center justify-between bg-muted/30 rounded-2xl p-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-ocean-turquoise">
                    {formatRand(discountCents)}
                  </p>
                  <p className="text-xs text-muted-foreground">off your bill</p>
                </div>
                <div className="text-muted-foreground text-xs">+</div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-pink-500">
                    {formatRand(charityCents)}
                  </p>
                  <p className="text-xs text-muted-foreground">to charity</p>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Discount {splitPercent}%</span>
                  <span>Charity {100 - splitPercent}%</span>
                </div>
                <SliderPrimitive.Root
                  className="relative flex items-center select-none touch-none w-full h-5"
                  value={[splitPercent]}
                  onValueChange={([val]) => setSplitPercent(val)}
                  min={0}
                  max={100}
                  step={5}
                >
                  <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
                    <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-ocean-turquoise to-pink-500 rounded-full" />
                  </SliderPrimitive.Track>
                  <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-ocean-turquoise bg-background shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-grab active:cursor-grabbing" />
                </SliderPrimitive.Root>
              </div>

              {/* GlobalGiving project picker (only when charity > 0) */}
              {charityCents > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Choose a project</p>
                  <GlobalGivingProjectPicker
                    onSelect={setSelectedProject}
                    selectedProjectId={selectedProject?.id}
                  />
                </div>
              )}

              {/* Confirm button */}
              <Button
                variant="ocean"
                size="lg"
                className="w-full"
                disabled={saving || (charityCents > 0 && !selectedProject)}
                onClick={() => saveChoice("split")}
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Saving...
                  </>
                ) : (
                  "Confirm split"
                )}
              </Button>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
