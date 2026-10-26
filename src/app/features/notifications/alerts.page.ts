import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircle,
  cardOutline,
  documentTextOutline,
  notificationsOffOutline,
  notificationsOutline,
  powerOutline,
} from 'ionicons/icons';
import { TranslatePipe } from '../../core/i18n/t.pipe';
import { NotificationsService } from '../../core/services/notifications.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppAlert } from '../../shared/models/notification.model';
import { phDateTime } from '../../shared/utilities/subscription-view';
import { alertIcon } from './alert-view';

/**
 * Alerts (Phase 13): what happened while the user was away, newest first, for both roles
 * (/passenger/alerts, /driver/alerts). New ones carry the word "New" as well as bold text.
 * A tap marks it read and opens its screen. If notifications are off, the top card says so and
 * how to turn them on; the list fills either way.
 */
@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
  imports: [IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, EmptyStateComponent, TranslatePipe],
})
export class AlertsPage implements ViewWillEnter {
  protected readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly list = signal<AppAlert[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly page = signal(1);
  protected readonly hasMore = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly markingAll = signal(false);
  protected readonly icon = alertIcon;
  protected readonly dateTime = phDateTime;

  constructor() {
    addIcons({ alertCircle, cardOutline, documentTextOutline, notificationsOffOutline, notificationsOutline, powerOutline });
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  protected async load(event?: CustomEvent): Promise<void> {
    this.failed.set(false);
    try {
      const res = await this.notifications.list(1);
      this.list.set(res.data);
      this.page.set(1);
      this.hasMore.set(res.meta.current_page < res.meta.last_page);
    } catch {
      this.failed.set(true);
    } finally {
      (event?.target as HTMLIonRefresherElement | undefined)?.complete();
    }
  }

  protected async more(): Promise<void> {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const res = await this.notifications.list(this.page() + 1);
      this.list.update((l) => [...(l ?? []), ...res.data.filter((a) => !l?.some((b) => b.id === a.id))]);
      this.page.set(res.meta.current_page);
      this.hasMore.set(res.meta.current_page < res.meta.last_page);
    } catch {
      this.failed.set(true);
    } finally {
      this.loadingMore.set(false);
    }
  }

  /** Read it (on the server too) and go where it leads. */
  protected async open(alert: AppAlert): Promise<void> {
    if (!alert.read_at) {
      this.list.update((l) => l?.map((a) => (a.id === alert.id ? { ...a, read_at: new Date().toISOString() } : a)) ?? null);
      void this.notifications.markRead(alert.id).catch(() => undefined);
    }
    const url = alert.target ? this.notifications.urlFor(alert.target) : null;
    if (url) await this.router.navigateByUrl(url);
  }

  protected async markAll(): Promise<void> {
    this.markingAll.set(true);
    try {
      await this.notifications.markAllRead();
      const now = new Date().toISOString();
      this.list.update((l) => l?.map((a) => (a.read_at ? a : { ...a, read_at: now })) ?? null);
    } catch {
      this.failed.set(true);
    } finally {
      this.markingAll.set(false);
    }
  }
}
