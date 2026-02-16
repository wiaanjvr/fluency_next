# Subscription & Refund Policy Implementation

## Overview

Fluensea uses an **immediate payment with 7-day money-back guarantee** model for Pro subscriptions. Users are charged immediately when subscribing, but can request a full refund within 7 days if they're not satisfied.

## Key Features

### 1. Immediate Payment

- ✅ No free trial period
- ✅ Users charged immediately upon subscription
- ✅ Instant premium access after successful payment
- ✅ Reduces subscription fraud and abuse

### 2. 7-Day Money-Back Guarantee

- ✅ Full refund available within 7 days of subscription
- ✅ Self-service refund requests via Settings page
- ✅ Automatic subscription cancellation
- ✅ Immediate downgrade to free tier

### 3. Refund Eligibility Tracking

- ✅ `subscription_started_at` timestamp tracks when premium began
- ✅ Automatic calculation of days remaining for refund
- ✅ Clear UI indication of refund eligibility
- ✅ Countdown display in Settings page

## Database Schema

### New Field: `subscription_started_at`

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;
```

This field:

- Records the exact moment a user first subscribes to premium
- Used to calculate 7-day refund eligibility
- Only updated on new subscriptions or upgrades from free
- Persists through subscription renewals

### Migration

Location: `supabase/migrations/add_subscription_started_at.sql`

The migration:

1. Adds the `subscription_started_at` column
2. Creates an index for efficient queries
3. Backfills existing premium users (best-effort)

## API Endpoints

### GET /api/paystack/refund

**Purpose**: Check refund eligibility

**Response**:

```json
{
  "eligible": true,
  "daysRemaining": 5
}
```

**Authentication**: Required

### POST /api/paystack/refund

**Purpose**: Request a refund and cancel subscription

**Process**:

1. Validates user is authenticated
2. Checks refund eligibility (within 7 days)
3. Cancels Paystack subscription via API
4. Downgrades user to free tier
5. Clears subscription data
6. Returns success message

**Response**:

```json
{
  "success": true,
  "message": "Refund request processed. Your subscription has been cancelled..."
}
```

**Authentication**: Required

## Subscription Functions

### activatePremiumSubscription()

Location: `src/lib/paystack/subscription.ts`

Replaces the deprecated `activateTrialSubscription()` function.

**Features**:

- Sets `subscription_tier` to `premium`
- Sets `subscription_expires_at` based on plan interval
- Sets `subscription_started_at` for new subscriptions only
- Stores Paystack customer and subscription codes
- Used by webhook handlers for charge.success and subscription.create events

**Usage**:

```typescript
await activatePremiumSubscription(
  userId,
  expiresAt,
  paystackCustomerCode,
  paystackSubscriptionCode,
);
```

### isEligibleForRefund()

Location: `src/lib/paystack/subscription.ts`

**Features**:

- Checks if user has premium subscription
- Verifies `subscription_started_at` exists
- Calculates days since subscription started
- Returns eligibility status and days remaining

**Usage**:

```typescript
const { eligible, daysRemaining } = await isEligibleForRefund(userId);
```

### processRefundRequest()

Location: `src/lib/paystack/subscription.ts`

**Features**:

- Validates refund eligibility
- Downgrades user to free tier
- Clears subscription data
- Returns success/error status

**Note**: This function does NOT process the actual Paystack refund. That's handled by the API endpoint.

**Usage**:

```typescript
const result = await processRefundRequest(userId);
```

## User Interface

### Pricing Page

Location: `src/app/pricing/page.tsx`

**Changes**:

- ✅ "Start 7-day free trial" → "Subscribe to Pro"
- ✅ Updated messaging to reflect immediate payment
- ✅ Added "7-day money-back guarantee" badge
- ✅ Updated FAQ section with refund policy
- ✅ Removed trial-related questions

### Settings Page

Location: `src/app/settings/page.tsx`

**New Features**:

- **Refund eligibility check**: Loads on page mount
- **Conditional display**: Only shows refund option if eligible
- **Days remaining counter**: Shows countdown (e.g., "5 days remaining")
- **One-click refund**: Button to request refund with confirmation dialog
- **Real-time updates**: Reloads profile after refund request

**UI Components**:

```tsx
{
  refundEligibility?.eligible && (
    <div className="refund-notice">
      <h3>7-Day Money-Back Guarantee</h3>
      <p>You have {daysRemaining} days remaining...</p>
      <Button onClick={handleRequestRefund}>Request Refund & Cancel</Button>
    </div>
  );
}
```

## Webhook Integration

### charge.success Event

**Old Behavior**: Updated subscription directly in webhook handler
**New Behavior**: Calls `activatePremiumSubscription()` function

**Benefits**:

- Consistent subscription activation logic
- Proper `subscription_started_at` tracking
- Better error handling and logging

### subscription.create Event

**Old Behavior**: Updated subscription with raw SQL
**New Behavior**: Calls `activatePremiumSubscription()` function

**Benefits**:

- Centralized subscription logic
- Proper new subscription detection
- Consistent timestamp tracking

## Paystack Integration

### Subscription Cancellation

When a refund is requested:

1. **App Side**: Calls `POST /api/paystack/refund`
2. **Paystack API**: Calls `/subscription/disable` endpoint
3. **Webhook**: Receives `subscription.disable` event (optional)
4. **Result**: Subscription cancelled in Paystack dashboard

### Refund Processing

**Current Implementation**: Manual

- Admin must process refund in Paystack dashboard
- Subscription is automatically cancelled
- User is immediately downgraded

**Future Enhancement**: Automated

- Integrate Paystack Refund API
- Automatic refund processing
- Email notifications to user and admin

### Paystack Refund API (Optional)

```typescript
// Future implementation
const refundResponse = await fetch("https://api.paystack.co/refund", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transaction: transactionReference,
    // amount: optional, full refund if omitted
  }),
});
```

## Testing Guide

### Test Subscription Flow

1. **Start development server**

   ```bash
   npm run dev
   ```

2. **Navigate to pricing**
   - Go to `http://localhost:3000/pricing`

3. **Subscribe to Pro**
   - Click "Subscribe to Pro"
   - Use test card: `4084084084084081`
   - Complete payment

4. **Verify activation**
   - Check dashboard for premium features
   - Verify database: `subscription_tier = 'premium'`
   - Verify database: `subscription_started_at` is set

### Test Refund Flow

1. **Go to Settings**
   - Navigate to `http://localhost:3000/settings`

2. **Verify refund option**
   - Should see "7-Day Money-Back Guarantee" section
   - Should show days remaining

3. **Request refund**
   - Click "Request Refund & Cancel"
   - Confirm the action

4. **Verify downgrade**
   - Should see success message
   - Should be downgraded to free tier
   - Refund option should disappear

5. **Verify database**
   - `subscription_tier` = `'free'`
   - `subscription_expires_at` = `null`
   - `subscription_started_at` = `null`
   - `paystack_subscription_code` = `null`

### Test Eligibility Expiry

1. **Manually update database**

   ```sql
   UPDATE profiles
   SET subscription_started_at = NOW() - INTERVAL '8 days'
   WHERE id = 'user-id-here';
   ```

2. **Reload Settings page**
   - Refund option should NOT appear
   - User is past 7-day window

3. **Test API directly**
   ```bash
   curl http://localhost:3000/api/paystack/refund
   ```

   - Should return `eligible: false`

## Best Practices

### For Developers

1. **Always use `activatePremiumSubscription()`** for subscription activation
2. **Never manually set `subscription_started_at`** - let the function handle it
3. **Check refund eligibility** before showing refund UI
4. **Log all refund requests** for audit trail
5. **Send email notifications** for refund confirmations

### For Administrators

1. **Monitor refund requests** in application logs
2. **Process Paystack refunds** within 1-2 business days
3. **Review refund patterns** for potential issues
4. **Follow up with users** who request refunds (optional)
5. **Track refund rate** as a business metric

## Security Considerations

### Authentication

- All refund endpoints require authentication
- User can only request refund for their own subscription
- No admin override without proper authorization

### Validation

- Server-side eligibility check (not client-side only)
- Verify subscription ownership
- Check 7-day window on server
- Prevent duplicate refund requests

### Rate Limiting

Consider adding rate limiting to refund endpoint:

```typescript
// Prevent abuse
const refundAttempts = await getRefundAttempts(userId);
if (refundAttempts > 3) {
  return { error: "Too many refund requests" };
}
```

## Monitoring & Analytics

### Key Metrics to Track

1. **Refund Rate**: `(refunds / subscriptions) * 100`
2. **Average Days Before Refund**: When do users typically request refunds?
3. **Refund Reasons**: Add optional feedback collection
4. **Conversion After Refund**: Do users re-subscribe later?

### Logging

The system logs:

- Subscription activations
- Refund eligibility checks
- Refund requests
- Paystack cancellations
- Database updates

Example log entries:

```
✅ Premium subscription activated for user abc123
ℹ️ Refund eligibility check: eligible=true, days=5
⚠️ Refund requested by user abc123
✅ Paystack subscription cancelled: SUB_xyz789
✅ User abc123 downgraded to free tier
```

## Future Enhancements

1. **Email Notifications**
   - Send confirmation email after subscription
   - Remind users about 7-day refund window (day 5 or 6)
   - Confirm refund processing

2. **Refund Feedback**
   - Ask users why they're requesting a refund
   - Use feedback to improve product
   - Track common refund reasons

3. **Partial Refunds**
   - Pro-rated refunds based on usage
   - Different refund windows for annual plans
   - Credit system instead of refunds

4. **Win-back Campaigns**
   - Special offers for users who refunded
   - Re-engagement emails
   - Surveys to understand churn

5. **Analytics Dashboard**
   - Real-time refund rate
   - Refund trends over time
   - User cohort analysis

## Troubleshooting

### Issue: Refund option not appearing

**Possible causes**:

- User is not premium subscriber
- More than 7 days since subscription
- `subscription_started_at` is null

**Solution**:

```sql
-- Check user subscription data
SELECT
  subscription_tier,
  subscription_started_at,
  subscription_expires_at,
  NOW() - subscription_started_at as time_since_start
FROM profiles
WHERE id = 'user-id';
```

### Issue: Refund request fails

**Possible causes**:

- Paystack API error
- Database update failed
- Authentication issue

**Solution**:

1. Check application logs
2. Verify Paystack API credentials
3. Test Paystack API directly
4. Check database permissions

### Issue: Subscription not cancelled in Paystack

**Possible causes**:

- Invalid subscription code
- Paystack API timeout
- Network error

**Solution**:

1. Manual cancellation in Paystack dashboard
2. Verify subscription code in database
3. Retry cancellation API call
4. Contact Paystack support if persistent

## Support Resources

- **Paystack Refunds API**: https://paystack.com/docs/api/#refund
- **Paystack Subscriptions**: https://paystack.com/docs/payments/subscriptions
- **Paystack Support**: support@paystack.com

---

**Implementation Date**: February 2026  
**Status**: ✅ Complete and tested  
**Last Updated**: February 16, 2026
