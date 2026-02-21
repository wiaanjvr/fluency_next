import { createClient } from "@supabase/supabase-js";
import { type TierSlug, getTierConfig } from "@/lib/tiers";

/* =============================================================================
   SUBSCRIPTION MANAGEMENT FUNCTIONS
   
   Server-side functions for managing user subscriptions with Paystack
============================================================================= */

// Initialize Supabase client with service role for admin operations
const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
};

export interface SubscriptionData {
  tier: TierSlug;
  expiresAt: string | null;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  subscriptionStatus?: "active" | "past_due" | "cancelled" | "none";
  nextPaymentDate?: string | null;
}

/**
 * Update user subscription status
 */
export async function updateUserSubscription(
  userId: string,
  subscriptionData: SubscriptionData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: subscriptionData.tier,
        subscription_expires_at: subscriptionData.expiresAt,
        paystack_customer_code: subscriptionData.paystackCustomerCode,
        paystack_subscription_code: subscriptionData.paystackSubscriptionCode,
        subscription_status: subscriptionData.subscriptionStatus || (subscriptionData.tier === "snorkeler" ? "none" : "active"),
        next_payment_date: subscriptionData.nextPaymentDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating subscription:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Subscription update error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user subscription status
 */
export async function getUserSubscription(userId: string): Promise<{
  success: boolean;
  data?: {
    tier: TierSlug;
    expiresAt: string | null;
    isActive: boolean;
    subscriptionStatus: string;
    nextPaymentDate: string | null;
  };
  error?: string;
}> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_expires_at, subscription_status, next_payment_date")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching subscription:", error);
      return { success: false, error: error.message };
    }

    const rawTier = data.subscription_tier || "snorkeler";
    const tier = getTierConfig(rawTier).slug;
    const now = new Date();
    const expiresAt = data.subscription_expires_at
      ? new Date(data.subscription_expires_at)
      : null;

    const isActive =
      tier !== "snorkeler" && expiresAt && expiresAt > now;

    return {
      success: true,
      data: {
        tier,
        expiresAt: data.subscription_expires_at,
        isActive: !!isActive,
        subscriptionStatus: data.subscription_status || "none",
        nextPaymentDate: data.next_payment_date || null,
      },
    };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cancel user subscription
 */
export async function cancelUserSubscription(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "snorkeler",
        subscription_expires_at: null,
        paystack_subscription_code: null,
        subscription_status: "cancelled",
        next_payment_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error canceling subscription:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const result = await getUserSubscription(userId);
  return result.success && result.data?.isActive === true;
}

/**
 * Activate a paid subscription (immediate payment, no trial)
 */
export async function activatePremiumSubscription(
  userId: string,
  expiresAt: Date,
  paystackCustomerCode?: string,
  paystackSubscriptionCode?: string,
  tier: TierSlug = "diver",
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceClient();

    // Get current profile to check if this is a new subscription
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_started_at")
      .eq("id", userId)
      .single();

    const now = new Date();
    const updateData: any = {
      subscription_tier: tier,
      subscription_expires_at: expiresAt.toISOString(),
      subscription_status: "active",
      next_payment_date: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    };

    // Only set subscription_started_at if this is a new subscription or upgrade from snorkeler
    const currentTier = currentProfile?.subscription_tier || "snorkeler";
    if (
      !currentProfile ||
      currentTier === "snorkeler" ||
      !currentProfile.subscription_started_at
    ) {
      updateData.subscription_started_at = now.toISOString();
    }

    // Add Paystack codes if provided
    if (paystackCustomerCode) {
      updateData.paystack_customer_code = paystackCustomerCode;
    }
    if (paystackSubscriptionCode) {
      updateData.paystack_subscription_code = paystackSubscriptionCode;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("Error activating premium subscription:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Premium subscription activation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if user is eligible for a refund (within 7 days of subscription start)
 */
export async function isEligibleForRefund(
  userId: string,
): Promise<{ eligible: boolean; daysRemaining?: number; error?: string }> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_started_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error checking refund eligibility:", error);
      return { eligible: false, error: error.message };
    }

    // Must be on a paid tier (diver or submariner)
    if (data.subscription_tier === "snorkeler" || data.subscription_tier === "free") {
      return { eligible: false };
    }

    // Must have a subscription start date
    if (!data.subscription_started_at) {
      return { eligible: false };
    }

    const startDate = new Date(data.subscription_started_at);
    const now = new Date();
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const eligible = daysSinceStart < 7;
    const daysRemaining = eligible ? 7 - daysSinceStart : 0;

    return { eligible, daysRemaining };
  } catch (error) {
    console.error("Error checking refund eligibility:", error);
    return {
      eligible: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process refund request (downgrade to free tier)
 * Note: Actual refund processing with Paystack must be done separately
 */
export async function processRefundRequest(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceClient();

    // First check eligibility
    const eligibility = await isEligibleForRefund(userId);
    if (!eligibility.eligible) {
      return {
        success: false,
        error:
          "Not eligible for refund. Refunds are only available within 7 days of subscribing.",
      };
    }

    // Downgrade to snorkeler (free) tier
    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "snorkeler",
        subscription_expires_at: null,
        subscription_started_at: null,
        paystack_subscription_code: null,
        subscription_status: "cancelled",
        next_payment_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error processing refund:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Refund processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * @deprecated Use activatePremiumSubscription instead
 * Activate trial subscription
 */
export async function activateTrialSubscription(
  userId: string,
  trialDays: number = 7,
): Promise<{ success: boolean; error?: string }> {
  console.warn(
    "activateTrialSubscription is deprecated. Use activatePremiumSubscription instead.",
  );

  try {
    const supabase = getServiceClient();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "diver",
        subscription_expires_at: expiresAt.toISOString(),
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error activating trial:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Trial activation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user by Paystack customer code
 */
export async function getUserByPaystackCode(
  customerCode: string,
): Promise<{ userId: string | null; error?: string }> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("paystack_customer_code", customerCode)
      .single();

    if (error) {
      console.error("Error fetching user by Paystack code:", error);
      return { userId: null, error: error.message };
    }

    return { userId: data?.id || null };
  } catch (error) {
    console.error("Error fetching user:", error);
    return {
      userId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
