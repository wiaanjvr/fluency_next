"use client";

import { useState, useEffect, useRef } from "react";
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
  ArrowLeft,
  Crown,
  Camera,
  User as UserIcon,
  ChevronRight,
  RefreshCcw,
  X,
  AlertTriangle,
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

  const [fullName, setFullName] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [nativeLanguage, setNativeLanguage] = useState("en");
  const [proficiencyLevel, setProficiencyLevel] = useState("A1");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
    checkRefundEligibility();
  }, []);

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
        // Reload profile to reflect changes
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

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("target_language", targetLanguage);
    formData.append("native_language", nativeLanguage);
    // proficiency_level is not editable - users must retake placement test

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (max 2MB)
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

    // Clear the input
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-light">Settings</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Profile Photo & Basic Info */}
          <div className="card-luxury p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-light mb-2">Profile</h2>
              <p className="text-sm text-muted-foreground font-light">
                Manage your profile information
              </p>
            </div>
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="relative w-24 h-24 rounded-full overflow-hidden bg-muted hover:opacity-80 transition-opacity group"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <UserIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                <div className="flex-1">
                  <h3 className="font-light text-xl">
                    {profile?.full_name || "Anonymous User"}
                  </h3>
                  <p className="text-sm text-muted-foreground font-light">
                    {profile?.email}
                  </p>
                  <p className="text-xs text-muted-foreground font-light mt-1">
                    Member since{" "}
                    {new Date(profile?.created_at || "").toLocaleDateString(
                      "en-US",
                      { month: "long", year: "numeric" },
                    )}
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-light">
                  Full Name
                </label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {/* Language Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-light">Target Language</label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger>
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
                  <label className="text-sm font-light">Native Language</label>
                  <Select
                    value={nativeLanguage}
                    onValueChange={setNativeLanguage}
                  >
                    <SelectTrigger>
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

              {/* Proficiency Level - Read Only */}
              <div className="space-y-3">
                <label className="text-sm font-light">Proficiency Level</label>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <div className="text-2xl font-light mb-1">
                      {proficiencyLevel}
                    </div>
                    <div className="text-sm text-muted-foreground font-light">
                      {getLevelLabel(proficiencyLevel as ProficiencyLevel)}
                    </div>
                  </div>
                  <Link href="/onboarding">
                    <Button variant="outline" size="sm" className="gap-2">
                      <RefreshCcw className="h-4 w-4" />
                      Retake Test
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground font-light">
                  Your proficiency level is determined by the placement test.
                  Retake the test to update your level.
                </p>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>

          {/* Refund Eligibility Notice */}
          {refundEligibility?.eligible &&
            profile?.subscription_tier === "premium" && (
              <div className="p-4 bg-ocean-turquoise/10 border border-ocean-turquoise/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-light text-base mb-1">
                      7-Day Money-Back Guarantee
                    </h3>
                    <p className="text-sm text-muted-foreground font-light mb-3">
                      You have {refundEligibility.daysRemaining} day
                      {refundEligibility.daysRemaining !== 1 ? "s" : ""}{" "}
                      remaining to request a full refund and cancel your Pro
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

          {/* Subscription */}
          <div className="card-luxury p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-light mb-2">Subscription</h2>
              <p className="text-sm text-muted-foreground font-light">
                Manage your plan and billing
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 bg-foreground/5 rounded-xl border border-border/50">
                <div>
                  <p className="font-light text-lg capitalize">
                    {profile?.subscription_tier} Plan
                  </p>
                  <p className="text-sm text-muted-foreground font-light mt-1">
                    {profile?.subscription_tier === "free"
                      ? "5 lessons per day"
                      : "Unlimited lessons"}
                  </p>
                </div>
                {profile?.subscription_tier === "free" && (
                  <Link href={profile ? "/checkout" : "/auth/login"}>
                    <Button className="gap-2">
                      <Crown className="h-4 w-4" />
                      Upgrade to Premium
                    </Button>
                  </Link>
                )}
              </div>
              {profile?.subscription_tier === "free" && (
                <p className="text-sm text-muted-foreground font-light">
                  Premium: Unlimited lessons, multiple languages, and AI
                  conversation feedback
                </p>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="card-luxury p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-light mb-2">Account Actions</h2>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
              <Button
                variant="outline"
                className="w-full"
                style={{ color: "#ff2222", borderColor: "rgba(255,34,34,0.3)" }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </Button>
            </div>
          </div>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <Card className="max-w-md w-full mx-4 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
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
                    Are you sure you want to delete this account? This action
                    cannot be undone.
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
      </div>
    </div>
  );
}
