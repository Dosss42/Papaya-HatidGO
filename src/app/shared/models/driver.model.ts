// Shapes of the Phase 7 driver API (papaya-hatidgo-api: VehicleResource, RequirementResource,
// RequirementStateResource, DriverDocumentResource). Field names match the JSON exactly.

export type ComplianceStatus = 'pending_verification' | 'under_review' | 'verified' | 'rejected' | 'expired';

/** The EFFECTIVE status of one requirement for this driver ('missing' = nothing submitted). */
export type RequirementStatus = 'missing' | 'pending' | 'approved' | 'rejected' | 'resubmission_required' | 'expired';

export type DocumentSide = 'front' | 'back' | 'page';

export interface Requirement {
  id: number;
  code: string; // drivers_license | or_cr | mtop_permit | clearance (stable)
  name: string; // already in the app's language (Accept-Language)
  description: string | null;
  applies_to: 'driver' | 'vehicle';
  max_files: number; // 2 = front + back
  requires_expiry: boolean;
  is_critical: boolean;
}

/** One row of the checklist: GET /drivers/me/requirements. */
export interface RequirementState {
  requirement: Requirement;
  status: RequirementStatus;
  locked: boolean; // tricycle papers before there is a tricycle
  document: {
    id: number;
    document_number: string | null;
    expires_at: string | null; // YYYY-MM-DD
    submitted_at: string | null; // ISO timestamp
    days_until_expiry: number | null; // approved only
    reason: string | null; // why it must be fixed
  } | null;
  renewal: { id: number; submitted_at: string | null } | null;
}

export interface Checklist {
  compliance_status: ComplianceStatus;
  requirements: RequirementState[];
}

export interface Vehicle {
  id: number;
  plate_number: string; // stored form, e.g. ABC1234
  body_number: string | null;
  make: string | null;
  model: string | null;
  color: string;
  status: 'pending' | 'verified' | 'rejected' | 'inactive';
  is_active: boolean;
}

export interface VehiclePayload {
  plate_number?: string;
  body_number?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string;
}

export interface DriverDocument {
  id: number;
  requirement?: Requirement;
  vehicle_id: number | null;
  status: Exclude<RequirementStatus, 'missing'>;
  is_current: boolean;
  document_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  submitted_at: string | null;
  files: { id: number; side: DocumentSide | null; mime_type: string; file_size: number; original_filename: string }[];
  reviews: { action: string; reason: string | null; created_at: string | null }[];
}

/** One file to upload: kept in memory only, never saved on the phone (phase-0 § H). */
export interface UploadFile {
  blob: Blob;
  filename: string;
  side: DocumentSide;
}

export interface DocumentFields {
  expires_at?: string | null; // YYYY-MM-DD
  document_number?: string | null;
  issued_at?: string | null;
}
