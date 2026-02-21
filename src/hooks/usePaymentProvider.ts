"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PaymentProvider } from "@/contexts/LocationContext";

/* =============================================================================
   usePaymentProvider HOOK

   Reads the user's payment_provider from their Supabase profile.
   Falls back to the location-derived provider if not set yet.
============================================================================= */

interface PaymentProviderState {
  paymentProvider: PaymentProvider | null;
  loading: boolean;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
}

export function usePaymentProvider(): PaymentProviderState {
  const { user, loading: authLoading } = useAuth();
  const [paymentProvider, setPaymentProvider] =
    useState<PaymentProvider | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null,
  );
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPaymentProvider(null);
      setSubscriptionStatus(null);
      setSubscriptionTier(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabase = createClient();

    async function fetchProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("payment_provider, subscription_status, subscription_tier")
        .eq("id", user!.id)
        .single();

      if (!mounted) return;

      if (error) {
        console.error("Failed to fetch payment provider:", error);
        setLoading(false);
        return;
      }

      setPaymentProvider((data?.payment_provider as PaymentProvider) || null);
      setSubscriptionStatus(data?.subscription_status || null);
      setSubscriptionTier(data?.subscription_tier || null);
      setLoading(false);
    }

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  return { paymentProvider, loading, subscriptionStatus, subscriptionTier };
}
