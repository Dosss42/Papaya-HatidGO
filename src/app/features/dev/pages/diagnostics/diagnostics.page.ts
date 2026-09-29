import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ApiHealthResult, ApiHealthService } from '../../../../core/services/api-health.service';
import { AppLifecycleService } from '../../../../core/services/app-lifecycle.service';
import { environment } from '../../../../../environments/environment';
import { LocationService } from '../../../../core/services/location.service';
import { NetworkService } from '../../../../core/services/network.service';
import { LocationError } from '../../../../shared/models/location.model';

/**
 * DEV ONLY (Phase 3): proves GPS, network and app lifecycle work on a real phone.
 * The route exists only in development builds (see app.routes.ts).
 */
@Component({
  selector: 'app-diagnostics',
  templateUrl: './diagnostics.page.html',
  styleUrls: ['./diagnostics.page.scss'],
  imports: [
    DatePipe,
    DecimalPipe,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonTitle,
    IonToolbar,
  ],
})
export class DiagnosticsPage implements OnDestroy {
  protected readonly location = inject(LocationService);
  protected readonly network = inject(NetworkService);
  private readonly lifecycle = inject(AppLifecycleService);
  private readonly apiHealth = inject(ApiHealthService);

  protected readonly apiUrl = environment.apiUrl;
  protected readonly apiResult = signal<ApiHealthResult | null>(null);
  protected readonly apiChecking = signal(false);

  protected readonly busy = signal(false);
  protected readonly lastError = signal<LocationError | null>(null);
  protected readonly watchUpdates = signal(0);
  protected readonly log = signal<string[]>([]);

  constructor() {
    // Each effect re-runs when the signals it reads change, so every pause/resume
    // and every network change adds a line to the log.
    effect(() =>
      this.addLog(this.lifecycle.isActive() ? 'App: resume (foreground)' : 'App: pause (background)'),
    );
    effect(() =>
      this.addLog(
        this.network.online() ? `Network: online (${this.network.connectionType()})` : 'Network: OFFLINE',
      ),
    );
  }

  async getLocation(): Promise<void> {
    this.busy.set(true);
    this.lastError.set(null);
    try {
      await this.location.getCurrentPosition();
    } catch (err) {
      this.lastError.set(LocationError.from(err));
    } finally {
      this.busy.set(false);
    }
  }

  async startWatch(): Promise<void> {
    this.lastError.set(null);
    this.watchUpdates.set(0);
    try {
      await this.location.startWatch(
        () => this.watchUpdates.update((n) => n + 1),
        (error) => this.lastError.set(error),
      );
    } catch (err) {
      this.lastError.set(LocationError.from(err));
    }
  }

  async checkApi(): Promise<void> {
    this.apiChecking.set(true);
    const result = await this.apiHealth.check();
    this.apiResult.set(result);
    this.apiChecking.set(false);
    this.addLog(`API: ${result.reachable ? 'OK' : 'FAILED'} (HTTP ${result.status}, ${result.latencyMs} ms)`);
  }

  async stopWatch(): Promise<void> {
    await this.location.stopWatch();
  }

  ngOnDestroy(): void {
    // Leaving the page must not leave the GPS running.
    void this.location.stopWatch();
  }

  private addLog(line: string): void {
    const time = new Date().toLocaleTimeString();
    this.log.update((lines) => [`${time}  ${line}`, ...lines].slice(0, 15));
  }
}
