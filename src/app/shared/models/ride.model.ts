/** Shapes of the Phase 9 ride API (papaya-hatidgo-api, docs/phase-9-rides.md). */

export type RideType = 'one_way' | 'two_way';
export type RideStatus = 'requested' | 'accepted' | 'driver_arriving' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
export type RideLeg = 'outbound' | 'waiting' | 'return';

/** Decimal values arrive as strings ("15.3500000", "52.20"): no float rounding on the way. */
export interface Place {
  lat: string;
  lng: string;
  landmark: string | null;
}

export interface BookingOptions {
  ride_types: RideType[]; // only the ones the admin switched on
  service_area: { center_lat: number; center_lng: number; radius_km: number };
  min_distance_m: number;
  wait_choices: number[]; // minutes; plus "Hindi pa sigurado" (null) in the app
  request_timeout_seconds: number;
}

export interface FareOption {
  ride_type: RideType;
  distance_km: string;
  return_distance_km: string | null;
  outbound_fare: string;
  return_fare: string | null;
  waiting_fee: string;
  service_fee: string;
  total: string;
  breakdown: {
    base_fare: string;
    rate_per_km: string;
    minimum_fare: string;
    minimum_applied: boolean;
    return_rate_multiplier: string;
    waiting_free_minutes: number;
    waiting_fee_per_minute: string;
  };
}

export interface Estimate {
  distance_km: string;
  options: FareOption[];
}

export interface TripPoint {
  lat: number;
  lng: number;
  landmark: string;
}

export interface BookingRequest {
  pickup_lat: number;
  pickup_lng: number;
  pickup_landmark: string | null;
  destination_lat: number;
  destination_lng: number;
  destination_landmark: string | null;
  ride_type: RideType;
  wait_minutes: number | null;
  passenger_note: string | null;
  expected_total: string;
}

export interface Ride {
  id: number;
  reference_no: string;
  ride_type: RideType;
  status: RideStatus;
  current_leg: RideLeg | null;
  wait_minutes: number | null;
  pickup: Place;
  destination: Place;
  passenger_note: string | null;
  distance_km: string;
  return_distance_km: string | null;
  fare: {
    outbound_fare: string;
    return_fare: string | null;
    waiting_fee: string;
    service_fee: string;
    estimated_total: string;
    total: string; // final once completed, the estimate before
    is_final: boolean;
  };
  waiting_minutes: number | null;
  passenger_returning_at: string | null;
  times: Record<
    | 'requested_at' | 'expires_at' | 'accepted_at' | 'arriving_at' | 'arrived_at' | 'started_at'
    | 'destination_reached_at' | 'return_started_at' | 'completed_at' | 'cancelled_at',
    string | null
  >;
  cancelled_by: 'passenger' | 'driver' | 'system' | 'admin' | null;
  /**
   * The passenger's Cancel (the cancel window): allowed before the driver sets off, then only
   * from opens_at (the driver is late). Only in the passenger's own view of the ride.
   */
  passenger_cancel?: { allowed: boolean; opens_at: string | null } | null;
  cancel_reason: string | null;
  driver: {
    first_name: string;
    last_name: string;
    phone: string | null; // only while the ride is matched and active
    rating: { average: number | null; count: number }; // average only from 5 ratings
    location: {
      lat: string;
      lng: string;
      updated_at: string | null;
      age_seconds?: number | null; // Phase 12: on the server's clock
      distance_to_pickup_km: number;
    } | null;
  } | null;
  vehicle: { plate_number: string; body_number: string | null; color: string; make: string | null; model: string | null } | null;
  rating: { score: number; comment: string | null } | null;
  /** Only in the DRIVER's copy, once matched: first name, and the phone while the ride is active (Phase 11). */
  passenger?: { first_name: string; phone: string | null } | null;
}

/** GET /rides/{id}/trail (Phase 12): the driven path, oldest first. */
export interface RideTrail {
  total_points: number; // before thinning
  points: { lat: number; lng: number; recorded_at: string }[];
}

/** The passenger's cancel reasons (active-ride brief), sent as stable codes (Phase 10 decision #7). */
export type CancelReason = 'driver_late' | 'changed_plans' | 'wrong_pickup' | 'other';
