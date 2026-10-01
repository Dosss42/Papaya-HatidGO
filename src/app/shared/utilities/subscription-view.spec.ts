import { Plan, SubscriptionSummary } from '../models/subscription.model';
import { endingSoon, monthsFree, peso, phDate, subscriptionChip } from './subscription-view';

const plan = (months: number, price: string): Plan => ({
  id: months,
  code: `drv_${months}m`,
  name: `Driver · ${months}`,
  user_type: 'driver',
  duration_months: months,
  price,
  currency: 'PHP',
  benefits: null,
});
const plans = [plan(1, '199.00'), plan(6, '995.00'), plan(12, '1990.00')];

const summary = (over: Partial<SubscriptionSummary>): SubscriptionSummary => ({
  status: 'none',
  active_until: null,
  remaining_days: 0,
  current: null,
  renewal: null,
  pending: null,
  test_mode: true,
  ...over,
});

describe('subscription-view (Phase 8)', () => {
  it('writes pesos the way the plans are priced', () => {
    expect(peso('199.00')).toBe('₱199');
    expect(peso('1990.00')).toBe('₱1,990');
    expect(peso('49.50')).toBe('₱49.50');
  });

  it('counts the free months of the longer plans against paying monthly', () => {
    expect(monthsFree(plans[0], plans)).toBe(0); // the monthly plan itself
    expect(monthsFree(plans[1], plans)).toBe(1); // 6 × 199 = 1194 vs 995
    expect(monthsFree(plans[2], plans)).toBe(2); // 12 × 199 = 2388 vs 1990
    expect(monthsFree(plan(6, '1194.00'), plans)).toBe(0); // no saving, no claim
  });

  it('shows the status as a word plus an icon, never color alone', () => {
    expect(subscriptionChip(summary({ status: 'active' }))).toEqual({ kind: 'ok', key: 'sub.chip.active', icon: 'checkmark-circle' });
    expect(subscriptionChip(summary({ status: 'expired' })).key).toBe('sub.chip.ended');
    expect(subscriptionChip(summary({ status: 'past_due' })).kind).toBe('fix');
    expect(subscriptionChip(summary({})).key).toBe('sub.chip.none');
    expect(subscriptionChip(null).key).toBe('sub.chip.none');
    const pending = { id: 3 } as SubscriptionSummary['pending'];
    expect(subscriptionChip(summary({ pending })).key).toBe('sub.chip.pending');
  });

  it('warns about the end only when active, within 3 days, and not renewed', () => {
    expect(endingSoon(summary({ status: 'active', remaining_days: 3 }))).toBe(true);
    expect(endingSoon(summary({ status: 'active', remaining_days: 4 }))).toBe(false);
    const renewal = { id: 9 } as SubscriptionSummary['renewal'];
    expect(endingSoon(summary({ status: 'active', remaining_days: 1, renewal }))).toBe(false);
    expect(endingSoon(summary({ status: 'expired', remaining_days: 0 }))).toBe(false);
  });

  it('shows dates on the Philippine calendar', () => {
    // 17:00 UTC on Oct 31 is already Nov 1 in Manila (UTC+8).
    expect(phDate('2026-10-31T17:00:00Z')).toBe('Nov 1, 2026');
  });
});
