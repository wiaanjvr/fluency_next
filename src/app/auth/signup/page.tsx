"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signup, signInWithOAuth, resendConfirmationEmail } from "../actions";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  // When set, the form is replaced with the email-confirmation screen
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setMessage({ type: "error", text: "Please enter a valid email address" });
      setShowCaptcha(false);
      return;
    }

    // Password validation
    if (!password || password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      setShowCaptcha(false);
      return;
    }

    if (password.length > 72) {
      setMessage({
        type: "error",
        text: "Password must be less than 72 characters",
      });
      setShowCaptcha(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      setShowCaptcha(false);
      return;
    }

    // Check for weak passwords
    const weakPasswords = ["password", "123456", "qwerty", "abc123"];
    if (weakPasswords.includes(password.toLowerCase())) {
      setMessage({
        type: "error",
        text: "Password is too weak. Please choose a stronger password.",
      });
      setShowCaptcha(false);
      return;
    }

    // If all validations pass and we don't have a captcha token yet, show the captcha
    if (!captchaToken) {
      setShowCaptcha(true);
      return;
    }

    // Now that we have a captcha token, proceed with signup
    setLoading(true);

    // Add redirect and captcha token to formData for submission
    if (redirect) {
      formData.append("redirect", redirect);
    }
    formData.append("captcha_token", captchaToken);

    const result = await signup(formData);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      setCaptchaToken(null); // reset so user must re-verify
      setLoading(false);
    } else if (result?.success) {
      // Switch to the confirmation screen
      setConfirmedEmail(email);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!confirmedEmail) return;
    setResendLoading(true);
    setResendMessage(null);
    const result = await resendConfirmationEmail(confirmedEmail);
    if (result?.error) {
      setResendMessage({ type: "error", text: result.error });
    } else {
      setResendMessage({
        type: "success",
        text: "Email resent! Check your inbox.",
      });
    }
    setResendLoading(false);
  };

  const handleOAuthSignup = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    setMessage(null);

    const result = await signInWithOAuth(provider, redirect);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      setSocialLoading(null);
    }
  };

  // ── Email confirmation screen ─────────────────────────────────────────────
  if (confirmedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 bg-muted/50 p-8 rounded-2xl shadow-md border border-border/30 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-success" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-light tracking-tight">
              Check your email
            </h2>
            <p className="text-muted-foreground font-light text-sm">
              We sent a confirmation link to
            </p>
            <p className="font-medium text-foreground break-all">
              {confirmedEmail}
            </p>
          </div>

          <div className="bg-muted rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-light text-muted-foreground">
              1. Open the email from{" "}
              <span className="font-normal text-foreground">Fluensea</span>
            </p>
            <p className="text-sm font-light text-muted-foreground">
              2. Click the{" "}
              <span className="font-normal text-foreground">
                "Confirm your email"
              </span>{" "}
              button
            </p>
            <p className="text-sm font-light text-muted-foreground">
              3. You'll be automatically signed in and taken to the app
            </p>
          </div>

          {resendMessage && (
            <div
              className={`p-3 rounded-xl border text-sm font-light ${
                resendMessage.type === "success"
                  ? "bg-success/10 border-success/20 text-success"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              {resendMessage.text}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-light border-border/50"
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {resendLoading ? "Sending..." : "Resend confirmation email"}
          </Button>

          <p className="text-center text-sm text-muted-foreground font-light">
            Wrong email?{" "}
            <button
              onClick={() => {
                setConfirmedEmail(null);
                setMessage(null);
              }}
              className="text-foreground hover:underline font-normal"
            >
              Go back
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Sign-up form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground/90" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-foreground flex items-center justify-center">
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

        <div className="relative z-10 space-y-6">
          <h1 className="text-6xl font-light leading-tight">
            Dive into
            <br />
            <span className="font-serif italic">language mastery</span>
          </h1>
          <p className="text-xl font-light text-background/80 max-w-md">
            Join a community of learners immersing themselves in language. Flow
            with the currents of comprehension.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-sm font-light text-background/60">
            © 2026 Fluensea.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 bg-muted/50 p-6 rounded-2xl shadow-md border border-border/30">
          <div className="space-y-2">
            <h2 className="text-3xl font-light tracking-tight">
              Create account
            </h2>
            <p className="text-muted-foreground font-light">
              Start your immersive learning journey today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  message.type === "success"
                    ? "bg-success/10 border-success/20"
                    : "bg-destructive/10 border-destructive/20"
                }`}
              >
                {message.type === "success" && (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <p
                  className={`text-sm font-light ${
                    message.type === "success"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignup("google")}
                disabled={loading || socialLoading !== null}
                className="h-11 rounded-xl font-light border-border/50"
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
                onClick={() => handleOAuthSignup("github")}
                disabled={loading || socialLoading !== null}
                className="h-11 rounded-xl font-light border-border/50"
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground font-light">
                  Or continue with email
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-light">
                  Full Name{" "}
                  <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="John Doe"
                  className="h-11 rounded-xl border-border/50 font-light"
                  disabled={loading || socialLoading !== null}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-light">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-border/50 font-light"
                  required
                  disabled={loading || socialLoading !== null}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-light">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 rounded-xl border-border/50 font-light"
                  required
                  disabled={loading || socialLoading !== null}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm_password"
                  className="text-sm font-light"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 rounded-xl border-border/50 font-light"
                  required
                  disabled={loading || socialLoading !== null}
                  minLength={6}
                />
              </div>
            </div>

            {showCaptcha && (
              <div className="space-y-3">
                <p className="text-sm font-light text-muted-foreground">
                  Please verify you're human
                </p>
                <TurnstileCaptcha
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    setMessage(null);
                  }}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => {
                    setCaptchaToken(null);
                    setMessage({
                      type: "error",
                      text: "CAPTCHA verification failed. Please try again.",
                    });
                  }}
                  className="flex justify-center"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-light"
              disabled={loading || socialLoading !== null}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground font-light">
              Already have an account?{" "}
              <Link
                href={`/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
                className="text-foreground hover:underline font-normal"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpPageContent />
    </Suspense>
  );
}
