/* =============================================================================
   PAYSTACK TYPES
   
   TypeScript types for Paystack integration
============================================================================= */

export interface PaystackConfig {
  publicKey: string;
  secretKey?: string;
}

export interface PaystackPlan {
  id: string;
  name: string;
  amount: number; // Amount in smallest currency unit (kobo for NGN, cents for USD)
  interval: "daily" | "weekly" | "monthly" | "yearly";
  currency: string;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    currency: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    plan?: string;
    plan_object?: {
      id: number;
      name: string;
      plan_code: string;
      interval: string;
      amount: number;
    };
    authorization?: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string;
    };
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    id?: number;
    status?: string;
    reference?: string;
    amount?: number;
    customer?: {
      id: number;
      email: string;
      customer_code: string;
    };
    subscription?: {
      status: string;
      subscription_code: string;
      email_token: string;
      amount: number;
      next_payment_date: string;
    };
    plan?: {
      id: number;
      name: string;
      plan_code: string;
      interval: string;
    };
  };
}

export interface PaystackCheckoutOptions {
  email: string;
  amount: number;
  currency?: string;
  planCode?: string;
  reference?: string;
  metadata?: Record<string, any>;
  callback?: (response: any) => void;
  onClose?: () => void;
}

export interface PaystackCustomer {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}
