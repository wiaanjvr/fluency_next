-- Add Lemon Squeezy / geolocation columns to profiles
-- This migration adds support for dual payment providers (Paystack + Lemon Squeezy)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS currency_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id TEXT UNIQUE;

-- Allow the columns in the existing RLS policies (profiles already has RLS enabled
-- with "users can update own profile" policy that covers all columns).

COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code detected via IP geolocation';
COMMENT ON COLUMN public.profiles.currency_code IS 'ISO 4217 currency code detected via IP geolocation';
COMMENT ON COLUMN public.profiles.payment_provider IS 'Payment provider: paystack (ZA) or lemonsqueezy (international)';
COMMENT ON COLUMN public.profiles.lemonsqueezy_subscription_id IS 'Lemon Squeezy subscription ID for international users';
