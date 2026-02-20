/* =============================================================================
   DONATION IMPACT VERIFICATION SCRIPT
   
   Run in the Supabase SQL Editor (or via psql) to verify that stored
   bottles_intercepted and football_fields_swept are consistent with the
   amount_usd and The Ocean Cleanup's published impact rates.

   Constants (must match src/lib/impact-constants.ts):
     BOTTLES_PER_DOLLAR        = 19        ($1 → 19 bottles)
     FOOTBALL_FIELDS_PER_DOLLAR = 0.05     ($20 → 1 field)
============================================================================= */

-- ── 1. Per-donation verification ────────────────────────────────────────────
-- Shows each donation with expected vs stored impact figures and a delta.
-- A delta of 0 (or <0.01 due to float rounding) means the row is correct.

SELECT
  cd.id,
  to_char(cd.donated_at, 'YYYY-MM-DD')   AS donated_on,
  cd.period_start,
  cd.period_end,

  -- Amounts
  cd.amount_zar                          AS zar,
  cd.amount_usd                          AS usd,

  -- Stored impact
  cd.bottles_intercepted                 AS bottles_stored,
  cd.football_fields_swept               AS fields_stored,

  -- Expected impact (based on constants)
  ROUND(cd.amount_usd * 19,     2)       AS bottles_expected,
  ROUND(cd.amount_usd * 0.05,   4)       AS fields_expected,

  -- Deltas — should be 0 (or < 0.01 for rounding)
  ABS(cd.bottles_intercepted
      - ROUND(cd.amount_usd * 19, 2))    AS bottles_delta,
  ABS(cd.football_fields_swept
      - ROUND(cd.amount_usd * 0.05, 4))  AS fields_delta,

  -- Pass / fail flag
  CASE
    WHEN ABS(cd.bottles_intercepted - ROUND(cd.amount_usd * 19,   2)) < 1
     AND ABS(cd.football_fields_swept - ROUND(cd.amount_usd * 0.05, 4)) < 0.01
    THEN '✓ OK'
    ELSE '✗ MISMATCH'
  END                                    AS check_status,

  -- Receipt presence
  CASE WHEN cd.receipt_url IS NOT NULL THEN '✓' ELSE '✗ missing' END AS receipt

FROM community_donations cd
ORDER BY cd.donated_at DESC;


-- ── 2. Allocation integrity — does the sum of user_impact equal the donation? ─
-- For each donation, the sum of all users' bottles_allocated must equal
-- community_donations.bottles_intercepted (and same for fields).

SELECT
  cd.id,
  cd.period_start,
  cd.period_end,
  cd.bottles_intercepted                          AS donation_bottles,
  cd.football_fields_swept                        AS donation_fields,
  COALESCE(SUM(ui.bottles_allocated), 0)          AS sum_allocated_bottles,
  COALESCE(SUM(ui.fields_allocated),  0)          AS sum_allocated_fields,
  COUNT(ui.id)                                    AS user_count,
  cd.total_credits_redeemed                       AS credits_on_donation,
  COALESCE(SUM(ui.credits_redeemed), 0)           AS sum_user_credits,

  -- Check: allocated sum vs donation total (allow ±0.01 rounding)
  CASE
    WHEN ABS(cd.bottles_intercepted
             - COALESCE(SUM(ui.bottles_allocated), 0)) < 0.01
    THEN '✓ bottles match'
    ELSE '✗ bottles drift ' || ROUND(
           cd.bottles_intercepted - COALESCE(SUM(ui.bottles_allocated), 0), 4
         )::text
  END                                             AS bottles_check,

  -- Notifications status
  COUNT(ui.id) FILTER (WHERE ui.notified_at IS NULL)  AS pending_notifications,
  COUNT(ui.id) FILTER (WHERE ui.notified_at IS NOT NULL) AS sent_notifications

FROM community_donations cd
LEFT JOIN user_impact ui ON ui.donation_id = cd.id
GROUP BY cd.id, cd.period_start, cd.period_end,
         cd.bottles_intercepted, cd.football_fields_swept,
         cd.total_credits_redeemed
ORDER BY cd.donated_at DESC;


-- ── 3. Credit redemption totals per period ──────────────────────────────────
-- Useful for verifying total_credits_redeemed stored on the donation row
-- matches what's in credit_redemptions for that period.

SELECT
  cr.period_start,
  cr.period_end,
  COUNT(DISTINCT cr.user_id)         AS distinct_users,
  SUM(cr.credits)                    AS total_credits_in_table,
  cd.total_credits_redeemed          AS credits_on_donation,
  cd.id                              AS donation_id,
  CASE
    WHEN ABS(SUM(cr.credits) - cd.total_credits_redeemed) = 0
    THEN '✓ match'
    ELSE '✗ drift ' || (SUM(cr.credits) - cd.total_credits_redeemed)::text
  END                                AS credit_check
FROM credit_redemptions cr
LEFT JOIN community_donations cd
  ON cd.period_start = cr.period_start
 AND cd.period_end   = cr.period_end
GROUP BY cr.period_start, cr.period_end, cd.total_credits_redeemed, cd.id
ORDER BY cr.period_start DESC;


-- ── 4. Quick summary ─────────────────────────────────────────────────────────

SELECT
  COUNT(*)                                AS total_donations,
  SUM(amount_zar)                         AS total_zar,
  ROUND(SUM(amount_usd), 2)               AS total_usd,
  ROUND(SUM(bottles_intercepted))         AS total_bottles_stored,
  ROUND(SUM(amount_usd) * 19)             AS total_bottles_expected,
  ROUND(SUM(football_fields_swept), 2)    AS total_fields_stored,
  ROUND(SUM(amount_usd) * 0.05, 4)        AS total_fields_expected,
  COUNT(*) FILTER (WHERE receipt_url IS NULL) AS missing_receipts
FROM community_donations;
