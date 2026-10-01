/** Shapes of the Phase 8 subscriptions API (papaya-hatidgo-api, docs/phase-8-subscriptions.md). */

export interface Plan {
  id: number;
  code: string;
  name: string; // already in the app's language
  user_type: 'passenger' | 'driver';
  duration_months: number;
  price: string; // "199.00": a string, so no float rounding on the way
  currency: string;
  benefits: string | null;
}

/** The COMPUTED status of one period (the server never stores active/expired). */
export type SubscriptionStatus = 'pending' | 'scheduled' | 'active' | 'past_due' | 'expired' | 'cancelled' | 'suspended';

export interface Subscription {
  id: number;
  status: SubscriptionStatus;
  plan: Plan;
  amount: string;
  starts_at: string | null;
  ends_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  payment: { status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'; method: string | null; paid_at: string | null } | null;
}

/** GET /subscriptions/current */
export interface SubscriptionSummary {
  status: 'none' | 'active' | 'past_due' | 'expired' | 'suspended';
  active_until: string | null; // renewal included
  remaining_days: number;
  current: Subscription | null;
  renewal: Subscription | null; // paid, starts when the current one ends
  pending: Subscription | null; // a checkout still waiting for its payment
  test_mode: boolean; // the SERVER's gateway is a test one (no real money)
}

export interface PaymentRecord {
  id: number;
  subscription_id: number;
  plan_name: string;
  amount: string;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
  method: string | null;
  paid_at: string | null;
  created_at: string;
}

/** How the payment page was left: the return page's deep link (success / cancelled), or closed by hand. */
export type PaymentReturn = 'success' | 'cancelled' | 'closed';
