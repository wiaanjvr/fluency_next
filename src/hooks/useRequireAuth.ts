"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Hook that redirects unauthenticated users to the login page
 * and prevents flash of protected content
 *
 * @param redirectTo - Optional custom redirect path (defaults to current path)
 * @returns { user, loading } - The authenticated user and loading state
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, loading } = useRequireAuth();
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   // User is guaranteed to be authenticated here
 *   return <div>Welcome, {user.email}</div>;
 * }
 * ```
 */
export function useRequireAuth(redirectTo?: string) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect when loading is complete and user is not authenticated
    if (!loading && !user) {
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(
        redirectTo || pathname,
      )}`;
      router.push(loginUrl);
    }
  }, [user, loading, router, pathname, redirectTo]);

  return { user, loading };
}
