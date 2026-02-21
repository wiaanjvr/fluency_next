/* =============================================================================
   PRICING UTILITY

   Converts ZAR base prices to display currencies using hardcoded approximate
   rates. Update the rates periodically or replace with live fetching later.

   The base prices (in ZAR) live in src/lib/tiers.ts — this module only
   handles display formatting.
============================================================================= */

/** Approximate exchange rates: 1 USD = X of that currency. */
const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  ZAR: 18.5,
  JPY: 149,
  CAD: 1.36,
  AUD: 1.54,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83,
  BRL: 4.97,
  MXN: 17.15,
  SGD: 1.34,
  HKD: 7.82,
};

const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  ZAR: "R",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CHF: "Fr",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  MXN: "MX$",
  SGD: "S$",
  HKD: "HK$",
};

/**
 * Convert a ZAR amount to the target currency using hardcoded rates.
 * Returns the numeric converted amount.
 */
export function convertZARToDisplay(
  zarAmount: number,
  currencyCode: string,
): number {
  if (currencyCode === "ZAR") return zarAmount;

  const zarPerUsd = USD_RATES.ZAR; // e.g. 18.5
  const targetPerUsd = USD_RATES[currencyCode] ?? 1;

  // ZAR → USD → target
  return (zarAmount / zarPerUsd) * targetPerUsd;
}

/**
 * Convert a USD amount to the target display currency using hardcoded rates.
 */
export function convertUSDToDisplay(
  usdAmount: number,
  currencyCode: string,
): number {
  if (currencyCode === "USD") return usdAmount;
  const targetPerUsd = USD_RATES[currencyCode] ?? 1;
  return usdAmount * targetPerUsd;
}

/**
 * Format a USD base price for display in the given currency.
 * Used for international (Lemon Squeezy) users.
 *
 * @example
 *   formatPriceFromUSD(15, 'USD', '/month')  // "$15/month"
 *   formatPriceFromUSD(15, 'EUR', '/month')  // "€13.80/month"
 *   formatPriceFromUSD(0,  'EUR')            // "Free"
 */
export function formatPriceFromUSD(
  usdAmount: number,
  currencyCode: string,
  period?: string,
): string {
  if (usdAmount === 0) return "Free";

  const symbol = SYMBOLS[currencyCode] || currencyCode;
  const suffix = period || "";
  const converted = convertUSDToDisplay(usdAmount, currencyCode);

  const formatted =
    currencyCode === "JPY"
      ? Math.round(converted).toString()
      : Number.isInteger(converted)
        ? converted.toString()
        : converted.toFixed(2);

  return `${symbol}${formatted}${suffix}`;
}

/**
 * Format a ZAR price for display in the given currency.
 *
 * @param zarAmount - The price in ZAR (e.g. 240)
 * @param currencyCode - Target currency code (e.g. 'USD', 'EUR', 'ZAR')
 * @param period - Optional suffix like '/month' or '/year'
 * @returns Formatted string like "$13.00/month", "R240/month", "€12.00/month"
 *
 * @example
 *   formatPrice(240, 'USD')         // "$12.97"
 *   formatPrice(240, 'ZAR', '/month') // "R240/month"
 *   formatPrice(0, 'USD')           // "Free"
 */
export function formatPrice(
  zarAmount: number,
  currencyCode: string,
  period?: string,
): string {
  if (zarAmount === 0) return "Free";

  const symbol = SYMBOLS[currencyCode] || currencyCode;
  const suffix = period || "";

  if (currencyCode === "ZAR") {
    return `${symbol}${zarAmount}${suffix}`;
  }

  const converted = convertZARToDisplay(zarAmount, currencyCode);

  // JPY has no decimals
  const formatted =
    currencyCode === "JPY"
      ? Math.round(converted).toString()
      : converted.toFixed(2);

  return `${symbol}${formatted}${suffix}`;
}

/**
 * Get the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return SYMBOLS[currencyCode] || currencyCode;
}
