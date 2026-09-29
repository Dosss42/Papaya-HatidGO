// Matches users.role in the database design and the API's UserResource.
export type Role = 'passenger' | 'driver' | 'admin';

/** Exactly the fields the API's UserResource returns (never password or tokens). */
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string; // stored as +639XXXXXXXXX
  role: Role;
  account_status: 'active' | 'suspended';
}
