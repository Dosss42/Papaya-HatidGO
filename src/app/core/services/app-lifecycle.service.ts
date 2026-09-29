import { Injectable, signal } from '@angular/core';
import { App } from '@capacitor/app';

/**
 * Whether the app is in the foreground (active) or in the background (paused).
 * Later phases react to it: the active ride screen refreshes on resume (active-ride brief),
 * and polling pauses in the background to save battery and data.
 */
@Injectable({ providedIn: 'root' })
export class AppLifecycleService {
  private readonly _isActive = signal(true);

  readonly isActive = this._isActive.asReadonly();

  constructor() {
    void App.addListener('appStateChange', (state) => this._isActive.set(state.isActive));
  }
}
