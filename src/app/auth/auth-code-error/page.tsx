"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const description = searchParams.get("description");

  const getErrorMessage = () => {
    if (error === "access_denied") {
      return "You denied access to your account. Please try again if this was unintentional.";
    }
    if (error === "no_code") {
      return "No authentication code was provided. The OAuth provider may not be configured.";
    }
    if (error === "code_exchange_failed") {
      return (
        description ||
        "Failed to exchange the authentication code for a session."
      );
    }
    if (description) {
      return description;
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <CardTitle className="text-2xl font-bold">
            Authentication Error
          </CardTitle>
        </div>
        <CardDescription>
          There was a problem verifying your authentication code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">This could happen if:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>The OAuth provider is not configured in Supabase</li>
          <li>The link has expired</li>
          <li>The link has already been used</li>
          <li>The link is invalid</li>
        </ul>
        <div className="pt-4 flex flex-col gap-2">
          <Button asChild>
            <Link href="/auth/login">Back to Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/signup">Create New Account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AuthErrorFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Suspense fallback={<AuthErrorFallback />}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
