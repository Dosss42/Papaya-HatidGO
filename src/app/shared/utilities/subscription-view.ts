import { MessageKey } from '../../core/i18n/messages.en';
import { ChipKind } from '../../features/driver/requirement-view';
import { Plan, SubscriptionSummary } from '../models/subscription.model';

/**
 * Turns the subscriptions API into what the screens show (Phase 8), in ONE place, so Driver
 * Home, Passenger Book, both Account pages and the Subscription page always agree.
 */

/** "₱199" or "₱1,990" (whole pesos, as the plans are priced); "₱49.50" if there are centavos. */
export function peso(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  const whole = Number.isInteger(value);
  return '₱' + value.toLocaleString('en-PH', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/**
 * How many months a longer plan gives for free, compared with paying month by month
 * (e.g. 6 months for ₱995 vs 6 × ₱199 = ₱1,194 → 1 month free). 0 when there's no saving.
 */
export function monthsFree(plan: Plan, plans: Plan[]): number {
  const monthly = plans.find((p) => p.user_type === plan.user_type && p.duration_months === 1);
  if (!monthly || plan.duration_months <= 1) return 0;
  const free = plan.duration_months - parseFloat(plan.price) / parseFloat(monthly.price);
  return free >= 0.5 ? Math.round(free) : 0;
}

export interface SubscriptionChip {
  kind: ChipKind;
  key: MessageKey;
  icon: string;
}

/** The status as a chip: a word plus an icon (color is never the only signal). */
export function subscriptionChip(summary: SubscriptionSummary | null): SubscriptionChip {
  switch (summary?.status) {
    case 'active':
      return { kind: 'ok', key: 'sub.chip.active', icon: 'checkmark-circle' };
    case 'past_due':
    case 'expired':
    case 'suspended':
      return { kind: 'fix', key: 'sub.chip.ended', icon: 'close-circle' };
    default:
      return summary?.pending
        ? { kind: 'wait', key: 'sub.chip.pending', icon: 'time-outline' }
        : { kind: 'missing', key: 'sub.chip.none', icon: 'ellipse-outline' };
  }
}

/** Show "renew soon": active, ending within 3 days, and no renewal bought yet. */
export const ENDING_SOON_DAYS = 3;
export function endingSoon(summary: SubscriptionSummary | null): boolean {
  return !!summary && summary.status === 'active' && !summary.renewal && summary.remaining_days <= ENDING_SOON_DAYS;
}

/** A timestamp as the date people see in the Philippines, e.g. "Nov 1, 2026". */
export function phDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}
