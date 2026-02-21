"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";

/* =============================================================================
   useProfileLocation HOOK

   On first sign-in, stamps the user's profile with:
     - country_code
     - currency_code
     - payment_provider  ('paystack' for ZA, 'lemonsqueezy' otherwise)

   Only runs once per session and only writes if the fields are not already set.
============================================================================= */

export function useProfileLocation() {
  const { user, loading: authLoading } = useAuth();
  const {
    countryCode,
    currencyCode,
    paymentProvider,
    loading: geoLoading,
  } = useLocation();
  const didUpdate = useRef(false);

  useEffect(() => {
    // Wait until both auth and geo are ready
    if (authLoading || geoLoading || !user || didUpdate.current) return;

    didUpdate.current = true;
    const supabase = createClient();

    async function stampProfile() {
      // Check if already stamped
      const { data: profile } = await supabase
        .from("profiles")
        .select("payment_provider")
        .eq("id", user!.id)
        .single();

      if (profile?.payment_provider) {
        // Already set — do nothing
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          country_code: countryCode,
          currency_code: currencyCode,
          payment_provider: paymentProvider,
        })
        .eq("id", user!.id);

      if (error) {
        console.error("Failed to stamp profile with location:", error);
      }
    }

    stampProfile();
  }, [
    user,
    authLoading,
    geoLoading,
    countryCode,
    currencyCode,
    paymentProvider,
  ]);
}
