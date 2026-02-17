# Authentication & Route Protection System

A complete authentication and route protection system for preventing unauthorized access to protected pages and API routes.

## 📋 Table of Contents

- [Overview](#overview)
- [Components](#components)
- [Usage Examples](#usage-examples)
  - [Protecting Pages](#protecting-pages)
  - [Protecting API Routes](#protecting-api-routes)
  - [Using Auth Context](#using-auth-context)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)

## Overview

The auth system provides multiple layers of protection:

1. **Middleware** - Server-side route protection that redirects unauthorized users
2. **AuthContext** - Client-side auth state management
3. **useRequireAuth** - React hook for protecting client components
4. **ProtectedRoute** - Wrapper component for easy page protection
5. **verifyAuth** - API route authentication helper

## Components

### 1. Middleware (`middleware.ts`)

The middleware runs on every request and:

- Checks authentication for protected routes (`/dashboard`, `/lesson`, `/settings`, `/onboarding`)
- Redirects unauthenticated users to `/auth/login` with a return URL
- Redirects authenticated users away from auth pages (`/auth/login`, `/auth/signup`) to `/dashboard`

**Configuration:** Protected and auth routes are defined in [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts#L5-L7)

### 2. AuthContext (`src/contexts/AuthContext.tsx`)

Provides global auth state across your app.

**Exports:**

- `<AuthProvider>` - Context provider (already added to root layout)
- `useAuth()` - Hook to access auth state

**Properties:**

```typescript
{
  user: User | null; // Current authenticated user
  loading: boolean; // Auth state loading
  login: (email, password) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

### 3. useRequireAuth Hook (`src/hooks/useRequireAuth.ts`)

A React hook that:

- Redirects unauthenticated users to login
- Prevents flash of protected content
- Returns `{ user, loading }`

### 4. ProtectedRoute Component (`src/components/auth/ProtectedRoute.tsx`)

A wrapper component that protects page content.

### 5. verifyAuth Helper (`src/lib/auth/verify-auth.ts`)

Protects API routes by verifying authentication.

**Functions:**

- `verifyAuth()` - Returns `{ user, supabase }` or 401 response
- `checkAuth()` - Returns `{ user, supabase }` or `null` (for custom error handling)

## Usage Examples

### Protecting Pages

#### Option 1: Using ProtectedRoute Component (Recommended)

```tsx
// app/dashboard/page.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Your protected content here</div>
    </ProtectedRoute>
  );
}
```

With custom loading component:

```tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Spinner } from "@/components/ui/spinner";

export default function DashboardPage() {
  return (
    <ProtectedRoute loadingComponent={<Spinner />}>
      <div>Your protected content here</div>
    </ProtectedRoute>
  );
}
```

#### Option 2: Using useRequireAuth Hook

```tsx
"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Protecting API Routes

#### Basic Usage

```typescript
// app/api/example/route.ts
import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth();

  // If not authenticated, return 401 response
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // User is authenticated
  const { user, supabase } = authResult;

  // Your API logic here
  const { data } = await supabase
    .from("your_table")
    .select("*")
    .eq("user_id", user.id);

  return NextResponse.json({ data });
}
```

#### Alternative Pattern (Early Return)

```typescript
export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;

  // Your logic here...
  return NextResponse.json({ userId: user.id });
}
```

#### Using checkAuth for Custom Error Handling

```typescript
import { checkAuth } from "@/lib/auth/verify-auth";

export async function DELETE(request: NextRequest) {
  const auth = await checkAuth();

  if (!auth) {
    return NextResponse.json(
      { error: "You must be logged in to delete items" },
      { status: 401 },
    );
  }

  const { user, supabase } = auth;
  // Your logic here...
}
```

### Using Auth Context

Access auth state anywhere in your client components:

```tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div>
      <span>{user.email}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Migration Guide

### Migrating Existing API Routes

**Before:**

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your logic...
}
```

**After:**

```typescript
import { verifyAuth } from "@/lib/auth/verify-auth";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;
  // Your logic...
}
```

### Migrating Existing Pages

**Before:**

```tsx
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <div>Dashboard</div>;
}
```

**After (Server Component - rely on middleware):**

```tsx
// Middleware handles the redirect automatically
export default function DashboardPage() {
  return <div>Dashboard</div>;
}
```

**After (Client Component - use ProtectedRoute):**

```tsx
"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Dashboard</div>
    </ProtectedRoute>
  );
}
```

## Best Practices

### ✅ Do's

1. **Use middleware for initial protection** - It runs first and prevents unauthorized access before page loads
2. **Use ProtectedRoute for client components** - Provides loading state and prevents content flash
3. **Use verifyAuth in API routes** - Consistent auth checking across all API endpoints
4. **Access user via useAuth hook** - For user info in client components
5. **Keep protected routes list updated** - Modify `src/lib/supabase/middleware.ts` when adding new protected pages

### ❌ Don'ts

1. **Don't rely solely on client-side protection** - Always have server-side checks (middleware + API route protection)
2. **Don't manually check auth in API routes** - Use the `verifyAuth` helper instead
3. **Don't forget loading states** - Always handle the loading state to prevent content flash
4. **Don't expose sensitive data in client components** - Fetch it server-side or via protected API routes

### Protected Routes Configuration

To add new protected routes, update [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts):

```typescript
const protectedRoutes = [
  "/dashboard",
  "/lesson",
  "/settings",
  "/onboarding",
  "/your-new-route", // Add your route here
];
```

### Handling Redirects After Login

The middleware automatically adds a `redirect` query parameter when redirecting to login:

```typescript
// In your login page:
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    router.push(redirectTo);
  };

  // Your login form...
}
```

## Testing the System

### Manual Testing Checklist

- [ ] Try accessing `/dashboard` without logging in → Should redirect to `/auth/login`
- [ ] Try accessing `/auth/login` while logged in → Should redirect to `/dashboard`
- [ ] Try calling a protected API route without auth → Should return 401
- [ ] Try manual URL typing while logged out → Should redirect to login
- [ ] Verify no flash of protected content when accessing protected pages

### Example Test Scenarios

1. **Logged Out User:**

   ```
   Visit: /dashboard
   Expected: Redirects to /auth/login?redirect=/dashboard
   ```

2. **Logged In User:**

   ```
   Visit: /auth/login
   Expected: Redirects to /dashboard
   ```

3. **Protected API Call:**
   ```bash
   curl -X POST http://localhost:3000/api/your-protected-route
   Expected: {"error":"Unauthorized - No user session found"} (401)
   ```

## Troubleshooting

### Issue: "useAuth must be used within an AuthProvider"

**Solution:** Ensure `<AuthProvider>` is wrapping your app in the root layout. ✅ Already configured in `src/app/layout.tsx`

### Issue: Infinite redirect loop

**Solution:** Check that your login/signup pages are in the `authRoutes` array in middleware and not in `protectedRoutes`.

### Issue: 401 errors on API routes when logged in

**Solution:**

1. Check browser cookies - ensure Supabase auth cookies are present
2. Verify environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Check browser console for authentication errors

## Summary

Your app now has complete route protection:

✅ **Middleware** prevents URL manipulation  
✅ **AuthContext** provides global auth state  
✅ **useRequireAuth** protects client components  
✅ **ProtectedRoute** wrapper for easy page protection  
✅ **verifyAuth** secures API routes

All layers work together to prevent unauthorized access while providing a smooth user experience.
