-- Migration: Add user subscriptions table for Paddle billing
-- This table stores the Paddle subscription details for each user.

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Paddle identifiers
    paddle_customer_id TEXT,
    paddle_subscription_id TEXT UNIQUE,
    
    -- Subscription status
    -- 'free' - no active subscription
    -- 'trialing' - in trial period
    -- 'active' - active paid subscription
    -- 'canceled' - subscription canceled
    -- 'past_due' - payment failed
    status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'trialing', 'active', 'canceled', 'past_due')),
    
    -- Plan type
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
    
    -- Billing period
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one subscription per user
    UNIQUE(user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paddle_customer_id ON public.user_subscriptions(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paddle_subscription_id ON public.user_subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscription
CREATE POLICY "Users can read own subscription"
    ON public.user_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions"
    ON public.user_subscriptions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update the updated_at column
DROP TRIGGER IF EXISTS trigger_update_user_subscription_updated_at ON public.user_subscriptions;
CREATE TRIGGER trigger_update_user_subscription_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subscription_updated_at();

-- Comment on table
COMMENT ON TABLE public.user_subscriptions IS 'Stores Paddle subscription information for each user';
