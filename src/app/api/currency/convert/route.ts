import { NextRequest, NextResponse } from "next/server";

/* =============================================================================
   CURRENCY CONVERSION API ROUTE
   
   GET /api/currency/convert
   
   Converts amount from one currency to another using real-time exchange rates
   Uses exchangerate-api.com (free tier: 1,500 requests/month)
============================================================================= */

// Cache exchange rates for 1 hour to avoid hitting API limits
let ratesCache: {
  rates: Record<string, number>;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();

  // Return cached rates if still valid
  if (ratesCache && now - ratesCache.timestamp < CACHE_DURATION) {
    return ratesCache.rates;
  }

  // Fetch fresh rates from API
  try {
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
    );

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }

    const data = await response.json();

    // Update cache
    ratesCache = {
      rates: data.rates,
      timestamp: now,
    };

    return data.rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);

    // Fallback to hardcoded rates if API fails
    return {
      USD: 1,
      ZAR: 18.5,
      EUR: 0.92,
      GBP: 0.79,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amount = parseFloat(searchParams.get("amount") || "0");
    const from = searchParams.get("from")?.toUpperCase() || "USD";
    const to = searchParams.get("to")?.toUpperCase() || "ZAR";

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 },
      );
    }

    // Get exchange rates
    const rates = await getExchangeRates();

    // Convert amount
    let convertedAmount = amount;

    if (from !== "USD") {
      // Convert from source currency to USD first
      convertedAmount = amount / rates[from];
    }

    if (to !== "USD") {
      // Convert from USD to target currency
      convertedAmount = convertedAmount * rates[to];
    }

    // Round to 2 decimal places
    convertedAmount = Math.round(convertedAmount * 100) / 100;

    return NextResponse.json({
      amount,
      from,
      to,
      convertedAmount,
      rate: rates[to] / (rates[from] || 1),
      rates: {
        USD: rates.USD,
        ZAR: rates.ZAR,
        EUR: rates.EUR,
        GBP: rates.GBP,
      },
    });
  } catch (error) {
    console.error("Currency conversion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to convert currency",
      },
      { status: 500 },
    );
  }
}
