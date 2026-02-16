# Paystack Integration Quick Start

This guide will get you up and running with Paystack payments in under 10 minutes.

## Quick Setup (5 Steps)

### 1. Get Your Paystack Account

1. Sign up at [paystack.com](https://paystack.com/)
2. Verify your email
3. You'll start in **Test Mode** - perfect for development

### 2. Get Your API Keys

1. Go to [Settings > API Keys & Webhooks](https://dashboard.paystack.com/#/settings/developer)
2. Copy your **Test Public Key** (starts with `pk_test_`)
3. Copy your **Test Secret Key** (starts with `sk_test_`)

### 3. Create Subscription Plans

#### Monthly Plan

1. Go to [Plans](https://dashboard.paystack.com/#/plans)
2. Click **Create Plan**
3. Fill in:
   - Name: `Premium Monthly`
   - Amount: `1200` (that's $12.00 in cents)
   - Interval: `Monthly`
   - Currency: `USD`
4. Click **Create** and copy the **Plan Code** (e.g., `PLN_abc123xyz`)

#### Yearly Plan

Repeat the above but with:

- Name: `Premium Yearly`
- Amount: `9600` (that's $96.00 in cents)
- Interval: `Yearly`

### 4. Configure Environment Variables

Add to your `.env.local`:

```env
# Paystack Keys
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_actual_key_here
PAYSTACK_SECRET_KEY=sk_test_your_actual_secret_here

# Plan Codes
NEXT_PUBLIC_PAYSTACK_PLAN_MONTHLY=PLN_your_monthly_plan_code
NEXT_PUBLIC_PAYSTACK_PLAN_YEARLY=PLN_your_yearly_plan_code
```

### 5. Run Database Migration

Execute this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT UNIQUE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT UNIQUE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;
```

## Test the Integration

### Start Your App

```bash
npm run dev
```

### Test a Payment

1. Go to `http://localhost:3000/pricing`
2. Click on Premium plan
3. Select your currency and billing period
4. Click **Subscribe to Pro**
5. Use these test card details:
   - **Card Number**: `4084084084084081`
   - **CVV**: `408`
   - **Expiry**: Any future date (e.g., `01/30`)
   - **PIN**: `1234`
   - **OTP**: `123456`
6. **Note**: You will be charged immediately (in test mode, no real money)

### Verify Success

After payment:

1. You should be redirected to `/dashboard?payment=success`
2. Check your Supabase database - `profiles` table should show:
   - `subscription_tier`: `premium`
   - `subscription_expires_at`: Date 1 month from now
   - `subscription_started_at`: Current timestamp (for 7-day refund tracking)
   - `paystack_customer_code`: Filled with customer code
3. Go to Settings page - you should see the "7-Day Money-Back Guarantee" section
4. Test refund functionality by clicking "Request Refund & Cancel"

## Setup Webhooks (Optional for Development)

Webhooks allow Paystack to notify your app about subscription events. For local development, use ngrok:

### 1. Install ngrok

```bash
# Windows (using chocolatey)
choco install ngrok

# macOS (using homebrew)
brew install ngrok
```

### 2. Start ngrok

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 3. Configure Webhook in Paystack

1. Go to [Settings > API Keys & Webhooks](https://dashboard.paystack.com/#/settings/developer)
2. In **Webhook URL**, enter: `https://abc123.ngrok.io/api/paystack/webhook`
3. Click **Save**

### 4. Test Webhook

Make a test payment - check your terminal for webhook events being received!

## Production Checklist

Before going live:

- [ ] Switch to **Live Mode** in Paystack dashboard
- [ ] Get Live API keys and update `.env.local`
- [ ] Create Live subscription plans
- [ ] Update plan codes in environment variables
- [ ] Configure webhook with production domain (HTTPS required)
- [ ] Test with a real card (small amount)
- [ ] Set up monitoring for failed webhooks

## Common Issues

### "Payment initialization failed"

- Check your secret key is correct
- Verify plan codes match your Paystack dashboard
- Ensure amount is in cents (not dollars)

### "Webhook not received"

- Verify webhook URL is publicly accessible
- Make sure URL uses HTTPS (ngrok provides this)
- Check Paystack webhook logs in dashboard

### "Subscription not updating"

- Verify database migration was run
- Check webhook is configured correctly
- Look for errors in your application logs

## Next Steps

- Read the full [PAYSTACK_SETUP.md](./PAYSTACK_SETUP.md) for detailed configuration
- Customize the checkout experience
- Add subscription management to user settings
- Set up email notifications for payment events
- Implement usage tracking and limits

## Support

Need help?

- **Paystack Docs**: https://paystack.com/docs
- **Paystack Support**: support@paystack.com
- **Test Card Numbers**: https://paystack.com/docs/payments/test-payments

---

**That's it!** You now have a fully functional subscription payment system with Paystack. 🎉
