import { Injectable, signal } from '@angular/core';
import { ConnectionType, Network } from '@capacitor/network';

/**
 * Whether the phone has internet right now, updated live.
 * Used by the "Walang internet" banners (see the design briefs) and, later,
 * by SyncService to retry queued actions when the connection returns.
 */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  // Assume online until the first real status arrives, so the app doesn't flash an offline banner at startup.
  private readonly _online = signal(true);
  private readonly _connectionType = signal<ConnectionType>('unknown');

  readonly online = this._online.asReadonly();
  readonly connectionType = this._connectionType.asReadonly();

  constructor() {
    // One app-wide listener for the lifetime of the app (this service exists once, in root).
    void Network.getStatus().then((status) => this.update(status.connected, status.connectionType));
    void Network.addListener('networkStatusChange', (status) =>
      this.update(status.connected, status.connectionType),
    );
  }

  private update(connected: boolean, type: ConnectionType): void {
    this._online.set(connected);
    this._connectionType.set(type);
  }
}
