import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Only initialize if Redis env vars are set (avoids crash during build/CI)
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        }),
        // 20 requests per 10-second sliding window per identifier
        limiter: Ratelimit.slidingWindow(20, "10 s"),
        analytics: true,
        prefix: "ratelimit:api",
      })
    : null;

// Stricter limit for expensive LLM endpoints
const llmRatelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        }),
        // 5 LLM requests per 60-second window per user
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        analytics: true,
        prefix: "ratelimit:llm",
      })
    : null;

// Routes that trigger LLM calls and should have stricter limits
const LLM_ROUTES = [
  "/api/lesson/generate",
  "/api/lesson/evaluate",
  "/api/lesson/feedback",
  "/api/lesson-v2/generate-story",
  "/api/stories/generate",
  "/api/transcribe",
  "/api/generate",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ─── Rate limiting for API routes ──────────────────────────────────────
  if (pathname.startsWith("/api/") && ratelimit) {
    // Use a STABLE user ID as the rate-limit identifier.
    // The old approach used `sb-access-token` cookie — a rotating JWT that
    // resets the rate-limit window on every token refresh, creating burst
    // windows at rotation. Extract the user ID from the Supabase session
    // instead.
    let identifier: string =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set() {},
            remove() {},
          },
        },
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        identifier = user.id;
      }
    } catch {
      // Fall through to IP-based identifier
    }

    // Check general API rate limit
    const { success, limit, remaining, reset } =
      await ratelimit.limit(identifier);

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          message: "Please slow down. Try again shortly.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      );
    }

    // Check stricter LLM rate limit for expensive endpoints
    const isLlmRoute = LLM_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
    if (isLlmRoute && llmRatelimit) {
      const llmResult = await llmRatelimit.limit(identifier);
      if (!llmResult.success) {
        return new NextResponse(
          JSON.stringify({
            error: "LLM rate limit exceeded",
            message:
              "You've made too many generation requests. Please wait a moment.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": llmResult.limit.toString(),
              "X-RateLimit-Remaining": llmResult.remaining.toString(),
              "X-RateLimit-Reset": llmResult.reset.toString(),
              "Retry-After": Math.ceil(
                (llmResult.reset - Date.now()) / 1000,
              ).toString(),
            },
          },
        );
      }
    }
  }

  // ─── Session management (auth) ─────────────────────────────────────────
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
