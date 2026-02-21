import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log("[Auth Callback] URL:", request.url);
  console.log("[Auth Callback] Code present:", !!code);
  console.log("[Auth Callback] Error:", error, errorDescription);

  // Handle OAuth provider errors
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    const errorParams = new URLSearchParams({
      error: error,
      ...(errorDescription && { description: errorDescription }),
    });
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?${errorParams}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    console.log("[Auth Callback] Exchange result:", {
      user: data?.user?.email,
      error: exchangeError?.message,
    });

    if (!exchangeError && data.user) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      // Check if user needs onboarding (new user or incomplete onboarding)
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", data.user.id)
        .single();

      // If no profile or no interests, send to onboarding
      const needsOnboarding =
        !profile || !profile.interests || profile.interests.length === 0;

      // Build redirect path
      let redirectPath = next;

      // If there's a next parameter (e.g., pricing page for subscription), prioritize it
      // This allows new users to complete payment BEFORE taking placement test
      if (next !== "/dashboard") {
        // If redirecting to pricing page, redirect to checkout instead for proper session handling
        if (next.startsWith("/pricing")) {
          const url = new URL(next, origin);
          const tier = url.searchParams.get("tier") || "diver";
          const currency = url.searchParams.get("currency") || "ZAR";
          redirectPath = `/checkout?tier=${tier}&currency=${currency}`;
        } else {
          redirectPath = next;
        }
      } else if (needsOnboarding) {
        // Otherwise, if user needs onboarding and no specific redirect, go to onboarding
        redirectPath = "/onboarding";
      }

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }

    if (exchangeError) {
      console.error("Code exchange error:", exchangeError.message);
      const errorParams = new URLSearchParams({
        error: "code_exchange_failed",
        description: exchangeError.message,
      });
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?${errorParams}`,
      );
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`);
}
