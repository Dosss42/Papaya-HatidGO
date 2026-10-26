import { RideType } from './ride.model';

/** Shapes of the driver-side ride API (Phases 8–11). */

/** An open request (GET /drivers/me/offers): what's needed to decide, nothing personal. */
export interface Offer {
  /** A real offer's id; NEGATIVE (-ride_id) for a request on the board, which has no offer yet. */
  offer_id: number;
  ride_id: number;
  expires_at: string; // the REAL countdown
  ride_type: RideType;
  wait_minutes: number | null;
  estimated_total: string;
  distance_km: string;
  pickup: { lat: string; lng: string; landmark: string | null; distance_from_you_km: number | null };
  destination: { lat: string; lng: string; landmark: string | null };
  passenger_note: string | null;
}

/** The go-online checklist (Phase 8, GET /drivers/me/eligibility). */
export interface Eligibility {
  eligible: boolean;
  checks: { key: 'account_active' | 'compliance_verified' | 'vehicle_verified' | 'subscription_active'; passed: boolean; action?: string }[];
}

export interface Earnings {
  period: 'day' | 'week' | 'month';
  from: string;
  to: string;
  total: string;
  rides_count: number;
  rides: { id: number; reference_no: string; ride_type: RideType; total: string; completed_at: string }[];
}

/** The driver's cancel reasons, sent as stable codes and shown in each person's language. */
export type DriverCancelReason = 'vehicle_problem' | 'passenger_not_found' | 'passenger_no_show' | 'other';
