/**
 * PackSure AI - Compliance Inspection Type Definitions
 * Strict contract definitions for backend API communication and UI rendering.
 */

export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';

export type BoundingBox = [number, number, number, number]; // [x1, y1, x2, y2]

export interface ProductInfo {
  type: string;
  name: string;
  [key: string]: unknown;
}

export interface DeclarationItem {
  field: string;
  value: string;
  raw_text?: string | null;
  confidence?: number | null;
  bbox?: BoundingBox | null;
  image_index?: number | null;
  context?: unknown;
  unit?: unknown;
  unit_status?: unknown;
  currency?: unknown;
  context_confirmed?: unknown;
  date_role?: unknown;
  [key: string]: unknown;
}

export interface ViolationEvidence {
  value?: string | null;
  image_index?: number | null;
  bbox?: BoundingBox | null;
  [key: string]: unknown;
}

export interface ViolationItem {
  field: string;
  status: 'NON_COMPLIANT' | 'WARNING';
  rule_id: string;
  reason: string;
  evidence?: ViolationEvidence | null;
  [key: string]: unknown;
}

export interface ScanResult {
  inspection_id: string;
  product: ProductInfo;
  overall_status: ComplianceStatus;
  score: number; // 0 to 100
  declarations: DeclarationItem[];
  violations: ViolationItem[];
  [key: string]: unknown;
}

export interface UploadedImageFile {
  file: File;
  previewUrl: string;
  index: number; // 1-based index (1, 2, 3)
  name: string;
  size: number;
  type: string;
  naturalWidth?: number;
  naturalHeight?: number;
}

export type SelectedEvidenceTarget = {
  type: 'violation' | 'declaration';
  field: string;
  value: string;
  image_index?: number | null;
  bbox?: BoundingBox | null;
  status?: ComplianceStatus;
  rule_id?: string;
  reason?: string;
  confidence?: number | null;
} | null;

export interface BackendHealthResponse {
  status: string;
  service?: string;
  version?: string;
  [key: string]: unknown;
}

export interface BackendErrorResponse {
  error: string;
  message: string;
  status_code?: number;
  details?: Record<string, unknown> | unknown[] | null;
  [key: string]: unknown;
}
