import { MessageKey } from '../../core/i18n/messages.en';
import { Checklist, RequirementState, Vehicle } from '../../shared/models/driver.model';

/** How a chip looks: always a WORD plus an icon (never color alone, DESIGN.md). */
export type ChipKind = 'ok' | 'wait' | 'fix' | 'warn' | 'missing' | 'locked';

/** Everything a screen needs to show one requirement (brief § 4.1). */
export interface RequirementView {
  kind: ChipKind;
  chipKey: MessageKey;
  icon: string;
  detailKey: MessageKey;
  detailParams: Record<string, string | number>;
  /** The admin's reason (first line), shown instead of the detail key when there is one. */
  reason: string | null;
  /** List order: needs action first (brief § 4.1). */
  rank: number;
}

/** "Mag-e-expire" from this many days before the expiry date (brief § 5: reminders at 30 and 7). */
export const EXPIRING_WITHIN_DAYS = 30;

/**
 * The chip, detail line and list position of one requirement. `formatDate` turns an ISO date or
 * timestamp into what the screen shows ("Oct 1, 2026").
 */
export function requirementView(state: RequirementState, formatDate: (iso: string) => string): RequirementView {
  const doc = state.document;
  const date = (iso: string | null | undefined) => (iso ? formatDate(iso) : '');

  if (state.locked) {
    return view('locked', 'req.chip.locked', 'lock-closed-outline', 'req.detail.locked', {}, null, 3);
  }
  switch (state.status) {
    case 'rejected':
    case 'resubmission_required': {
      // Both mean the same to the driver: read the reason, fix it, upload again (brief § 4.1).
      const reason = doc?.reason?.split('\n')[0]?.trim() || null;
      return view('fix', 'req.chip.fix', 'close-circle', 'req.detail.fixFallback', {}, reason, 0);
    }
    case 'expired':
      return view('fix', 'req.chip.expired', 'alert-circle', 'req.detail.expired', {}, null, 1);
    case 'missing':
      return view('missing', 'req.chip.missing', 'ellipse-outline', 'req.detail.missing', {}, null, 2);
    case 'pending':
      return view('wait', 'req.chip.pending', 'time-outline', 'req.detail.pending', { date: date(doc?.submitted_at) }, null, 5);
    case 'approved': {
      const days = doc?.days_until_expiry;
      if (state.renewal) {
        return view('wait', 'req.chip.approved', 'checkmark-circle', 'req.detail.renewal', {}, null, 5);
      }
      if (days !== null && days !== undefined && days <= EXPIRING_WITHIN_DAYS) {
        return view('warn', 'req.chip.expiring', 'alert-circle', 'req.detail.expiring', { n: Math.max(days, 0) }, null, 4);
      }
      return doc?.expires_at
        ? view('ok', 'req.chip.approved', 'checkmark-circle', 'req.detail.approved', { date: date(doc.expires_at) }, null, 6)
        : view('ok', 'req.chip.approved', 'checkmark-circle', 'req.detail.approvedPlain', {}, null, 6);
    }
  }
}

/** The checklist rows in the brief's order: a to-do list, needs-action first. */
export function sortForList(states: RequirementState[], formatDate: (iso: string) => string) {
  return states
    .map((state, index) => ({ state, view: requirementView(state, formatDate), index }))
    .sort((a, b) => a.view.rank - b.view.rank || a.index - b.index);
}

/** Driver Home's ONE primary button (brief § 3, "Why one next step button"). */
export type NextStep =
  | { kind: 'fix' | 'renew' | 'upload'; code: string; name: string }
  | { kind: 'addTricycle' }
  | { kind: 'subscribe' }
  | null; // nothing to press: waiting for the admin

export function nextStep(checklist: Checklist, tricycle: Vehicle | null): NextStep {
  const rows = checklist.requirements;
  const fix = rows.find((r) => r.status === 'rejected' || r.status === 'resubmission_required');
  if (fix) {
    return { kind: 'fix', code: fix.requirement.code, name: fix.requirement.name };
  }
  const expired = rows.find((r) => r.status === 'expired' && !r.locked);
  if (expired) {
    return { kind: 'renew', code: expired.requirement.code, name: expired.requirement.name };
  }
  const missing = rows.find((r) => r.status === 'missing' && !r.locked);
  if (missing) {
    return { kind: 'upload', code: missing.requirement.code, name: missing.requirement.name };
  }
  if (!tricycle || rows.some((r) => r.locked)) {
    return { kind: 'addTricycle' };
  }
  if (checklist.compliance_status === 'verified') {
    return { kind: 'subscribe' };
  }
  return null;
}

/** "{n} na lang": the documents still to submit or fix, plus the tricycle if there isn't one. */
export function stepsLeft(checklist: Checklist, tricycle: Vehicle | null): number {
  const docs = checklist.requirements.filter((r) =>
    ['missing', 'rejected', 'resubmission_required', 'expired'].includes(r.status),
  ).length;
  return docs + (tricycle ? 0 : 1);
}

function view(
  kind: ChipKind,
  chipKey: MessageKey,
  icon: string,
  detailKey: MessageKey,
  detailParams: Record<string, string | number>,
  reason: string | null,
  rank: number,
): RequirementView {
  return { kind, chipKey, icon, detailKey, detailParams, reason, rank };
}
