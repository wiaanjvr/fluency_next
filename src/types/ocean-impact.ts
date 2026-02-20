/* =============================================================================
   OCEAN IMPACT TYPES
   
   TypeScript interfaces for the community pooled donation system
   (The Ocean Cleanup).
============================================================================= */

// ── Database row types ──────────────────────────────────────────────────────

export interface CommunityDonation {
  id: string;
  donated_at: string;
  amount_zar: number;
  amount_usd: number;
  bottles_intercepted: number;
  football_fields_swept: number;
  total_credits_redeemed: number;
  receipt_url: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface UserImpact {
  id: string;
  user_id: string;
  donation_id: string;
  credits_redeemed: number;
  bottles_allocated: number;
  fields_allocated: number;
  notified_at: string | null;
  created_at: string;
}

export interface CreditRedemption {
  id: string;
  user_id: string;
  credits: number;
  period_start: string;
  period_end: string;
  redeemed_at: string;
}

// ── API request/response types ──────────────────────────────────────────────

export interface RedeemCreditsRequest {
  credits: number; // number of credits to redeem
}

export interface RedeemCreditsResponse {
  success: boolean;
  credits_remaining: number;
  message: string;
}

export interface AllocateDonationRequest {
  donation_id: string;
}

export interface AllocateDonationResponse {
  users_updated: number;
  bottles_intercepted: number;
  football_fields_swept: number;
}

export interface PersonalImpactStats {
  total_bottles: number;
  total_fields: number;
  this_month_bottles: number;
  this_month_fields: number;
}

export interface CommunityImpactStats {
  total_bottles: number;
  total_fields: number;
  this_month_bottles: number;
  this_month_fields: number;
  total_donors: number;
}

export interface ImpactMeResponse {
  personal: PersonalImpactStats;
  community: CommunityImpactStats;
}
