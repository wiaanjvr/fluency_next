import { createClient } from "@supabase/supabase-js";

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
  tier: "free" | "premium";
  expiresAt: string | null;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
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
    tier: string;
    expiresAt: string | null;
    isActive: boolean;
  };
  error?: string;
}> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_expires_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching subscription:", error);
      return { success: false, error: error.message };
    }

    const now = new Date();
    const expiresAt = data.subscription_expires_at
      ? new Date(data.subscription_expires_at)
      : null;

    const isActive =
      data.subscription_tier === "premium" && expiresAt && expiresAt > now;

    return {
      success: true,
      data: {
        tier: data.subscription_tier,
        expiresAt: data.subscription_expires_at,
        isActive: !!isActive,
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
        subscription_tier: "free",
        subscription_expires_at: null,
        paystack_subscription_code: null,
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
 * Activate premium subscription (immediate payment, no trial)
 */
export async function activatePremiumSubscription(
  userId: string,
  expiresAt: Date,
  paystackCustomerCode?: string,
  paystackSubscriptionCode?: string,
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
      subscription_tier: "premium",
      subscription_expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    };

    // Only set subscription_started_at if this is a new subscription or upgrade from free
    if (
      !currentProfile ||
      currentProfile.subscription_tier === "free" ||
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

    // Must be premium subscriber
    if (data.subscription_tier !== "premium") {
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

    // Downgrade to free tier
    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "free",
        subscription_expires_at: null,
        subscription_started_at: null,
        paystack_subscription_code: null,
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
        subscription_tier: "premium",
        subscription_expires_at: expiresAt.toISOString(),
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
