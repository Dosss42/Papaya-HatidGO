import { Observable, firstValueFrom, timeout } from 'rxjs';
import { MessageKey } from '../i18n/messages.en';
import { toApiError } from '../../shared/utilities/api-error';

/** I18nService.t, passed in so this stays a plain function. */
type Translate = (key: MessageKey) => string;

export const DEFAULT_TIMEOUT_MS = 15_000;
/** Uploads on weak mobile data take longer than a JSON call. */
export const UPLOAD_TIMEOUT_MS = 90_000;

/**
 * Run one API call: give up after `ms`, and turn ANY failure (HTTP error, no internet, timeout)
 * into the app's ApiError shape with a message in the app's language. Services use this so
 * pages only ever handle one kind of error.
 */
export async function apiCall<T>(call: Observable<T>, t: Translate, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  try {
    return await firstValueFrom(call.pipe(timeout(ms)));
  } catch (err) {
    throw toApiError(err, t);
  }
}
