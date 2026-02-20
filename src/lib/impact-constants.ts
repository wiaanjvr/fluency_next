/* =============================================================================
   OCEAN IMPACT CONSTANTS
   
   All impact calculations across the codebase MUST reference this file.
   Never hardcode these numbers elsewhere.
   
   Source: The Ocean Cleanup (https://theoceancleanup.com)
   - $1 intercepts ~19 plastic bottles from rivers
   - $20 sweeps ~1 football field of ocean surface
============================================================================= */

const IMPACT = {
  /** Number of plastic bottles intercepted per USD donated */
  BOTTLES_PER_DOLLAR: 19,

  /** Number of football fields of ocean swept per USD donated */
  FOOTBALL_FIELDS_PER_DOLLAR: 0.05, // $20 = 1 football field

  /** ZAR to USD exchange rate — update periodically or pull from env */
  ZAR_TO_USD_RATE: parseFloat(process.env.ZAR_TO_USD_RATE || "16.5"),

  /** The Ocean Cleanup donation page */
  DONATION_URL: "https://theoceancleanup.com",
} as const;

export default IMPACT;
