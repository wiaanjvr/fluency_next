"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, signInWithOAuth } from "../actions";
import { Waves } from "lucide-react";

function LoginPageContent() {
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const plan = searchParams.get("plan");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Add redirect parameter if present
    if (redirect) {
      formData.append("redirect", redirect);
    }

    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    setError(null);

    const result = await signInWithOAuth(provider, redirect);

    if (result?.error) {
      setError(result.error);
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground/90" />
        {/* Subtle ocean glow */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-ocean-turquoise/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-ocean-teal/[0.03] rounded-full blur-[120px]" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-foreground flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110">
              <Image
                src="/logo.png"
                alt="Fluensea Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-light tracking-tight">Fluensea</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-display-lg leading-tight">
            Welcome back to
            <br />
            <span className="font-serif italic">the depths</span>
          </h1>
          <p className="text-body-lg text-background/70 max-w-md leading-[1.7]">
            Continue your immersive journey. Dive back into fluency.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-caption text-background/50">
            © 2026 Fluensea. Dive into fluency.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 bg-muted/30 backdrop-blur-lg p-8 rounded-3xl shadow-elevation-2 border border-white/[0.06]">
          <div className="space-y-3">
            <h2 className="text-heading tracking-tight">Sign in</h2>
            <p className="text-body text-muted-foreground">
              {plan === "diver" || plan === "submariner"
                ? "Sign in to continue with your subscription"
                : "Enter your credentials to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-2xl bg-destructive/8 border border-destructive/15 backdrop-blur-sm animate-shake-gentle">
                <p className="text-caption text-destructive">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthLogin("google")}
                disabled={loading || socialLoading !== null}
                className="h-12 rounded-2xl font-light border-white/[0.08] hover:border-ocean-turquoise/30 hover:bg-ocean-turquoise/5 transition-all duration-300"
              >
                {socialLoading === "google" ? (
                  "..."
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthLogin("github")}
                disabled={loading || socialLoading !== null}
                className="h-12 rounded-2xl font-light border-white/[0.08] hover:border-ocean-turquoise/30 hover:bg-ocean-turquoise/5 transition-all duration-300"
              >
                {socialLoading === "github" ? (
                  "..."
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </>
                )}
              </Button>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-muted/30 px-4 text-muted-foreground/70 text-caption">
                  Or continue with email
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2.5">
                <label htmlFor="email" className="text-caption font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-12 rounded-2xl border-white/[0.08] font-light"
                  required
                  disabled={loading || socialLoading !== null}
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-caption font-medium"
                  >
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-caption text-muted-foreground hover:text-ocean-turquoise transition-colors duration-300"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 rounded-2xl border-white/[0.08] font-light"
                  required
                  disabled={loading || socialLoading !== null}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-medium shadow-elevation-1 transition-all duration-300 hover:shadow-elevation-2"
              disabled={loading || socialLoading !== null}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-caption text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-ocean-turquoise hover:underline font-medium transition-colors duration-300"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
