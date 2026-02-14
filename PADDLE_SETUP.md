# Paddle Payment Integration Setup

This guide walks through setting up Paddle payments for Lingua's subscription billing.

## Overview

Lingua uses [Paddle](https://www.paddle.com/) as the Merchant of Record (MoR) for subscription payments. This means Paddle handles:

- Payment processing
- Tax calculation & collection
- Invoicing
- Subscription management

## Prerequisites

1. Create a Paddle account at [paddle.com](https://www.paddle.com/)
2. For development, use the [Sandbox environment](https://sandbox-vendors.paddle.com/)

## Setup Steps

### 1. Create Paddle Products

1. Log into Paddle Sandbox/Production dashboard
2. Navigate to **Catalog > Products**
3. Create a new product:
   - Name: "Lingua Premium"
   - Description: "Unlimited access to Lingua language learning"
   - Tax category: "Digital Services"

### 2. Create Prices

For each product, create two prices:

**Monthly Price:**

- Name: "Monthly"
- Amount: $12.00
- Currency: USD
- Billing period: Monthly
- Trial: 7 days (optional)

**Yearly Price:**

- Name: "Yearly"
- Amount: $96.00
- Currency: USD
- Billing period: Yearly
- Trial: 7 days (optional)

Note the Price IDs (format: `pri_xxxxx`).

### 3. Get API Credentials

1. Go to **Developer Tools > Authentication**
2. Generate a **Client-side Token** (used in frontend)
3. Copy your **Webhook Secret** key

### 4. Configure Webhooks

1. Navigate to **Developer Tools > Notifications**
2. Create a new webhook destination:
   - URL: `https://your-domain.com/api/paddle/webhook`
   - Events to subscribe:
     - `subscription.created`
     - `subscription.updated`
     - `subscription.canceled`
     - `subscription.paused`
     - `subscription.resumed`
     - `subscription.past_due`
     - `subscription.activated`
     - `subscription.trialing`
     - `transaction.completed`
     - `transaction.paid`

### 5. Environment Variables

Add these to your `.env.local`:

```bash
# Paddle Configuration
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your-client-token
PADDLE_WEBHOOK_SECRET=your-webhook-secret

# Paddle Price IDs
NEXT_PUBLIC_PADDLE_PRICE_MONTHLY=pri_monthly_price_id
NEXT_PUBLIC_PADDLE_PRICE_YEARLY=pri_yearly_price_id
```

### 6. Database Migration

Run the Paddle subscriptions migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually run:
# supabase/migrations/add_paddle_subscriptions.sql
```

## Testing

### Sandbox Testing

Use Paddle's test card numbers in sandbox mode:

| Card Number         | Result             |
| ------------------- | ------------------ |
| 4000 0566 5566 5556 | Success            |
| 4000 0000 0000 0002 | Declined           |
| 4000 0000 0000 3220 | 3D Secure required |

### Testing Webhooks Locally

Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3000
```

Then update your Paddle webhook URL to use the ngrok URL.

## Architecture

### Files Structure

```
src/
├── app/
│   ├── api/paddle/
│   │   ├── webhook/route.ts      # Webhook handler
│   │   └── checkout-complete/    # Client-side completion
│   └── pricing/page.tsx          # Pricing page
└── lib/paddle/
    ├── index.ts                  # Exports
    ├── paddle-provider.tsx       # React context provider
    └── types.ts                  # TypeScript definitions
```

### Flow

1. User clicks "Start Trial" on pricing page
2. `PaddleProvider` opens Paddle checkout overlay
3. User completes payment in Paddle
4. Paddle sends webhook to `/api/paddle/webhook`
5. Webhook handler updates `user_subscriptions` table
6. User's `subscription_tier` in `users` table is updated to "premium"

## Subscription Management

### Customer Portal

Paddle provides a hosted customer portal for users to:

- Update payment method
- View invoices
- Cancel subscription

Access the portal URL from the subscription object's `management_urls`.

### Handling Cancellations

When a subscription is canceled:

1. `subscription.canceled` webhook is received
2. User's status is set to "canceled"
3. Access continues until `current_period_end`
4. After period ends, downgrade to free tier

## Troubleshooting

### Webhook Not Received

1. Check webhook URL is correct in Paddle dashboard
2. Verify webhook secret matches
3. Check server logs for errors
4. Use Paddle's webhook logs to see delivery attempts

### Checkout Not Opening

1. Verify `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is set
2. Check browser console for Paddle.js errors
3. Ensure price IDs are valid

### Subscription Not Updating

1. Check webhook handler logs
2. Verify Supabase service role key is set
3. Check RLS policies on `user_subscriptions` table

## Production Checklist

- [ ] Switch from Sandbox to Production environment
- [ ] Update all environment variables for production
- [ ] Update webhook URL to production domain
- [ ] Test full flow with real payment method
- [ ] Enable Paddle fraud protection
- [ ] Configure email notifications in Paddle
