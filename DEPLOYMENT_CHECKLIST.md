# Deployment Checklist: Subscription Model Change

## 🎯 Quick Start

This checklist will guide you through deploying the new subscription model (immediate payment with 7-day refund policy).

---

## 📋 Pre-Deployment Steps

### 1. Database Migration

**Run this SQL in Supabase:**

```sql
-- Add subscription_started_at field
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN profiles.subscription_started_at IS 'Timestamp when the user first subscribed to premium (used for 7-day refund window)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_started_at
ON profiles(subscription_started_at)
WHERE subscription_started_at IS NOT NULL;

-- Backfill existing premium users (optional)
UPDATE profiles
SET subscription_started_at = COALESCE(
  subscription_expires_at - INTERVAL '1 month',
  updated_at
)
WHERE subscription_tier = 'premium'
AND subscription_started_at IS NULL;
```

**Verify migration:**

```sql
-- Check that column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'subscription_started_at';

-- Should return 1 row
```

✅ **Migration file location:** `supabase/migrations/add_subscription_started_at.sql`

---

### 2. Paystack Configuration

#### Remove Trial Period from Plans (CRITICAL)

1. Log into [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to **Payments > Plans**
3. For each plan (Monthly & Yearly):
   - Click on the plan
   - Verify **Trial Period** is set to **0 days** (or not configured)
   - If trial exists, you may need to create new plans without trials

#### Verify Webhook Configuration

1. Go to **Settings > API Keys & Webhooks**
2. Verify webhook URL: `https://your-domain.com/api/paystack/webhook`
3. Ensure HTTPS is used (Paystack requirement)
4. Test webhook delivery using Paystack's test feature

---

### 3. Environment Variables

**Verify these are set (no new variables needed):**

```env
# Paystack API Keys
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx  # or pk_live_xxx for production
PAYSTACK_SECRET_KEY=sk_test_xxx              # or sk_live_xxx for production

# Plan Codes (must match Paystack plans WITHOUT trial periods)
NEXT_PUBLIC_PAYSTACK_PLAN_MONTHLY=PLN_xxx
NEXT_PUBLIC_PAYSTACK_PLAN_YEARLY=PLN_xxx

# Site URL (for callbacks and webhooks)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🧪 Testing in Staging/Development

### Test 1: New Subscription

1. ✅ Navigate to `/pricing`
2. ✅ Verify button says "Subscribe to Pro" (not "Start 7-day free trial")
3. ✅ Click button and complete payment with test card:
   - Card: `4084084084084081`
   - CVV: `408`
   - Expiry: Any future date
   - PIN: `1234`
   - OTP: `123456`
4. ✅ Verify immediate redirect to dashboard
5. ✅ Check database:
   ```sql
   SELECT
     subscription_tier,
     subscription_started_at,
     subscription_expires_at,
     paystack_subscription_code
   FROM profiles
   WHERE id = 'your-test-user-id';
   ```

   - `subscription_tier` should be `'premium'`
   - `subscription_started_at` should be NOW()
   - `subscription_expires_at` should be NOW() + 1 month
   - `paystack_subscription_code` should be populated

### Test 2: Refund Eligibility

1. ✅ Go to `/settings` as premium user
2. ✅ Verify "7-Day Money-Back Guarantee" section appears
3. ✅ Verify days remaining shows "7 days" (on day 1)
4. ✅ Test API directly:
   ```bash
   curl http://localhost:3000/api/paystack/refund -H "Cookie: your-auth-cookie"
   ```
   Should return:
   ```json
   {
     "eligible": true,
     "daysRemaining": 7
   }
   ```

### Test 3: Refund Request

1. ✅ Click "Request Refund & Cancel"
2. ✅ Confirm the action in dialog
3. ✅ Verify success message appears
4. ✅ Verify immediate downgrade to free tier
5. ✅ Verify refund section disappears
6. ✅ Check database:
   ```sql
   SELECT
     subscription_tier,
     subscription_started_at,
     subscription_expires_at,
     paystack_subscription_code
   FROM profiles
   WHERE id = 'your-test-user-id';
   ```

   - `subscription_tier` should be `'free'`
   - `subscription_started_at` should be `null`
   - `subscription_expires_at` should be `null`
   - `paystack_subscription_code` should be `null`
7. ✅ Check Paystack Dashboard:
   - Subscription should be cancelled/disabled

### Test 4: Refund Window Expiry

1. ✅ Manually set subscription started date to 8 days ago:
   ```sql
   UPDATE profiles
   SET subscription_started_at = NOW() - INTERVAL '8 days'
   WHERE id = 'your-test-user-id';
   ```
2. ✅ Reload `/settings`
3. ✅ Verify refund section does NOT appear
4. ✅ Try to request refund via API (should fail):
   ```bash
   curl -X POST http://localhost:3000/api/paystack/refund -H "Cookie: your-auth-cookie"
   ```
   Should return error about eligibility

### Test 5: Webhook Handling

1. ✅ Create test subscription via Paystack checkout
2. ✅ Verify `charge.success` webhook is received
3. ✅ Check application logs for:
   ```
   ✅ Premium subscription activated for user {userId}
   ```
4. ✅ Verify database was updated with `subscription_started_at`

---

## 🚀 Production Deployment

### Step 1: Code Deployment

1. ✅ Merge changes to main branch
2. ✅ Deploy to production environment
3. ✅ Verify build succeeded

### Step 2: Database Migration

1. ✅ Connect to production Supabase instance
2. ✅ Run migration SQL (from section 1 above)
3. ✅ Verify column exists and index created
4. ✅ Backfill existing premium users (optional)

### Step 3: Paystack Production Setup

1. ✅ Switch to **Live Mode** in Paystack dashboard
2. ✅ Get Live API keys
3. ✅ Create production plans (WITHOUT trial periods)
4. ✅ Update production environment variables with live values
5. ✅ Configure production webhook URL (must be HTTPS)
6. ✅ Test webhook delivery

### Step 4: Smoke Tests in Production

**⚠️ Use small amount for real money test:**

1. ✅ Test subscription with real card (use $1 plan if possible)
2. ✅ Verify immediate activation
3. ✅ Verify `subscription_started_at` recorded
4. ✅ Verify refund option appears in Settings
5. ✅ DO NOT test refund with real money (unless willing to lose test amount)
6. ✅ Check application logs for any errors
7. ✅ Verify webhook events are received

---

## 📊 Post-Deployment Monitoring

### Day 1-7

**Monitor these metrics:**

- [ ] Number of new Pro subscriptions
- [ ] Subscription activation success rate
- [ ] Webhook delivery success rate
- [ ] Application error rate
- [ ] Number of refund requests

**Check logs for:**

- Errors in subscription activation
- Failed webhook deliveries
- Refund request failures
- Paystack API errors

### Weekly

**Review:**

- [ ] Refund rate (refunds / subscriptions)
- [ ] Average days before refund request
- [ ] User feedback about refund process
- [ ] Failed payments and retries

---

## 🔧 Admin Processes

### Processing Refund Requests

**Manual Process (Current):**

1. Monitor application logs for refund requests:

   ```
   ⚠️ Refund requested by user {userId}
   ```

2. Go to [Paystack Dashboard](https://dashboard.paystack.com)

3. Navigate to: **Transactions**

4. Find the transaction for the user

5. Click **Refund** button

6. Confirm full refund

7. Refund will be processed within 5-7 business days

**Automated Process (Future Enhancement):**

- See `SUBSCRIPTION_REFUND_POLICY.md` for Paystack Refund API integration

### Handling Refund Disputes

1. User is automatically downgraded when refund requested
2. If user contacts support, verify:
   - Refund request was within 7-day window
   - Subscription was cancelled in Paystack
   - User was downgraded to free tier
3. Process refund manually if needed
4. Send confirmation email to user

---

## 🐛 Troubleshooting

### Issue: Refund button not appearing

**Check:**

```sql
SELECT
  id,
  email,
  subscription_tier,
  subscription_started_at,
  NOW() - subscription_started_at as age
FROM profiles
WHERE email = 'user@example.com';
```

**Solutions:**

- Ensure user is premium tier
- Verify `subscription_started_at` was recorded
- Check user is within 7-day window

### Issue: Subscription not activating

**Check:**

1. Webhook logs in Paystack dashboard
2. Application logs for webhook errors
3. Verify webhook signature verification
4. Check database permissions

**Solution:**

- Test webhook manually using Paystack dashboard
- Verify environment variables
- Check Supabase service role key

### Issue: Paystack subscription not cancelled

**Check:**

1. Paystack dashboard subscription status
2. Application logs for API errors
3. Network connectivity to Paystack API

**Solution:**

- Manually cancel in Paystack dashboard
- Verify Paystack API credentials
- Check subscription code is valid

---

## 📚 Documentation References

- **Full Implementation Guide**: `SUBSCRIPTION_REFUND_POLICY.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Paystack Setup**: `PAYSTACK_SETUP.md`
- **Quick Start**: `PAYSTACK_QUICKSTART.md`
- **Migration File**: `supabase/migrations/add_subscription_started_at.sql`

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] Database migration executed in production
- [ ] Paystack plans configured without trial periods
- [ ] Environment variables updated with production values
- [ ] Webhook URL configured and tested
- [ ] All 5 test scenarios completed in staging
- [ ] Smoke test completed in production
- [ ] Monitoring/alerts configured
- [ ] Admin refund process documented
- [ ] Team trained on new refund process
- [ ] User-facing documentation updated (if any)
- [ ] Pricing page displays correct messaging
- [ ] FAQ reflects new refund policy

---

## 🎉 Success Criteria

**Deployment is successful when:**

✅ Users can subscribe with immediate payment  
✅ Premium access is granted immediately  
✅ `subscription_started_at` is recorded for all subscriptions  
✅ Eligible users see refund option (within 7 days)  
✅ Refund requests work end-to-end  
✅ Paystack subscriptions are cancelled properly  
✅ No errors in production logs  
✅ Webhook events are handled correctly

---

**Deployment Date**: ******\_******  
**Deployed By**: ******\_******  
**Production URL**: ******\_******  
**Status**: ⬜ Pending | ⬜ In Progress | ⬜ Complete

---

## 💡 Need Help?

- Check the detailed documentation in `SUBSCRIPTION_REFUND_POLICY.md`
- Review implementation details in `IMPLEMENTATION_SUMMARY.md`
- Test using guides in `PAYSTACK_QUICKSTART.md`
- Contact Paystack support: support@paystack.com
