"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

/* =============================================================================
   LOCATION CONTEXT

   Detects the user's country and currency via IP geolocation (ipapi.co).
   - Caches result in sessionStorage (one call per session)
   - Defaults to ZA / ZAR on error
   - Derives `paymentProvider`: 'paystack' for ZA, 'lemonsqueezy' otherwise
============================================================================= */

export type PaymentProvider = "paystack" | "lemonsqueezy";

export interface LocationData {
  countryCode: string;
  currencyCode: string;
  paymentProvider: PaymentProvider;
}

interface LocationContextType extends LocationData {
  loading: boolean;
}

const STORAGE_KEY = "fluensea_location";

const DEFAULT_LOCATION: LocationData = {
  countryCode: "ZA",
  currencyCode: "ZAR",
  paymentProvider: "paystack",
};

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

function deriveProvider(countryCode: string): PaymentProvider {
  return countryCode === "ZA" ? "paystack" : "lemonsqueezy";
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function detect() {
      // Check sessionStorage first
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed: LocationData = JSON.parse(cached);
          if (mounted) {
            setLocation(parsed);
            setLoading(false);
          }
          return;
        }
      } catch {
        // sessionStorage unavailable or corrupt — continue to API
      }

      // Call ipapi.co
      try {
        const res = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`ipapi ${res.status}`);
        const data = await res.json();

        const countryCode: string = data.country_code || "ZA";
        const currencyCode: string = data.currency || "ZAR";
        const result: LocationData = {
          countryCode,
          currencyCode,
          paymentProvider: deriveProvider(countryCode),
        };

        // Cache
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        } catch {
          // ignore quota errors
        }

        if (mounted) setLocation(result);
      } catch (err) {
        console.warn("Geolocation detection failed, defaulting to ZA:", err);
        if (mounted) setLocation(DEFAULT_LOCATION);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    detect();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LocationContext.Provider value={{ ...location, loading }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
