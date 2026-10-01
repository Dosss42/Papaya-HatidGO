import { Checklist, RequirementState, Vehicle } from '../../shared/models/driver.model';
import { nextStep, requirementView, sortForList, stepsLeft } from './requirement-view';

const fmt = (iso: string) => iso.slice(0, 10);

function row(code: string, status: RequirementState['status'], extra: Partial<RequirementState> = {}): RequirementState {
  return {
    requirement: {
      id: code.length, code, name: code.toUpperCase(), description: null,
      applies_to: code === 'or_cr' || code === 'mtop_permit' ? 'vehicle' : 'driver',
      max_files: code === 'drivers_license' ? 2 : 1, requires_expiry: true, is_critical: true,
    },
    status,
    locked: false,
    document: status === 'missing' ? null : {
      id: 1, document_number: null, expires_at: '2027-01-01', submitted_at: '2026-10-01T02:00:00Z', days_until_expiry: 400, reason: null,
    },
    renewal: null,
    ...extra,
  };
}

const tricycle: Vehicle = { id: 1, plate_number: 'ABC1234', body_number: null, make: null, model: null, color: 'Pula', status: 'pending', is_active: true };

describe('requirementView (brief § 4.1 chips)', () => {
  it('shows the admin reason for rejected and resubmission alike', () => {
    const rejected = row('clearance', 'rejected', { document: { ...row('clearance', 'rejected').document!, reason: 'Malabo ang litrato\nsecond line' } });
    expect(requirementView(rejected, fmt)).toMatchObject({ kind: 'fix', chipKey: 'req.chip.fix', reason: 'Malabo ang litrato' });
    expect(requirementView(row('clearance', 'resubmission_required'), fmt).chipKey).toBe('req.chip.fix');
  });

  it('marks an approved document expiring within 30 days', () => {
    const soon = row('clearance', 'approved', { document: { ...row('clearance', 'approved').document!, days_until_expiry: 12 } });
    expect(requirementView(soon, fmt)).toMatchObject({ kind: 'warn', chipKey: 'req.chip.expiring', detailParams: { n: 12 } });
    expect(requirementView(row('clearance', 'approved'), fmt)).toMatchObject({ kind: 'ok', detailParams: { date: '2027-01-01' } });
  });

  it('shows locked tricycle papers and a pending renewal', () => {
    expect(requirementView(row('or_cr', 'missing', { locked: true }), fmt).chipKey).toBe('req.chip.locked');
    expect(requirementView(row('drivers_license', 'approved', { renewal: { id: 2, submitted_at: null } }), fmt).detailKey).toBe('req.detail.renewal');
  });

  it('sorts the list as a to-do list: fix, expired, missing, locked, expiring, pending, approved', () => {
    const order = sortForList([
      row('a', 'approved'), row('b', 'pending'), row('c', 'missing'), row('d', 'expired'), row('e', 'rejected'),
    ], fmt).map((x) => x.state.requirement.code);
    expect(order).toEqual(['e', 'd', 'c', 'b', 'a']);
  });
});

describe('nextStep (one primary button on Home)', () => {
  const list = (rows: RequirementState[], status: Checklist['compliance_status'] = 'pending_verification'): Checklist =>
    ({ compliance_status: status, requirements: rows });

  it('fix first, then expired, then missing', () => {
    expect(nextStep(list([row('a', 'missing'), row('b', 'rejected')]), tricycle)).toMatchObject({ kind: 'fix', code: 'b' });
    expect(nextStep(list([row('a', 'missing'), row('b', 'expired')]), tricycle)).toMatchObject({ kind: 'renew', code: 'b' });
    expect(nextStep(list([row('a', 'approved'), row('b', 'missing')]), tricycle)).toMatchObject({ kind: 'upload', code: 'b' });
  });

  it('asks for the tricycle when only locked papers are left', () => {
    expect(nextStep(list([row('drivers_license', 'pending'), row('or_cr', 'missing', { locked: true })]), null)).toEqual({ kind: 'addTricycle' });
  });

  it('waits while under review, and offers Subscribe once verified', () => {
    expect(nextStep(list([row('a', 'pending')], 'under_review'), tricycle)).toBeNull();
    expect(nextStep(list([row('a', 'approved')], 'verified'), tricycle)).toEqual({ kind: 'subscribe' });
  });

  it('counts the steps left, including a missing tricycle', () => {
    expect(stepsLeft(list([row('a', 'missing'), row('b', 'rejected'), row('c', 'approved')]), null)).toBe(3);
  });
});
