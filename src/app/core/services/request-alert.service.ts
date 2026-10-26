import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';

/** Repeat the tone + vibration this often until the driver acts or the request ends (brief § 4). */
export const ALERT_EVERY_MS = 5000;

/**
 * The ONE sound in the app (brief § 6): the incoming-request tone, bundled (works without
 * internet) and played at media volume, with a vibration so a phone in a pocket still feels it.
 */
@Injectable({ providedIn: 'root' })
export class RequestAlertService {
  private audio: HTMLAudioElement | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Call from the Mag-online TAP: WebViews only allow sound that a user gesture started, so the
   * tone is "played" once silently here and may then ring later by itself.
   */
  unlock(): void {
    const audio = this.tone();
    audio.muted = true;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false; // vibration still works; the next tap tries again
      });
  }

  /**
   * Ring ONE time: a new request was added to the driver's list (after Phase 13, the list
   * replaced the automatic full-screen request). Nothing is kept ringing.
   */
  once(): void {
    if (!this.timer) this.ring();
  }

  /** Ring now, then every 5 s until stop(). */
  start(): void {
    if (this.timer) return;
    this.ring();
    this.timer = setInterval(() => this.ring(), ALERT_EVERY_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  private ring(): void {
    const audio = this.tone();
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
    void Haptics.vibrate({ duration: 700 }).catch(() => undefined);
  }

  private tone(): HTMLAudioElement {
    this.audio ??= new Audio('assets/sounds/request.wav');
    this.audio.preload = 'auto';
    return this.audio;
  }
}
