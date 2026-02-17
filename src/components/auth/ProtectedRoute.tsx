"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Optional custom loading component to show while checking auth
   */
  loadingComponent?: ReactNode;
  /**
   * Optional custom redirect path (defaults to current path)
   */
  redirectTo?: string;
}

/**
 * Wrapper component that protects routes from unauthorized access
 *
 * Automatically redirects unauthenticated users to the login page
 * and prevents flash of protected content by showing a loading state
 *
 * @example
 * ```tsx
 * // In a page component (app/dashboard/page.tsx)
 * import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
 *
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedRoute>
 *       <div>Protected dashboard content</div>
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom loading component
 * import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
 * import { Spinner } from "@/components/ui/spinner";
 *
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedRoute loadingComponent={<Spinner />}>
 *       <div>Protected dashboard content</div>
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 */
export function ProtectedRoute({
  children,
  loadingComponent,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, loading } = useRequireAuth(redirectTo);

  // Show loading state while checking authentication
  if (loading) {
    return (
      loadingComponent || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      )
    );
  }

  // If not loading and no user, the useRequireAuth hook will handle the redirect
  // This return statement should rarely be reached due to the redirect
  if (!user) {
    return null;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
