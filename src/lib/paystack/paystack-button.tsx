"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PaystackCheckoutOptions } from "./types";

/* =============================================================================
   PAYSTACK BUTTON COMPONENT
   
   React component for initiating Paystack checkout
============================================================================= */

interface PaystackButtonProps {
  email: string;
  amount: number;
  planCode?: string;
  currency?: string;
  metadata?: Record<string, any>;
  className?: string;
  children?: React.ReactNode;
  onSuccess?: (reference: string) => void;
  onClose?: () => void;
}

export function PaystackButton({
  email,
  amount,
  planCode,
  currency = "USD",
  metadata,
  className,
  children = "Subscribe Now",
  onSuccess,
  onClose,
}: PaystackButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Initialize payment on the server
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount,
          planCode,
          currency,
          metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to initialize payment");
      }

      const data = await response.json();

      // Redirect to Paystack checkout page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to initialize payment. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className={className}
      size="lg"
    >
      {loading ? "Initializing..." : children}
    </Button>
  );
}

/* =============================================================================
   PAYSTACK INLINE POPUP COMPONENT (Alternative)
   
   Component that uses Paystack's inline popup instead of redirect
============================================================================= */

interface PaystackPopupButtonProps extends PaystackButtonProps {
  publicKey: string;
}

export function PaystackPopupButton({
  email,
  amount,
  planCode,
  currency = "USD",
  metadata,
  className,
  children = "Subscribe Now",
  onSuccess,
  onClose,
  publicKey,
}: PaystackPopupButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (typeof window === "undefined") return;

    setLoading(true);

    try {
      // Initialize payment to get reference
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount,
          planCode,
          currency,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize payment");
      }

      const data = await response.json();

      // Use Paystack inline popup
      const handler = (window as any).PaystackPop.setup({
        key: publicKey,
        email,
        amount,
        currency,
        ref: data.reference,
        plan: planCode,
        metadata,
        callback: function (response: any) {
          // Payment completed successfully
          if (onSuccess) {
            onSuccess(response.reference);
          }

          // Verify the transaction on the server
          fetch("/api/paystack/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reference: response.reference,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                window.location.href = "/dashboard?payment=success";
              } else {
                alert("Payment verification failed");
              }
            })
            .catch((error) => {
              console.error("Verification error:", error);
              alert("Payment verification failed");
            });
        },
        onClose: function () {
          if (onClose) {
            onClose();
          }
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to initialize payment");
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className={className}
      size="lg"
    >
      {loading ? "Initializing..." : children}
    </Button>
  );
}
