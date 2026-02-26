"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/ui/LoadingScreen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTEREST_TOPICS } from "@/types";
import {
  ArrowUp,
  Crown,
  Camera,
  User as UserIcon,
  ChevronRight,
  RefreshCcw,
  X,
  AlertTriangle,
  Loader2,
  Languages,
  LogOut,
  Anchor,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLevelLabel } from "@/lib/placement/scoring";
import { ProficiencyLevel } from "@/types";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  signout,
} from "@/app/auth/actions";
import {
  getTierConfig,
  getTiersAbove,
  TIERS,
  type TierSlug,
} from "@/lib/tiers";

/* ─── Ocean-branded proficiency depth mapping ─── */
const DEPTH_LABELS: Record<string, string> = {
  A0: "Surface Level",
  A1: "Shallow Waters",
  A2: "Reef Explorer",
  B1: "Open Water",
  B2: "Deep Diver",
  C1: "Abyss Walker",
  C2: "Ocean Master",
};

const DEPTH_LEVEL_ORDER = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  target_language: string;
  native_language: string;
  proficiency_level: string;
  interests: string[];
  subscription_tier: string;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [refundEligibility, setRefundEligibility] = useState<{
    eligible: boolean;
    daysRemaining: number;
  } | null>(null);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [changingLanguage, setChangingLanguage] = useState(false);

  const [fullName, setFullName] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [nativeLanguage, setNativeLanguage] = useState("en");
  const [proficiencyLevel, setProficiencyLevel] = useState("A1");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  /* ─── Dirty-state tracking for save button ─── */
  const isDirty = useMemo(() => {
    if (!profile) return false;
    return (
      fullName !== (profile.full_name || "") ||
      targetLanguage !== profile.target_language ||
      nativeLanguage !== profile.native_language
    );
  }, [profile, fullName, targetLanguage, nativeLanguage]);

  useEffect(() => {
    loadProfile();
    checkRefundEligibility();
  }, []);

  // Scroll to anchor when navigated via hash (e.g. /settings#language)
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      setTimeout(
        () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
        150,
      );
    }
  }, [loading]);

  const loadProfile = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const profileData = await getProfile();
      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setTargetLanguage(profileData.target_language);
        setNativeLanguage(profileData.native_language);
        setProficiencyLevel(profileData.proficiency_level);
        setSelectedInterests(profileData.interests || []);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkRefundEligibility = async () => {
    try {
      const response = await fetch("/api/paystack/refund");
      if (response.ok) {
        const data = await response.json();
        setRefundEligibility({
          eligible: data.eligible,
          daysRemaining: data.daysRemaining,
        });
      }
    } catch (error) {
      console.error("Error checking refund eligibility:", error);
    }
  };

  const handleRequestRefund = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription and request a refund? This will immediately downgrade you to the free plan.",
      )
    ) {
      return;
    }

    setProcessingRefund(true);
    setMessage(null);

    try {
      const response = await fetch("/api/paystack/refund", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message });
        await loadProfile();
        await checkRefundEligibility();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to process refund request. Please try again.",
      });
    } finally {
      setProcessingRefund(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const LANGUAGE_NAMES: Record<string, string> = {
    fr: "French",
    de: "German",
    it: "Italian",
    es: "Spanish",
    pt: "Portuguese",
    nl: "Dutch",
    pl: "Polish",
    ru: "Russian",
    en: "English",
  };

  const handleSaveProfile = async () => {
    if (profile && targetLanguage !== profile.target_language) {
      setPendingLanguage(targetLanguage);
      setShowLanguageConfirm(true);
      return;
    }
    await saveProfileFields();
  };

  const saveProfileFields = async () => {
    setSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("target_language", targetLanguage);
    formData.append("native_language", nativeLanguage);

    const result = await updateProfile(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result.success) {
      setMessage({
        type: "success",
        text: result.message || "Profile updated!",
      });
      await loadProfile();
    }

    setSaving(false);
  };

  const handleConfirmLanguageChange = async () => {
    if (!pendingLanguage) return;
    setChangingLanguage(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/change-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newLanguage: pendingLanguage }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to change language.",
        });
        setShowLanguageConfirm(false);
        setPendingLanguage(null);
        setChangingLanguage(false);
        return;
      }

      setShowLanguageConfirm(false);
      setPendingLanguage(null);
      setChangingLanguage(false);
      await saveProfileFields();
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to change language. Please try again.",
      });
      setShowLanguageConfirm(false);
      setPendingLanguage(null);
      setChangingLanguage(false);
    }
  };

  const handleCancelLanguageChange = () => {
    if (profile) setTargetLanguage(profile.target_language);
    setPendingLanguage(null);
    setShowLanguageConfirm(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be smaller than 2MB" });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("avatar", file);

    const result = await uploadAvatar(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result.success) {
      setMessage({ type: "success", text: "Profile photo updated!" });
      await loadProfile();
    }

    setUploadingAvatar(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSignOut = async () => {
    await signout();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  /* ─── Current level index for depth gauge ─── */
  const currentLevelIndex = DEPTH_LEVEL_ORDER.indexOf(proficiencyLevel);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* ─── Atmospheric Background ─── */}
      <div className="fixed inset-0 z-0 settings-atmosphere settings-noise" />

      {/* ─── Header ─── */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="btn-surface-hover p-2 rounded-xl border border-white/[0.06] hover:border-ocean-turquoise/30 transition-all">
                <ArrowUp className="h-5 w-5 text-muted-foreground" />
              </button>
            </Link>
            <h1 className="text-3xl font-light tracking-tight">
              Profile &{" "}
              <span className="font-serif italic text-ocean-turquoise">
                Depth
              </span>
            </h1>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <div className="relative z-10 px-6 sm:px-8 pt-8 pb-28">
        <div className="max-w-[760px] mx-auto space-y-6">
          {/* Feedback Message */}
          {message && (
            <div
              className={cn(
                "p-4 rounded-xl text-sm border backdrop-blur-sm",
                message.type === "success"
                  ? "feedback-success"
                  : "feedback-error",
              )}
            >
              {message.text}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              PROFILE CARD
              ═══════════════════════════════════════════════ */}
          <div id="profile" className="settings-glass p-8">
            {/* Section Title */}
            <div className="mb-8">
              <h2 className="text-2xl font-light tracking-tight mb-1">
                Dive Profile
              </h2>
              <p className="text-sm text-muted-foreground/70 font-light font-serif italic">
                Adjust your dive profile
              </p>
            </div>

            <div className="space-y-8">
              {/* ── Avatar + Identity ── */}
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="relative w-24 h-24 rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-105"
                  >
                    {/* Iridescent orb ring */}
                    <div className="absolute -inset-[3px] rounded-full avatar-orb-gradient avatar-orb-animate opacity-80 group-hover:opacity-100 transition-opacity" />
                    {/* Inner content */}
                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-background">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-ocean-turquoise/10">
                          <UserIcon className="h-10 w-10 text-ocean-turquoise/60" />
                        </div>
                      )}
                    </div>
                    {/* Camera overlay on hover */}
                    <div className="absolute inset-0 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {uploadingAvatar ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-light tracking-tight truncate">
                    {profile?.full_name || "Anonymous User"}
                  </h3>
                  <p className="text-sm text-muted-foreground/60 font-light mt-0.5 truncate">
                    {profile?.email}
                  </p>
                  <p className="text-xs text-ocean-turquoise/70 font-light mt-2 flex items-center gap-1.5">
                    <Anchor className="h-3 w-3" />
                    Diver since{" "}
                    {new Date(profile?.created_at || "").toLocaleDateString(
                      "en-US",
                      { month: "long", year: "numeric" },
                    )}
                  </p>
                </div>
              </div>

              {/* ── Full Name Input ── */}
              <div className="space-y-2">
                <label
                  htmlFor="full_name"
                  className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70"
                >
                  Full Name
                </label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] focus-visible:border-ocean-turquoise focus-visible:shadow-[0_0_0_3px_rgba(0,200,160,0.2)] h-14 px-5 text-base"
                />
              </div>

              {/* ── Language Settings ── */}
              <div
                id="language"
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              >
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70">
                    Target Language
                  </label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger className="bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">🇫🇷 French</SelectItem>
                      <SelectItem value="de">🇩🇪 German</SelectItem>
                      <SelectItem value="it">🇮🇹 Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70">
                    Native Language
                  </label>
                  <Select
                    value={nativeLanguage}
                    onValueChange={setNativeLanguage}
                  >
                    <SelectTrigger className="bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                      <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                      <SelectItem value="fr">🇫🇷 French</SelectItem>
                      <SelectItem value="de">🇩🇪 German</SelectItem>
                      <SelectItem value="it">🇮🇹 Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Proficiency Level — Depth Gauge ── */}
              <div className="space-y-3">
                <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70">
                  Depth Level
                </label>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
                  <div className="flex gap-5">
                    {/* Vertical depth gauge */}
                    <div className="relative flex flex-col items-center py-1">
                      {/* Track */}
                      <div className="w-[3px] rounded-full bg-white/[0.06] absolute inset-y-0" />
                      {/* Level markers */}
                      {DEPTH_LEVEL_ORDER.map((lvl, i) => {
                        const isCurrent = lvl === proficiencyLevel;
                        const isPast = currentLevelIndex > i;
                        return (
                          <div
                            key={lvl}
                            className="relative z-10 flex-1 flex items-center"
                          >
                            <div
                              className={cn(
                                "rounded-full transition-all duration-500",
                                isCurrent
                                  ? "w-3.5 h-3.5 bg-ocean-turquoise depth-marker-active"
                                  : isPast
                                    ? "w-2 h-2 bg-ocean-turquoise/50"
                                    : "w-2 h-2 bg-white/[0.1]",
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Level labels */}
                    <div className="flex-1 flex flex-col">
                      {DEPTH_LEVEL_ORDER.map((lvl, i) => {
                        const isCurrent = lvl === proficiencyLevel;
                        const isPast = currentLevelIndex > i;
                        return (
                          <div
                            key={lvl}
                            className={cn(
                              "flex-1 flex items-center gap-3 px-3 rounded-lg transition-all",
                              isCurrent && "bg-ocean-turquoise/[0.06]",
                            )}
                          >
                            <span
                              className={cn(
                                "text-xs font-mono w-6",
                                isCurrent
                                  ? "text-ocean-turquoise font-medium"
                                  : isPast
                                    ? "text-ocean-turquoise/40"
                                    : "text-muted-foreground/30",
                              )}
                            >
                              {lvl}
                            </span>
                            <span
                              className={cn(
                                "text-xs",
                                isCurrent
                                  ? "text-ocean-turquoise font-serif italic"
                                  : isPast
                                    ? "text-muted-foreground/40 font-light"
                                    : "text-muted-foreground/20 font-light",
                              )}
                            >
                              {DEPTH_LABELS[lvl] || lvl}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Retake action */}
                    <div className="flex items-start pt-1">
                      <Link href="/onboarding">
                        <Button className="gap-2 bg-ocean-turquoise hover:bg-ocean-turquoise/90 text-background">
                          <RefreshCcw className="h-4 w-4" />
                          Retake Test
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/50 font-serif italic mt-4 text-center">
                    Every diver starts at the surface.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              REFUND ELIGIBILITY NOTICE
              ═══════════════════════════════════════════════ */}
          {refundEligibility?.eligible &&
            profile?.subscription_tier !== "snorkeler" &&
            profile?.subscription_tier !== "free" && (
              <div className="settings-glass p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-light text-base mb-1">
                      7-Day Money-Back Guarantee
                    </h3>
                    <p className="text-sm text-muted-foreground/70 font-light mb-3">
                      You have {refundEligibility.daysRemaining} day
                      {refundEligibility.daysRemaining !== 1 ? "s" : ""}{" "}
                      remaining to request a full refund and cancel your{" "}
                      {
                        getTierConfig(profile?.subscription_tier as TierSlug)
                          ?.displayName
                      }{" "}
                      subscription.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRequestRefund}
                      disabled={processingRefund}
                      className="border-ocean-turquoise/50 hover:bg-ocean-turquoise/10"
                    >
                      {processingRefund
                        ? "Processing..."
                        : "Request Refund & Cancel"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          {/* ═══════════════════════════════════════════════
              SUBSCRIPTION CARD
              ═══════════════════════════════════════════════ */}
          <div id="settings" className="settings-glass p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-light tracking-tight mb-1">
                Subscription
              </h2>
              <p className="text-sm text-muted-foreground/70 font-light font-serif italic">
                Your current depth tier
              </p>
            </div>
            <div className="space-y-4">
              {/* ── Current Plan — Active Glow ── */}
              <div className="tier-active-glow rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Anchor className="h-4 w-4 text-ocean-turquoise/70" />
                      <p className="font-light text-lg text-ocean-turquoise">
                        {getTierConfig(profile?.subscription_tier as TierSlug)
                          ?.displayName || profile?.subscription_tier}{" "}
                        Plan
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground/70 font-serif italic mt-1">
                      {getTierConfig(profile?.subscription_tier as TierSlug)
                        ?.description || ""}
                    </p>
                  </div>
                  {(() => {
                    const tiersAbove = getTiersAbove(
                      profile?.subscription_tier as TierSlug,
                    );
                    if (tiersAbove.length === 0) return null;
                    return (
                      <Link href="/upgrade">
                        <Button className="gap-2 bg-ocean-turquoise hover:bg-ocean-turquoise/90 text-background hover:shadow-[0_0_20px_rgba(0,200,160,0.3)] transition-shadow">
                          <Crown className="h-4 w-4" />
                          Change Plan
                        </Button>
                      </Link>
                    );
                  })()}
                </div>
              </div>

              {/* ── Upgrade Tiers — Depth Differentiation ── */}
              {(() => {
                const tiersAbove = getTiersAbove(
                  profile?.subscription_tier as TierSlug,
                );
                if (tiersAbove.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground/60 font-light font-serif italic text-center py-2">
                      You&apos;re exploring the deepest waters. Enjoy all
                      features!
                    </p>
                  );
                }

                /* Depth index for visual differentiation */
                const depthTiers: Record<string, number> = {
                  snorkeler: 0,
                  diver: 1,
                  submariner: 2,
                };

                return (
                  <div className="space-y-3">
                    {tiersAbove.map((slug) => {
                      const t = TIERS[slug];
                      const depth = depthTiers[slug] ?? 0;
                      return (
                        <div
                          key={slug}
                          className={cn(
                            "flex items-center justify-between p-5 rounded-xl border transition-all duration-300 hover:border-ocean-turquoise/30",
                            depth === 1
                              ? "bg-[rgba(13,27,42,0.5)] border-white/[0.06]"
                              : depth === 2
                                ? "bg-[rgba(1,12,16,0.6)] border-white/[0.04]"
                                : "bg-white/[0.02] border-white/[0.06]",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Tiny depth indicator */}
                            <div
                              className={cn(
                                "w-1 h-8 rounded-full",
                                depth === 1
                                  ? "bg-gradient-to-b from-ocean-turquoise/60 to-ocean-turquoise/20"
                                  : depth === 2
                                    ? "bg-gradient-to-b from-cyan-400/60 to-ocean-midnight/40"
                                    : "bg-ocean-turquoise/30",
                              )}
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {t.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground/50 font-light">
                                R{t.priceZAR}/mo or R{t.annualPriceZAR}/yr
                              </p>
                            </div>
                          </div>
                          <Link href="/upgrade">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs border-white/[0.08] hover:border-ocean-turquoise/30"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                              View plan
                            </Button>
                          </Link>
                        </div>
                      );
                    })}

                    {/* Annual plans callout */}
                    <div className="annual-callout text-center mt-3">
                      <span className="font-medium">
                        Annual plans include 2 months free.
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              ACCOUNT ACTIONS — Dive Exit
              ═══════════════════════════════════════════════ */}
          <div className="settings-glass p-8">
            <div className="space-y-6">
              {/* Sign Out — Ghost button */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl border border-white/[0.08] text-muted-foreground hover:border-ocean-turquoise/30 hover:text-foreground transition-all duration-300 font-light text-sm"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>

              {/* Spacer for visual separation */}
              <div className="border-t border-white/[0.04]" />

              {/* Delete Account — Text link, not full-width button */}
              <div className="text-center">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-destructive/60 hover:text-destructive transition-colors font-light underline underline-offset-4 decoration-destructive/20 hover:decoration-destructive/50"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          STICKY SAVE BAR
          ═══════════════════════════════════════════════ */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-30 save-bar-glass transition-all duration-500",
          isDirty
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground/70 font-light">
            You have unsaved changes
          </p>
          <Button
            onClick={handleSaveProfile}
            disabled={saving || !isDirty}
            className="bg-ocean-turquoise hover:bg-ocean-turquoise/90 text-background gap-2 hover:shadow-[0_0_20px_rgba(0,200,160,0.3)] transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          LANGUAGE CHANGE CONFIRMATION DIALOG
          ═══════════════════════════════════════════════ */}
      {showLanguageConfirm && pendingLanguage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <Card className="max-w-md w-full mx-4 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="h-5 w-5 text-ocean-turquoise" />
                  <CardTitle>Change target language?</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelLanguageChange}
                  disabled={changingLanguage}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                You&apos;re switching from{" "}
                <strong>
                  {LANGUAGE_NAMES[profile?.target_language ?? ""] ??
                    profile?.target_language}
                </strong>{" "}
                to{" "}
                <strong>
                  {LANGUAGE_NAMES[pendingLanguage] ?? pendingLanguage}
                </strong>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-ocean-turquoise/10 border border-ocean-turquoise/30 p-3 text-sm text-ocean-turquoise space-y-1">
                <p className="font-medium">Your progress is saved</p>
                <p className="font-light">
                  All your{" "}
                  {LANGUAGE_NAMES[profile?.target_language ?? ""] ??
                    profile?.target_language}{" "}
                  vocabulary and progress will remain intact. You can switch
                  back at any time without losing anything.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={handleCancelLanguageChange}
                  disabled={changingLanguage}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-ocean-turquoise hover:bg-ocean-turquoise/90 text-background"
                  onClick={handleConfirmLanguageChange}
                  disabled={changingLanguage}
                >
                  {changingLanguage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Yes, switch language"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          DELETE ACCOUNT CONFIRMATION DIALOG
          ═══════════════════════════════════════════════ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <Card className="max-w-md w-full mx-4 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle>Delete account</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Are you sure you want to delete this account? This action cannot
                be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    setDeleting(true);
                    setMessage(null);
                    try {
                      const res = await fetch("/api/auth/delete", {
                        method: "POST",
                      });

                      if (res.ok) {
                        const data = await res.json();
                        setMessage({
                          type: "success",
                          text: data?.message || "Account deleted",
                        });
                        await signout();
                        router.replace("/");
                      } else {
                        const err = await res.json().catch(() => ({}));
                        setMessage({
                          type: "error",
                          text: err?.error || "Failed to delete account",
                        });
                      }
                    } catch (error) {
                      setMessage({
                        type: "error",
                        text: "Failed to delete account. Please try again.",
                      });
                    } finally {
                      setDeleting(false);
                      setShowDeleteConfirm(false);
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete account"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
