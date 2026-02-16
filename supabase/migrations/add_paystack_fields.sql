-- Migration: Add Paystack fields to profiles table
-- Run this migration to add Paystack support to your existing database

-- Add Paystack customer code column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT UNIQUE;

-- Add Paystack subscription code column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT UNIQUE;

-- Add comment to document these fields
COMMENT ON COLUMN profiles.paystack_customer_code IS 'Unique customer code from Paystack for this user';
COMMENT ON COLUMN profiles.paystack_subscription_code IS 'Active subscription code from Paystack';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_paystack_customer_code ON profiles(paystack_customer_code);
CREATE INDEX IF NOT EXISTS idx_profiles_paystack_subscription_code ON profiles(paystack_subscription_code);
