import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { Vehicle, VehiclePayload } from '../../shared/models/driver.model';
import { apiCall } from './api-call';

/**
 * The driver's tricycle (API: /api/v1/vehicles, Phase 7 step 7.2). One tricycle in the app
 * (decision #3): `active` is the one that counts. Plate numbers come back in their stored form
 * (ABC1234); the API normalizes whatever was typed.
 * @throws ApiError on every failure (VALIDATION_FAILED with fieldErrors, NETWORK, …)
 */
@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly base = `${environment.apiUrl}/vehicles`;

  private readonly list = signal<Vehicle[]>([]);
  readonly vehicles = this.list.asReadonly();
  readonly active = computed(() => this.list().find((v) => v.is_active) ?? null);

  async load(): Promise<Vehicle[]> {
    const vehicles = await this.call(this.http.get<{ data: Vehicle[] }>(this.base).pipe(map((r) => r.data)));
    this.list.set(vehicles);
    return vehicles;
  }

  async create(payload: VehiclePayload): Promise<Vehicle> {
    const vehicle = await this.call(this.http.post<{ data: Vehicle }>(this.base, payload).pipe(map((r) => r.data)));
    this.list.update((list) => [...list, vehicle]);
    return vehicle;
  }

  /** Only the fields sent change. A NEW plate sends the tricycle back for review (API rule). */
  async update(id: number, payload: VehiclePayload): Promise<Vehicle> {
    const vehicle = await this.call(this.http.patch<{ data: Vehicle }>(`${this.base}/${id}`, payload).pipe(map((r) => r.data)));
    this.list.update((list) => list.map((v) => (v.id === id ? vehicle : v)));
    return vehicle;
  }

  /** Forget the cached list (logout). */
  clear(): void {
    this.list.set([]);
  }

  private call<T>(request: Observable<T>): Promise<T> {
    return apiCall(request, (key) => this.i18n.t(key));
  }
}
