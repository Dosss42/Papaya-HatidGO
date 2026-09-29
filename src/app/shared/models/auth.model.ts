import { User } from './user.model';

/** POST /auth/login and /auth/register → 200/201 */
export interface AuthResponse {
  token: string;
  user: User;
}

/** GET /auth/me: who am I, plus what the app needs to route me. */
export interface MeResponse {
  user: User;
  driver: { compliance_status: string; active_vehicle_id: number | null } | null;
  subscription: { status: string | null; plan_id: number; ends_at: string } | null;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: 'passenger' | 'driver';
}

/** Result of trying to restore a saved login when the app starts. */
export type SessionState = 'unknown' | 'authenticated' | 'guest' | 'offline';
