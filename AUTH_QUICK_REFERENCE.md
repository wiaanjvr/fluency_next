# 🔐 Auth Protection Quick Reference

## 🚀 For Pages

### Option 1: Wrapper Component (Easiest)

```tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <YourContent />
    </ProtectedRoute>
  );
}
```

### Option 2: Custom Hook

```tsx
"use client";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();
  if (loading) return <Loading />;
  return <div>{user.email}</div>;
}
```

## 🔌 For API Routes

```typescript
import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;

  // Your logic here
}
```

## 👤 Access User Info

```tsx
"use client";
import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
  const { user, logout } = useAuth();
  return <button onClick={logout}>Logout</button>;
}
```

## ⚙️ Add Protected Routes

Edit `src/lib/supabase/middleware.ts`:

```typescript
const protectedRoutes = [
  "/dashboard",
  "/lesson",
  "/settings",
  "/onboarding",
  "/your-new-route", // Add here
];
```

## ✅ Complete Example: Protected Page

```tsx
"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

export default function MyProtectedPage() {
  return (
    <ProtectedRoute>
      <PageContent />
    </ProtectedRoute>
  );
}

function PageContent() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Welcome {user?.email}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## ✅ Complete Example: Protected API

```typescript
import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Auth check
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;

  // Get data
  const body = await request.json();

  // Database query
  const { data, error } = await supabase
    .from("items")
    .insert({ ...body, user_id: user.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
```

---

**See [AUTH_PROTECTION_GUIDE.md](AUTH_PROTECTION_GUIDE.md) for full documentation**
