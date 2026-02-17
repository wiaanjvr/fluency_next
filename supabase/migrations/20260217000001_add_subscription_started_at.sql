-- Migration: Add subscription_started_at to profiles
-- Description: Adds subscription_started_at column to track when subscription began (for 7-day refund policy)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on subscription-related fields
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_started_at ON profiles(subscription_started_at);

-- Comment on the column
COMMENT ON COLUMN profiles.subscription_started_at IS 'Timestamp when the user first subscribed to premium (used for 7-day refund policy)';
