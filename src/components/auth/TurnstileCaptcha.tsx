"use client";

import { Turnstile } from "@marsidev/react-turnstile";

interface TurnstileCaptchaProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

export function TurnstileCaptcha({
  onSuccess,
  onExpire,
  onError,
  className,
}: TurnstileCaptchaProps) {
  // Access the public env variable
  const siteKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      : undefined;

  if (!siteKey) {
    console.error(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured. Site key:",
      siteKey,
    );
    return (
      <div className={className}>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          CAPTCHA configuration missing. Please set
          NEXT_PUBLIC_TURNSTILE_SITE_KEY.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Turnstile
        siteKey={siteKey}
        onSuccess={onSuccess}
        onExpire={onExpire}
        onError={onError}
        options={{
          theme: "auto",
        }}
      />
    </div>
  );
}
