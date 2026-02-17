"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string)?.trim() || null;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  // Validate password exists
  if (!password || password.length === 0) {
    return { error: "Password is required" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Return user-friendly error messages
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid email or password. Please try again." };
    }
    if (error.message.includes("Email not confirmed")) {
      return {
        error:
          "Please verify your email before signing in. Check your inbox for the verification link.",
      };
    }
    return { error: error.message };
  }

  // Check if user needs onboarding
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("interests")
      .eq("id", data.user.id)
      .single();

    const needsOnboarding =
      !profile || !profile.interests || profile.interests.length === 0;

    revalidatePath("/", "layout");

    // If there's a redirect URL (e.g., from pricing page for subscription), PRIORITIZE IT
    // Users should complete payment before onboarding
    if (redirectTo && redirectTo.startsWith("/")) {
      // If redirecting to pricing page, redirect to checkout instead for proper session handling
      if (redirectTo.startsWith("/pricing")) {
        const url = new URL(
          redirectTo,
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        );
        const billing = url.searchParams.get("billing") || "monthly";
        const currency = url.searchParams.get("currency") || "USD";
        redirect(`/checkout?billing=${billing}&currency=${currency}`);
      }
      redirect(redirectTo);
    }

    // If user needs onboarding, go there
    if (needsOnboarding) {
      redirect("/onboarding");
    }

    // Otherwise go to dashboard
    redirect("/dashboard");
  }

  revalidatePath("/", "layout");
  redirect(
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard",
  );
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("full_name") as string)?.trim() || "";
  const redirectTo = (formData.get("redirect") as string)?.trim() || null;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  // Validate password strength
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters long" };
  }

  if (password.length > 72) {
    return { error: "Password must be less than 72 characters" };
  }

  // Check for common weak passwords
  const weakPasswords = ["password", "123456", "qwerty", "abc123"];
  if (weakPasswords.includes(password.toLowerCase())) {
    return {
      error: "Password is too weak. Please choose a stronger password.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      return {
        error:
          "An account with this email already exists. Please sign in instead.",
      };
    }
    return { error: error.message };
  }

  // If user session exists, email confirmation is disabled
  if (data.session) {
    revalidatePath("/", "layout");

    // If there's a redirect URL (e.g., from pricing page for subscription), go there FIRST
    // This allows users to complete payment before taking the placement test
    if (redirectTo && redirectTo.startsWith("/")) {
      // If redirecting to pricing page, redirect to checkout instead for proper session handling
      if (redirectTo.startsWith("/pricing")) {
        const url = new URL(
          redirectTo,
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        );
        const billing = url.searchParams.get("billing") || "monthly";
        const currency = url.searchParams.get("currency") || "USD";
        redirect(`/checkout?billing=${billing}&currency=${currency}`);
      }
      redirect(redirectTo);
    }

    // Otherwise, go to onboarding normally (will redirect to dashboard after)
    redirect("/onboarding");
  }

  // Otherwise, email confirmation is required
  return {
    success: true,
    message: "Check your email to confirm your account!",
  };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Password reset email sent!" };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Password updated successfully!" };
}

export async function signInWithOAuth(
  provider: "google" | "github",
  redirectTo?: string | null,
) {
  const supabase = await createClient();

  // Build the callback URL with optional next parameter
  let callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
  if (redirectTo && redirectTo.startsWith("/")) {
    callbackUrl += `?next=${encodeURIComponent(redirectTo)}`;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const updates = {
    id: user.id,
    full_name: formData.get("full_name") as string,
    target_language: formData.get("target_language") as string,
    native_language: formData.get("native_language") as string,
    updated_at: new Date().toISOString(),
  };
  // Note: proficiency_level is not included - it can only be changed via placement test

  const { error } = await supabase.from("profiles").upsert(updates);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true, message: "Profile updated successfully!" };
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const file = formData.get("avatar") as File;
  if (!file) {
    return { error: "No file provided" };
  }

  // Delete old avatar if exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.avatar_url) {
    const oldPath = profile.avatar_url.split("/").pop();
    if (oldPath) {
      await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
    }
  }

  // Upload new avatar
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/settings");
  return { success: true, avatarUrl: publicUrl };
}
