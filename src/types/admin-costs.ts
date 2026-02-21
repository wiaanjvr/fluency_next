/* =============================================================================
   ADMIN COST DASHBOARD — Shared Types
============================================================================= */

/** A single service's usage snapshot */
export interface ServiceUsage {
  service: string;
  icon: string; // emoji
  metrics: UsageMetric[];
  error?: string;
}

export interface UsageMetric {
  label: string;
  current: number;
  limit: number | null; // null = unlimited / unknown
  unit: string; // "tokens", "commands", "MAUs", "MB", etc.
  /** Human-readable current value, e.g. "1.2M tokens" */
  currentFormatted: string;
  /** Human-readable limit, e.g. "15M tokens" */
  limitFormatted: string | null;
  /** 0–1 ratio (null when limit unknown) */
  ratio: number | null;
  /** Estimated monthly cost in USD at current burn rate */
  estimatedMonthlyCostUSD: number;
}

export interface UserStats {
  totalUsers: number;
  mau: number; // active last 30 days
  dau: number; // active today
}

export interface CostDashboardData {
  services: ServiceUsage[];
  userStats: UserStats;
  /** Total estimated monthly cost across all services in USD */
  totalMonthlyCostUSD: number;
  /** ISO timestamp */
  fetchedAt: string;
}
