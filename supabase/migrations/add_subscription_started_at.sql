-- Migration: Add subscription_started_at field to track when premium subscription began
-- This is used to enforce the 7-day refund policy

-- Add subscription_started_at column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN profiles.subscription_started_at IS 'Timestamp when the user first subscribed to premium (used for 7-day refund window)';

-- Create index for efficient queries on subscription start date
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_started_at 
ON profiles(subscription_started_at) 
WHERE subscription_started_at IS NOT NULL;

-- Update existing premium users to set subscription_started_at to their subscription_expires_at minus the subscription period
-- (This is a best-effort migration for existing users - they won't have the exact start date)
UPDATE profiles
SET subscription_started_at = COALESCE(
  subscription_expires_at - INTERVAL '1 month',
  updated_at
)
WHERE subscription_tier = 'premium' 
AND subscription_started_at IS NULL;
