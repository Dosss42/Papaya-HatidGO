import { HttpErrorResponse } from '@angular/common/http';

/**
 * Every API failure in ONE shape, matching the API's error format (phase-5 § 3):
 *   { message, code, fieldErrors }
 * Pages show `message`, put `fieldErrors` under the right inputs, and branch on `code`.
 */
export interface ApiError {
  status: number; // 0 = no response (no internet, server down, blocked)
  code: string; // e.g. INVALID_CREDENTIALS, VALIDATION_FAILED, NETWORK
  message: string; // Taglish, safe to show to the user
  fieldErrors: Record<string, string>; // first message per field
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return {
        status: 0,
        code: 'NETWORK',
        message: 'Walang internet o hindi maabot ang server. Subukan ulit.',
        fieldErrors: {},
      };
    }

    const body = (err.error ?? {}) as { message?: string; code?: string; errors?: Record<string, string[]> };
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(body.errors ?? {})) {
      fieldErrors[field] = messages[0];
    }

    return {
      status: err.status,
      code: body.code ?? 'HTTP_ERROR',
      message: body.message ?? 'May problema. Subukan ulit.',
      fieldErrors,
    };
  }

  if (err instanceof Error && err.name === 'TimeoutError') {
    return { status: 0, code: 'TIMEOUT', message: 'Masyadong matagal sumagot ang server. Subukan ulit.', fieldErrors: {} };
  }

  return { status: 0, code: 'UNKNOWN', message: 'May problema. Subukan ulit.', fieldErrors: {} };
}
