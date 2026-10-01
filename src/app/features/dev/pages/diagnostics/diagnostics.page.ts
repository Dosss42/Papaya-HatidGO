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
import { AppSettingsRepository } from '../../../../core/database/app-settings.repository';
import { LocalUser, LocalUserRepository } from '../../../../core/database/local-user.repository';
import { SQLiteService } from '../../../../core/database/sqlite.service';
import { ApiHealthResult, ApiHealthService } from '../../../../core/services/api-health.service';
import { CapturedFile, PhotoService } from '../../../../core/services/photo.service';
import { formatBytes } from '../../../../shared/utilities/image-compress';
import { AppLifecycleService } from '../../../../core/services/app-lifecycle.service';
import { environment } from '../../../../../environments/environment';
import { LocationService } from '../../../../core/services/location.service';
import { NetworkService } from '../../../../core/services/network.service';
import { LocationError } from '../../../../shared/models/location.model';
import { CrudStep, runSettingsCrud } from './sqlite-check';

/** What the SQLite card shows. */
interface DbInfo {
  engine: string;
  schemaVersion: number | null;
  appliedAt: string | null;
  localUser: LocalUser | null;
  settings: { key: string; value: string }[] | null; // null = can't list (browser memory mode)
}

/**
 * DEV ONLY (Phase 3, SQLite card Phase 6): proves GPS, network, app lifecycle and the local
 * database work on a real phone.
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
  private readonly sqlite = inject(SQLiteService);
  private readonly settings = inject(AppSettingsRepository);
  private readonly localUser = inject(LocalUserRepository);
  protected readonly photos = inject(PhotoService);

  protected readonly apiUrl = environment.apiUrl;
  protected readonly apiResult = signal<ApiHealthResult | null>(null);
  protected readonly apiChecking = signal(false);

  protected readonly busy = signal(false);
  protected readonly lastError = signal<LocationError | null>(null);
  protected readonly watchUpdates = signal(0);
  protected readonly log = signal<string[]>([]);

  protected readonly dbInfo = signal<DbInfo | null>(null);
  protected readonly dbError = signal<string | null>(null);
  protected readonly crudSteps = signal<CrudStep[] | null>(null);
  protected readonly dbBusy = signal(false);

  protected readonly photo = signal<CapturedFile | null>(null);
  protected readonly photoInfo = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);

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
    void this.refreshDb();
  }

  /** Reads what is in the local database right now. */
  async refreshDb(): Promise<void> {
    this.dbError.set(null);
    try {
      const localUser = await this.localUser.get();
      if (!this.sqlite.isAvailable) {
        this.dbInfo.set({ engine: 'memory (browser)', schemaVersion: null, appliedAt: null, localUser, settings: null });
        return;
      }
      const [version] = await this.sqlite.query<{ version: number; applied_at: string }>(
        'SELECT version, applied_at FROM schema_version ORDER BY version DESC LIMIT 1',
      );
      const settings = await this.sqlite.query<{ key: string; value: string }>(
        'SELECT key, value FROM app_settings ORDER BY key',
      );
      this.dbInfo.set({
        engine: `Android SQLite · ${SQLiteService.DB_NAME}`,
        schemaVersion: version?.version ?? 0,
        appliedAt: version?.applied_at ?? null,
        localUser,
        settings,
      });
    } catch (err) {
      this.dbError.set(err instanceof Error ? err.message : String(err));
    }
  }

  async runCrud(): Promise<void> {
    this.dbBusy.set(true);
    const steps = await runSettingsCrud(this.settings);
    this.crudSteps.set(steps);
    this.addLog(`SQLite CRUD: ${steps.every((s) => s.ok) ? 'PASS' : 'FAIL'} (${steps.filter((s) => s.ok).length}/${steps.length})`);
    await this.refreshDb();
    this.dbBusy.set(false);
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

  /** Camera test: take/pick → (native) resize + compress → show the result's size and pixels. */
  async takePhoto(source: 'camera' | 'gallery'): Promise<void> {
    this.photoError.set(null);
    try {
      this.showPhoto(await this.photos.take(source));
    } catch (err) {
      this.photoError.set(err instanceof Error ? err.message : String(err));
    }
  }

  async pickFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.addLog(`File picked: ${file.name} (${formatBytes(file.size)})`);
      this.showPhoto(await this.photos.fromFile(file));
    }
  }

  private showPhoto(file: CapturedFile | null): void {
    if (!file) {
      this.addLog('Camera: cancelled');
      return;
    }
    this.photos.release(this.photo());
    this.photo.set(file);
    const size = formatBytes(file.blob.size);
    if (file.isPdf || !file.previewUrl) {
      this.photoInfo.set(`PDF · ${size}`);
      return;
    }
    const img = new Image();
    img.onload = () => {
      this.photoInfo.set(`${img.naturalWidth} × ${img.naturalHeight} px · ${size} · ${file.blob.type}`);
      this.addLog(`Photo ready: ${img.naturalWidth}×${img.naturalHeight}, ${size}`);
    };
    img.src = file.previewUrl;
  }

  async stopWatch(): Promise<void> {
    await this.location.stopWatch();
  }

  ngOnDestroy(): void {
    // Leaving the page must not leave the GPS running, nor a photo in memory.
    void this.location.stopWatch();
    this.photos.release(this.photo());
  }

  private addLog(line: string): void {
    const time = new Date().toLocaleTimeString();
    this.log.update((lines) => [`${time}  ${line}`, ...lines].slice(0, 15));
  }
}
