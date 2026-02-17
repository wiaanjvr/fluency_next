import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Result of auth verification
 */
export interface AuthVerificationResult {
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Verify authentication for API routes
 *
 * This helper checks if the user is authenticated by validating their session token.
 * If authentication fails, it returns a 401 Unauthorized response.
 *
 * @returns Promise that resolves to { user, supabase } if authenticated,
 *          or a NextResponse with 401 status if not authenticated
 *
 * @example
 * ```typescript
 * // In an API route handler (app/api/example/route.ts)
 * import { verifyAuth } from "@/lib/auth/verify-auth";
 *
 * export async function POST(request: NextRequest) {
 *   // Verify authentication
 *   const authResult = await verifyAuth();
 *
 *   // If not authenticated, authResult is a NextResponse with 401
 *   if (authResult instanceof NextResponse) {
 *     return authResult;
 *   }
 *
 *   // User is authenticated, destructure the result
 *   const { user, supabase } = authResult;
 *
 *   // Continue with your API logic...
 *   const { data } = await supabase
 *     .from('your_table')
 *     .select('*')
 *     .eq('user_id', user.id);
 *
 *   return NextResponse.json({ data });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Alternative pattern with early return
 * export async function GET(request: NextRequest) {
 *   const auth = await verifyAuth();
 *   if (auth instanceof NextResponse) return auth;
 *
 *   const { user, supabase } = auth;
 *   // ... your logic
 * }
 * ```
 */
export async function verifyAuth(): Promise<
  AuthVerificationResult | NextResponse
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - No user session found" },
        { status: 401 },
      );
    }

    return { user, supabase };
  } catch (error) {
    console.error("Auth verification error:", error);
    return NextResponse.json(
      { error: "Internal authentication error" },
      { status: 500 },
    );
  }
}

/**
 * Check if user is authenticated without returning an error response
 *
 * Useful when you need to check auth but want custom error handling
 *
 * @returns Promise that resolves to { user, supabase } or null
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const auth = await checkAuth();
 *
 *   if (!auth) {
 *     return NextResponse.json(
 *       { error: "Custom error message" },
 *       { status: 401 }
 *     );
 *   }
 *
 *   const { user, supabase } = auth;
 *   // ... your logic
 * }
 * ```
 */
export async function checkAuth(): Promise<AuthVerificationResult | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return { user, supabase };
  } catch (error) {
    console.error("Auth check error:", error);
    return null;
  }
}
