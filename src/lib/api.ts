import {
  ScanResult,
  BackendHealthResponse,
  BackendErrorResponse,
  ComplianceStatus,
} from '../types/inspection';
import { DEFAULT_MOCK_SCAN_RESULT } from '../mock/scanResult';

/**
 * Resolves the backend base URL from canonical Vite environment variable.
 * Removes trailing slashes. Deliberately returns empty string if not configured (same-origin).
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Deliberate empty string for same-origin deployment
  return '';
}

/**
 * Checks whether mock mode is enabled via canonical Vite environment variable.
 * Must be explicitly enabled with VITE_USE_MOCK_API=true (or '1').
 * Mock mode must NEVER silently become the production default.
 */
export function isMockModeConfigured(): boolean {
  const envMock = import.meta.env.VITE_USE_MOCK_API;

  if (typeof envMock === 'string') {
    const normalized = envMock.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  // Real API mode by default. Mock mode must be explicitly enabled.
  return false;
}

export interface ApiErrorOptions {
  statusCode?: number;
  errorCode?: string;
  title?: string;
  isNetworkError?: boolean;
  rawDetails?: unknown;
}

export class ApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  title?: string;
  isNetworkError: boolean;
  rawDetails?: unknown;

  constructor(message: string, options?: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.title = options?.title;
    this.statusCode = options?.statusCode;
    this.errorCode = options?.errorCode;
    this.isNetworkError = options?.isNetworkError ?? false;
    this.rawDetails = options?.rawDetails;
  }
}

/**
 * Translates technical backend error codes into user-friendly messages
 * and sensible error titles.
 */
export function translateBackendError(
  errorCode?: string,
  rawBackendMessage?: string
): { title: string; friendlyMessage: string } {
  switch (errorCode) {
    case 'MISSING_IMAGES':
      return {
        title: 'Missing Package Images',
        friendlyMessage: 'Please upload at least 1 package image to begin statutory analysis.',
      };
    case 'TOO_MANY_IMAGES':
      return {
        title: 'Image Limit Exceeded',
        friendlyMessage: 'A maximum of 3 images is allowed per inspection.',
      };
    case 'UNSUPPORTED_FORMAT':
      return {
        title: 'Unsupported File Format',
        friendlyMessage: 'Unsupported format. PackSure supports JPG, JPEG, PNG, and WEBP images only.',
      };
    case 'INVALID_IMAGE':
      return {
        title: 'Unreadable or Corrupted Image',
        friendlyMessage: 'The selected image could not be read. Please upload a valid package image.',
      };
    case 'OCR_UNAVAILABLE':
      return {
        title: 'OCR Service Unavailable',
        friendlyMessage: 'PackSure could not access the OCR engine. Please try again.',
      };
    case 'EXTRACTION_FAILED':
      return {
        title: 'Declaration Extraction Failed',
        friendlyMessage: 'Statutory declarations could not be extracted from the provided package images. Please try with clearer photos.',
      };
    case 'INTERNAL_SERVER_ERROR':
      return {
        title: 'Inspection Service Error',
        friendlyMessage: 'The inspection service encountered an internal processing error. Please try again.',
      };
    case 'TIMEOUT':
      return {
        title: 'Inspection Request Timed Out',
        friendlyMessage: 'The inspection service took too long to complete evaluation. Please try again.',
      };
    case 'NETWORK_ERROR':
      return {
        title: 'Inspection Service Unreachable',
        friendlyMessage: 'PackSure could not reach the inspection service. Please verify the backend is running and reachable.',
      };
    case 'MALFORMED_RESPONSE':
      return {
        title: 'Unexpected Response',
        friendlyMessage: 'Received an unexpected or malformed response structure from the inspection service.',
      };
    default:
      return {
        title: 'Inspection Error',
        friendlyMessage: rawBackendMessage || 'An unexpected error occurred during package inspection.',
      };
  }
}

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const SUPPORTED_EXT_REGEX = /\.(jpe?g|png|webp)$/i;

// 60-second timeout for full multi-image OCR and statutory rule processing
const SCAN_TIMEOUT_MS = 60_000;
const HEALTH_TIMEOUT_MS = 5_000;

/**
 * Sends package images to POST /scan and returns the typed inspection result.
 * 
 * Strict architectural boundaries:
 * 1. Validates 1 to 3 images
 * 2. Validates format (JPG, JPEG, PNG, WEBP)
 * 3. Builds FormData with field name "images"
 * 4. Lets browser manage multipart boundary (no manual Content-Type)
 * 5. Uses AbortController for timeout
 * 6. Never auto-retries expensive OCR scans
 * 7. Parses structured backend error JSON
 */
export async function scanPackage(images: File[], forceMock?: boolean): Promise<ScanResult> {
  // 1. Validate image count
  if (!images || images.length === 0) {
    throw new ApiError('Please upload at least one package image (minimum 1, maximum 3) to begin inspection.');
  }

  if (images.length > 3) {
    throw new ApiError('Maximum 3 images allowed per inspection scan.');
  }

  // 2. Validate supported formats: JPG, JPEG, PNG, WEBP
  for (const img of images) {
    const hasValidMime = img.type && SUPPORTED_MIME_TYPES.has(img.type.toLowerCase());
    const hasValidExt = SUPPORTED_EXT_REGEX.test(img.name);
    if (!hasValidMime && !hasValidExt) {
      throw new ApiError(
        `Unsupported file format "${img.name}". PackSure supports JPG, JPEG, PNG, and WEBP images only.`
      );
    }
  }

  // 3. Explicit mock mode fallback
  const useMock = forceMock !== undefined ? forceMock : isMockModeConfigured();
  if (useMock) {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    return JSON.parse(JSON.stringify(DEFAULT_MOCK_SCAN_RESULT));
  }

  // 4. Build FormData with exact field name "images"
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/scan`;

  const formData = new FormData();
  images.forEach((image) => {
    formData.append('images', image);
  });

  // 5. POST to /scan with AbortController timeout. Browser generates multipart boundary.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      // CRITICAL: Do NOT set Content-Type header.
      // The browser automatically computes multipart/form-data with boundary.
    });

    clearTimeout(timeoutId);

    // 6. Handle HTTP non-200 responses and parse structured backend errors
    if (!response.ok) {
      let errorCode = `HTTP_${response.status}`;
      let errorMsg = `Inspection service responded with HTTP ${response.status}`;
      let errorDetails: unknown = null;
      let statusCode = response.status;

      try {
        const errorJson = (await response.json()) as BackendErrorResponse;
        if (errorJson) {
          if (errorJson.error) {
            errorCode = errorJson.error;
          }
          if (errorJson.message) {
            errorMsg = errorJson.message;
          } else if (errorJson.error) {
            errorMsg = errorJson.error;
          }
          if (typeof errorJson.status_code === 'number') {
            statusCode = errorJson.status_code;
          }
          errorDetails = errorJson.details !== undefined ? errorJson.details : errorJson;
        }
      } catch {
        if (response.statusText) {
          errorMsg = `${errorMsg}: ${response.statusText}`;
        }
      }

      const translated = translateBackendError(errorCode, errorMsg);

      throw new ApiError(translated.friendlyMessage, {
        title: translated.title,
        statusCode,
        errorCode,
        rawDetails: errorDetails,
      });
    }

    // 7. Parse and validate successful response
    let data: unknown;
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new ApiError('Failed to parse backend inspection response as JSON.', {
        errorCode: 'MALFORMED_RESPONSE',
        rawDetails: parseErr,
      });
    }

    if (!data || typeof data !== 'object') {
      throw new ApiError('Malformed inspection response: expected a JSON object from backend.', {
        errorCode: 'MALFORMED_RESPONSE',
        rawDetails: data,
      });
    }

    const candidate = data as Record<string, unknown>;

    if (typeof candidate.inspection_id !== 'string' || !candidate.inspection_id) {
      throw new ApiError('Malformed inspection response: missing or invalid "inspection_id".', {
        errorCode: 'MALFORMED_RESPONSE',
        rawDetails: data,
      });
    }

    const validStatuses: ComplianceStatus[] = ['COMPLIANT', 'NON_COMPLIANT', 'WARNING'];
    if (
      typeof candidate.overall_status !== 'string' ||
      !validStatuses.includes(candidate.overall_status as ComplianceStatus)
    ) {
      throw new ApiError(
        `Malformed inspection response: invalid "overall_status" ("${String(candidate.overall_status)}").`,
        { errorCode: 'MALFORMED_RESPONSE', rawDetails: data }
      );
    }

    if (typeof candidate.score !== 'number' || isNaN(candidate.score)) {
      throw new ApiError('Malformed inspection response: missing or non-numeric "score".', {
        errorCode: 'MALFORMED_RESPONSE',
        rawDetails: data,
      });
    }

    if (!Array.isArray(candidate.declarations)) {
      throw new ApiError('Malformed inspection response: "declarations" must be an array.', {
        errorCode: 'MALFORMED_RESPONSE',
        rawDetails: data,
      });
    }

    if (!Array.isArray(candidate.violations)) {
      throw new ApiError('Malformed inspection response: "violations" must be an array.', {
        errorCode: 'MALFORMED_RESPONSE',
        rawDetails: data,
      });
    }

    return candidate as unknown as ScanResult;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // If it's already an ApiError, rethrow directly
    if (err instanceof ApiError) {
      throw err;
    }

    const error = err as Error;

    // Handle abort / timeout
    if (error.name === 'AbortError' || controller.signal.aborted) {
      const translated = translateBackendError('TIMEOUT');
      throw new ApiError(translated.friendlyMessage, {
        title: translated.title,
        isNetworkError: true,
        errorCode: 'TIMEOUT',
        rawDetails: err,
      });
    }

    // Handle network failures
    if (
      error.name === 'TypeError' ||
      error.message?.includes('fetch') ||
      error.message?.includes('Network') ||
      error.message?.includes('Failed to fetch')
    ) {
      const translated = translateBackendError('NETWORK_ERROR');
      throw new ApiError(translated.friendlyMessage, {
        title: translated.title,
        isNetworkError: true,
        errorCode: 'NETWORK_ERROR',
        rawDetails: err,
      });
    }

    throw new ApiError(error.message || 'An unexpected error occurred during package inspection.', {
      rawDetails: err,
    });
  }
}

/**
 * Checks backend health endpoint GET /health.
 * Returns the complete backend health response but does not require service/version if absent.
 */
export async function checkBackendHealth(timeoutMs: number = HEALTH_TIMEOUT_MS): Promise<BackendHealthResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/health`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(`Health check failed with HTTP ${response.status}`, {
        statusCode: response.status,
      });
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('status' in data)) {
      throw new ApiError('Invalid health check response schema: missing "status" property.', {
        rawDetails: data,
      });
    }

    return data as BackendHealthResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    const error = err as Error;
    throw new ApiError(
      error.message || 'Backend health service unreachable',
      { isNetworkError: true, rawDetails: err }
    );
  }
}
