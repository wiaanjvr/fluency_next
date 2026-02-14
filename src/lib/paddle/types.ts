/* =============================================================================
   PADDLE TYPES
   
   Type definitions for Paddle billing integration
============================================================================= */

// Subscription status types
export type PaddleSubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "paused"
  | "trialing";

// Paddle customer
export interface PaddleCustomer {
  id: string;
  email: string;
  name?: string;
  locale?: string;
  created_at: string;
  updated_at: string;
  custom_data?: Record<string, any>;
}

// Paddle subscription
export interface PaddleSubscription {
  id: string;
  status: PaddleSubscriptionStatus;
  customer_id: string;
  address_id?: string;
  business_id?: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  first_billed_at?: string;
  next_billed_at?: string;
  paused_at?: string;
  canceled_at?: string;
  current_billing_period?: {
    starts_at: string;
    ends_at: string;
  };
  billing_cycle: {
    interval: "day" | "week" | "month" | "year";
    frequency: number;
  };
  items: PaddleSubscriptionItem[];
  custom_data?: Record<string, any>;
  management_urls?: {
    update_payment_method?: string;
    cancel?: string;
  };
}

export interface PaddleSubscriptionItem {
  status: "active" | "inactive" | "trialing";
  quantity: number;
  recurring: boolean;
  created_at: string;
  updated_at: string;
  price: PaddlePrice;
}

// Paddle price
export interface PaddlePrice {
  id: string;
  product_id: string;
  name?: string;
  description?: string;
  type: "standard" | "custom";
  billing_cycle?: {
    interval: "day" | "week" | "month" | "year";
    frequency: number;
  };
  trial_period?: {
    interval: "day" | "week" | "month" | "year";
    frequency: number;
  };
  unit_price: {
    amount: string;
    currency_code: string;
  };
  status: "active" | "archived";
}

// Paddle transaction
export interface PaddleTransaction {
  id: string;
  status:
    | "draft"
    | "ready"
    | "billed"
    | "paid"
    | "completed"
    | "canceled"
    | "past_due";
  customer_id?: string;
  address_id?: string;
  business_id?: string;
  currency_code: string;
  origin: "web" | "api" | "subscription_recurring" | "subscription_update";
  subscription_id?: string;
  invoice_id?: string;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
  billed_at?: string;
  details: {
    tax_rates_used: any[];
    totals: PaddleTransactionTotals;
    line_items: PaddleLineItem[];
  };
  payments: PaddlePayment[];
  checkout?: {
    url?: string;
  };
}

export interface PaddleTransactionTotals {
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  credit: string;
  balance: string;
  grand_total: string;
  fee?: string;
  earnings?: string;
  currency_code: string;
}

export interface PaddleLineItem {
  id: string;
  price_id: string;
  quantity: number;
  proration?: {
    rate: string;
    billing_period: {
      starts_at: string;
      ends_at: string;
    };
  };
  tax_rate: string;
  unit_totals: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
  };
  totals: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
  };
  product: PaddleProduct;
  price: PaddlePrice;
}

export interface PaddleProduct {
  id: string;
  name: string;
  description?: string;
  type: "standard" | "custom";
  tax_category: string;
  image_url?: string;
  status: "active" | "archived";
}

export interface PaddlePayment {
  payment_method_id: string;
  amount: string;
  status:
    | "pending"
    | "authorized"
    | "captured"
    | "error"
    | "canceled"
    | "refunded";
  error_code?: string;
  captured_at?: string;
}

// Webhook event types
export type PaddleWebhookEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.past_due"
  | "subscription.activated"
  | "subscription.trialing"
  | "transaction.billed"
  | "transaction.canceled"
  | "transaction.completed"
  | "transaction.created"
  | "transaction.paid"
  | "transaction.past_due"
  | "transaction.payment_failed"
  | "transaction.ready"
  | "transaction.updated"
  | "customer.created"
  | "customer.updated";

// Webhook payload
export interface PaddleWebhookEvent {
  event_id: string;
  event_type: PaddleWebhookEventType;
  occurred_at: string;
  notification_id: string;
  data: PaddleSubscription | PaddleTransaction | PaddleCustomer;
}

// Checkout event data (client-side)
export interface PaddleCheckoutEventData {
  transaction_id: string;
  status: string;
  customer?: {
    id: string;
    email: string;
  };
  items: Array<{
    price_id: string;
    quantity: number;
  }>;
}

// Application-level subscription data (stored in DB)
export interface UserSubscription {
  id: string;
  user_id: string;
  paddle_customer_id?: string;
  paddle_subscription_id?: string;
  status: "free" | "trialing" | "active" | "canceled" | "past_due";
  plan: "free" | "premium";
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  created_at: string;
  updated_at: string;
}
