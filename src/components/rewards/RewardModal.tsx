"use client";

import { useState, useCallback } from "react";
import { Gift, Waves, Sparkles, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* =============================================================================
   REWARD MODAL
   
   Shown when a user completes ALL monthly goals. Awards credits that go
   toward the community pooled ocean cleanup donation.
   
   The user sees: 
   - Credits earned from goal completion
   - Info about The Ocean Cleanup impact
   - Option to redeem credits toward ocean cleanup
============================================================================= */

interface RewardModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Number of credits awarded */
  creditsAwarded: number;
  /** Reward row ID from the database */
  rewardId: string;
  /** Callback after the user confirms their choice */
  onConfirm?: () => void;
}

export function RewardModal({
  isOpen,
  onClose,
  creditsAwarded,
  rewardId,
  onConfirm,
}: RewardModalProps) {
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Redeem credits toward ocean cleanup ──────────────────────────────
  const redeemCredits = useCallback(async () => {
    setRedeeming(true);
    setError(null);

    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: creditsAwarded }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to redeem credits");
      }

      setRedeemed(true);
      onConfirm?.();

      // Auto-close after celebration pause
      setTimeout(() => onClose(), 3000);
    } catch (err) {
      console.error("Error redeeming credits:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRedeeming(false);
    }
  }, [creditsAwarded, onClose, onConfirm]);

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
        {redeemed && (
          <div className="p-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-ocean-turquoise/20 flex items-center justify-center">
              <Waves className="h-8 w-8 text-ocean-turquoise" />
            </div>
            <h3 className="text-2xl font-light">Credits redeemed! 🌊</h3>
            <p className="text-muted-foreground text-sm">
              Your credits have been pooled toward The Ocean Cleanup.
              You&apos;ll be notified when your impact is calculated.
            </p>
          </div>
        )}

        {/* ── Main state ────────────────────────────────────────────── */}
        {!redeemed && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-ocean-turquoise/20 flex items-center justify-center mb-3">
                <Gift className="h-7 w-7 text-ocean-turquoise" />
              </div>
              <CardTitle className="text-xl">You crushed your goals!</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                You earned{" "}
                <span className="text-ocean-turquoise font-semibold">
                  {creditsAwarded} credit{creditsAwarded !== 1 ? "s" : ""}
                </span>
              </p>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              {/* Ocean Cleanup info */}
              <div className="bg-ocean-turquoise/5 border border-ocean-turquoise/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Waves className="h-5 w-5 text-ocean-turquoise" />
                  <p className="text-sm font-medium">Help clean the ocean 🐠</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your credits are pooled with the Fluensea community and
                  donated monthly to{" "}
                  <a
                    href="https://theoceancleanup.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-turquoise hover:underline"
                  >
                    The Ocean Cleanup
                  </a>
                  . Every dollar intercepts ~19 plastic bottles from rivers
                  before they reach the ocean.
                </p>
              </div>

              {/* Redeem button */}
              <Button
                variant="ocean"
                size="lg"
                className="w-full"
                disabled={redeeming}
                onClick={redeemCredits}
              >
                {redeeming ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Redeeming...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Redeem {creditsAwarded} credit
                    {creditsAwarded !== 1 ? "s" : ""} for ocean cleanup
                  </>
                )}
              </Button>

              {/* Skip option */}
              <button
                onClick={onClose}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Save for later
              </button>

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
