"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Loader2,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
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

  const [fullName, setFullName] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [nativeLanguage, setNativeLanguage] = useState("en");
  const [proficiencyLevel, setProficiencyLevel] = useState("A1");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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

          {/* Interests */}
          <div className="card-luxury p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-light mb-2">Learning Interests</h2>
              <p className="text-sm text-muted-foreground font-light">
                Select topics you're interested in. Content will be tailored to
                these areas.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {INTEREST_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => toggleInterest(topic)}
                    className={cn(
                      "p-4 rounded-xl border transition-all capitalize text-sm font-light",
                      "hover:border-foreground/30 hover:shadow-md",
                      selectedInterests.includes(topic)
                        ? "border-foreground/50 bg-foreground/5"
                        : "border-border/50",
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
                      ? "1 session per day"
                      : "Unlimited sessions"}
                  </p>
                </div>
                {profile?.subscription_tier === "free" && (
                  <Button className="gap-2">
                    <Crown className="h-4 w-4" />
                    Upgrade to Premium
                  </Button>
                )}
              </div>
              {profile?.subscription_tier === "free" && (
                <p className="text-sm text-muted-foreground font-light">
                  Premium: $12/month for unlimited lessons, multiple languages,
                  and AI conversation feedback
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
              <Button variant="outline" className="w-full text-destructive">
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
