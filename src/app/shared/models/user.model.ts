// Matches users.role in the database design (phase-0-analysis.md, section C).
export type Role = 'passenger' | 'driver' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
}
