"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";

/* =============================================================================
   PADDLE INTEGRATION
   
   This module provides:
   - PaddleProvider: Context provider for Paddle initialization
   - usePaddle: Hook to access Paddle instance
   - Checkout utilities
   
   Setup:
   1. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to .env.local
   2. Add NEXT_PUBLIC_PADDLE_PRICE_MONTHLY and NEXT_PUBLIC_PADDLE_PRICE_YEARLY
   3. Wrap your app with PaddleProvider
   4. Use the Paddle checkout in your components
============================================================================= */

interface PaddleContextValue {
  paddle: any | null;
  isLoaded: boolean;
  openCheckout: (priceId: string, options?: CheckoutOptions) => void;
}

interface CheckoutOptions {
  email?: string;
  customerId?: string;
  successUrl?: string;
  settings?: {
    displayMode?: "overlay" | "inline";
    theme?: "light" | "dark";
    locale?: string;
  };
}

const PaddleContext = createContext<PaddleContextValue>({
  paddle: null,
  isLoaded: false,
  openCheckout: () => {},
});

export function usePaddle() {
  return useContext(PaddleContext);
}

interface PaddleProviderProps {
  children: ReactNode;
  environment?: "sandbox" | "production";
}

export function PaddleProvider({
  children,
  environment = "sandbox",
}: PaddleProviderProps) {
  const [paddle, setPaddle] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    if (!clientToken) {
      console.warn(
        "Paddle client token not configured. Payment features will be limited.",
      );
      return;
    }

    // Load Paddle.js script
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;

    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).Paddle) {
        const Paddle = (window as any).Paddle;

        // Initialize Paddle
        Paddle.Initialize({
          token: clientToken,
          environment: environment,
          eventCallback: function (data: any) {
            handlePaddleEvent(data);
          },
        });

        setPaddle(Paddle);
        setIsLoaded(true);
      }
    };

    script.onerror = () => {
      console.error("Failed to load Paddle.js");
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]',
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [environment]);

  const handlePaddleEvent = (data: any) => {
    // Handle different Paddle events
    switch (data.name) {
      case "checkout.completed":
        console.log("Checkout completed:", data.data);
        // Handle successful checkout - update user subscription
        handleCheckoutComplete(data.data);
        break;
      case "checkout.closed":
        console.log("Checkout closed");
        break;
      case "checkout.error":
        console.error("Checkout error:", data.data);
        break;
      default:
        break;
    }
  };

  const handleCheckoutComplete = async (data: any) => {
    try {
      // Notify your backend about the successful checkout
      const response = await fetch("/api/paddle/checkout-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: data.transaction_id,
          customerId: data.customer?.id,
          email: data.customer?.email,
          status: data.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process checkout completion");
      }

      // Redirect to success page or refresh user data
      window.location.href = "/dashboard?upgrade=success";
    } catch (error) {
      console.error("Error handling checkout completion:", error);
    }
  };

  const openCheckout = (priceId: string, options?: CheckoutOptions) => {
    if (!paddle || !isLoaded) {
      console.error("Paddle not loaded yet");
      return;
    }

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: options?.email ? { email: options.email } : undefined,
      customData: options?.customerId
        ? { userId: options.customerId }
        : undefined,
      settings: {
        displayMode: options?.settings?.displayMode || "overlay",
        theme: options?.settings?.theme || "dark",
        locale: options?.settings?.locale || "en",
        successUrl: options?.successUrl,
      },
    });
  };

  return (
    <PaddleContext.Provider value={{ paddle, isLoaded, openCheckout }}>
      {children}
    </PaddleContext.Provider>
  );
}
