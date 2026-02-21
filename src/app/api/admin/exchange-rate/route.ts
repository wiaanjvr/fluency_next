import { NextResponse } from "next/server";

export async function GET() {
  // Prefer public NEXT_PUBLIC_EXCHANGE_RATE (usable in browser),
  // otherwise fall back to server-only ZAR_TO_USD_RATE from .env.local
  const publicRate = process.env.NEXT_PUBLIC_EXCHANGE_RATE;
  const serverRate = process.env.ZAR_TO_USD_RATE;

  const rate = parseFloat(publicRate || serverRate || "18.50");

  return NextResponse.json({ rate });
}
