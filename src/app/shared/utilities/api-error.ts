import { HttpErrorResponse } from '@angular/common/http';
import { MessageKey } from '../../core/i18n/messages.en';

/** I18nService.t, passed in so this stays a plain function. */
type Translate = (key: MessageKey) => string;

/**
 * Every API failure in ONE shape, matching the API's error format (phase-5 § 3):
 *   { message, code, fieldErrors }
 * Pages show `message`, put `fieldErrors` under the right inputs, and branch on `code`.
 */
export interface ApiError {
  status: number; // 0 = no response (no internet, server down, blocked)
  code: string; // e.g. INVALID_CREDENTIALS, VALIDATION_FAILED, NETWORK
  message: string; // in the app's language (the API answers in it too), safe to show
  fieldErrors: Record<string, string>; // first message per field
  /** Facts to recover with (Phase 9 API): e.g. the new estimate (FARE_CHANGED), ride_id (ACTIVE_RIDE_EXISTS). */
  data?: Record<string, unknown>;
}

export function toApiError(err: unknown, t: Translate): ApiError {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return {
        status: 0,
        code: 'NETWORK',
        message: t('error.network'),
        fieldErrors: {},
      };
    }

    const body = (err.error ?? {}) as { message?: string; code?: string; errors?: Record<string, string[]>; data?: Record<string, unknown> };
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(body.errors ?? {})) {
      fieldErrors[field] = messages[0];
    }

    return {
      status: err.status,
      code: body.code ?? 'HTTP_ERROR',
      message: body.message ?? t('error.unknown'),
      fieldErrors,
      ...(body.data ? { data: body.data } : {}),
    };
  }

  if (err instanceof Error && err.name === 'TimeoutError') {
    return { status: 0, code: 'TIMEOUT', message: t('error.timeout'), fieldErrors: {} };
  }

  return { status: 0, code: 'UNKNOWN', message: t('error.unknown'), fieldErrors: {} };
}
