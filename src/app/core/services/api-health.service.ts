import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiHealthResult {
  reachable: boolean;
  /** HTTP status; 0 = no response at all (server down, wrong address, blocked, no internet). */
  status: number;
  db?: string;
  latencyMs: number;
  message: string;
}

/**
 * Asks GET /api/v1/health. Lets the app tell "the server can't be reached" apart from
 * "the server answered with an error", and proves the phone → PC → Laravel → MySQL chain.
 */
@Injectable({ providedIn: 'root' })
export class ApiHealthService {
  private readonly http = inject(HttpClient);

  async check(): Promise<ApiHealthResult> {
    const started = performance.now();
    try {
      const body = await firstValueFrom(
        this.http.get<{ status: string; db: string }>(`${environment.apiUrl}/health`).pipe(timeout(8000)),
      );
      return {
        reachable: true,
        status: 200,
        db: body.db,
        latencyMs: Math.round(performance.now() - started),
        message: `OK: API reachable, database ${body.db}`,
      };
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      return {
        reachable: false,
        status,
        latencyMs: Math.round(performance.now() - started),
        message:
          status === 0
            ? `Hindi maabot ang server sa ${environment.apiUrl}`
            : `Sumagot ang server ng error (HTTP ${status})`,
      };
    }
  }
}
