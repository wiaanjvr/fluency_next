# Paystack Payment Integration Setup

This guide walks through setting up Paystack payments for Lingua's subscription billing.

## Overview

Lingua supports [Paystack](https://paystack.com/) as a payment gateway for subscription payments. Paystack is a popular payment processor in Africa, supporting multiple currencies and payment methods.

## Features

- Subscription billing (monthly and yearly plans)
- Secure payment processing
- Webhook integration for automatic subscription updates
- Support for multiple currencies (USD, NGN, GHS, ZAR, KES)
- Customer management
- Automatic subscription renewal

## Prerequisites

1. Create a Paystack account at [paystack.com](https://paystack.com/)
2. For development, use the Test mode
3. A domain with HTTPS for webhook callbacks (Paystack requires HTTPS)

## Setup Steps

### 1. Get Your API Keys

1. Log into your Paystack dashboard
2. Navigate to **Settings > API Keys & Webhooks**
3. Copy your **Public Key** and **Secret Key**
4. For production, use the Live mode keys
5. For development/testing, use the Test mode keys

### 2. Create Subscription Plans

Paystack requires you to create subscription plans in the dashboard before you can charge customers.

#### Monthly Plan

1. Go to **Payments > Plans** in the Paystack dashboard
2. Click **Create Plan**
3. Fill in the details:
   - **Name**: Premium Monthly
   - **Description**: Lingua Premium Monthly Subscription
   - **Amount**: 1200 (in smallest currency unit - cents for USD)
   - **Interval**: Monthly
   - **Currency**: USD (or your preferred currency)
4. Click **Create Plan**
5. Copy the **Plan Code** (format: `PLN_xxxxx`)

#### Yearly Plan

1. Create another plan with these details:
   - **Name**: Premium Yearly
   - **Description**: Lingua Premium Yearly Subscription
   - **Amount**: 9600 (96 dollars in cents)
   - **Interval**: Yearly
   - **Currency**: USD

Note the Plan Codes for both plans.

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxx

# Paystack Plan Codes
NEXT_PUBLIC_PAYSTACK_PLAN_MONTHLY=PLN_xxxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PLAN_YEARLY=PLN_xxxxxxxxxxxxx
```

**Important**:

- The `NEXT_PUBLIC_` prefix makes the variable available on the client side
- Never expose your `PAYSTACK_SECRET_KEY` on the client side
- Use Test keys for development, Live keys for production

### 4. Setup Webhooks

Webhooks allow Paystack to notify your application about payment events.

1. In Paystack dashboard, go to **Settings > API Keys & Webhooks**
2. Scroll to **Webhook URL**
3. Enter your webhook URL: `https://yourdomain.com/api/paystack/webhook`
4. Click **Save**

**For local development**:

- Use [ngrok](https://ngrok.com/) or similar to create a public URL
- Run: `ngrok http 3000`
- Use the HTTPS URL provided: `https://xxxxx.ngrok.io/api/paystack/webhook`

### 5. Update Database Schema

Run the migration to add Paystack fields to your database:

```sql
-- In Supabase SQL Editor or your database
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT UNIQUE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT UNIQUE;
```

Or run the migration file:

```bash
# If using Supabase CLI
supabase db push
```

### 6. Test the Integration

#### Test Card Numbers (Test Mode Only)

Use these test cards in Paystack's test mode:

**Successful Payment**:

- Card Number: `5060666666666666666` (Verve)
- Card Number: `4084084084084081` (Visa)
- CVV: Any 3 digits
- Expiry: Any future date
- PIN: `1234`
- OTP: `123456`

**Failed Payment**:

- Card Number: `4084080000000409`

#### Testing Flow

1. Start your development server: `npm run dev`
2. Navigate to the pricing page: `http://localhost:3000/pricing`
3. Select the Premium plan
4. Choose your currency and billing period
5. Click "Subscribe to Pro"
6. Complete the payment with a test card (you will be charged immediately)
7. Verify you're redirected to the dashboard
8. Check your database to confirm subscription was activated
9. Verify `subscription_started_at` timestamp was recorded
10. Go to Settings page and verify refund option appears (within 7 days)
11. Test refund request functionality

### 7. Webhook Event Handling

The integration handles these webhook events:

- `charge.success` - Payment completed successfully, subscription activated immediately
- `subscription.create` - New subscription created, premium access granted
- `subscription.disable` - Subscription cancelled
- `subscription.not_renew` - Subscription won't auto-renew
- `invoice.payment_failed` - Payment failed

### 8. Subscription Model & Refund Policy

**Important**: This integration uses immediate payment with a 7-day refund policy:

- **No free trial**: Users are charged immediately when subscribing
- **7-day money-back guarantee**: Users can request full refunds within 7 days
- **Automatic tracking**: `subscription_started_at` field tracks subscription start
- **Self-service refunds**: Users can request refunds via Settings page
- **Instant cancellation**: Refunds immediately downgrade user to free tier

To test refund functionality:

1. Subscribe to Pro with a test card
2. Go to Settings page
3. Click "Request Refund & Cancel" (only visible within 7 days)
4. Confirm the refund request
5. Verify subscription was cancelled and user downgraded to free

## Currency Support

Paystack supports multiple currencies. To change the default currency:

1. Update the plan amounts in `src/lib/paystack/config.ts`
2. Update the `currency` parameter in payment initialization
3. Create plans in Paystack dashboard with the desired currency

### Popular Currencies

- **USD** - US Dollars (cents: amount × 100)
- **NGN** - Nigerian Naira (kobo: amount × 100)
- **GHS** - Ghanaian Cedi (pesewas: amount × 100)
- **ZAR** - South African Rand (cents: amount × 100)
- **KES** - Kenyan Shilling (cents: amount × 100)

## Security Best Practices

1. **Always verify webhook signatures** - All webhooks are verified using HMAC SHA512
2. **Never expose secret keys** - Keep your secret key server-side only
3. **Use HTTPS in production** - Paystack requires HTTPS for webhooks
4. **Validate payment amounts** - Always verify the amount matches your plans
5. **Store customer data securely** - Follow GDPR/data protection guidelines

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct and publicly accessible
2. Verify URL uses HTTPS (required by Paystack)
3. Check Paystack dashboard > Webhook Logs for errors
4. Ensure your server is returning 200 OK response

### Payment Initialization Fails

1. Verify your secret key is correct
2. Check the amount is in the smallest currency unit (cents/kobo)
3. Ensure plan codes are correct
4. Check API error messages in developer console

### Subscription Not Updating

1. Check webhook is configured correctly
2. Verify database columns exist
3. Check application logs for errors
4. Ensure user ID is being passed in metadata

## Going Live

Before going live:

1. Switch from Test keys to Live keys
2. Update webhook URL to production domain
3. Test with real card (small amount)
4. Set up proper error monitoring
5. Configure email notifications for failed payments
6. Review Paystack security checklist

## Support

- **Paystack Documentation**: https://paystack.com/docs
- **Paystack Support**: support@paystack.com
- **API Reference**: https://paystack.com/docs/api

## Additional Features

You can extend the integration to support:

- Multiple subscription tiers
- Promo codes and discounts
- Add-ons and upgrades
- Payment method management
- Transaction history
- Automated refund processing via Paystack API
- Email notifications for refund requests

See the [Paystack API documentation](https://paystack.com/docs/api) for more details.

## Refund API Integration (Optional)

For automated refund processing, you can integrate Paystack's Refund API:

```typescript
// Example: Process refund via Paystack API
const response = await fetch(`https://api.paystack.co/refund`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transaction: transactionReference,
    amount: amountInCents, // optional, full refund if omitted
  }),
});
```

Currently, the app cancels the subscription and downgrades the user. Manual refund processing via Paystack dashboard or automated API integration can be added.
