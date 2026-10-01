import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, closeCircle, ellipseOutline, lockClosedOutline, timeOutline } from 'ionicons/icons';
import { ChipKind } from '../../../features/driver/requirement-view';

/**
 * A status chip: a WORD plus an icon, tinted by kind (color is never the only signal, DESIGN.md).
 * ok = approved · wait = under review · fix = needs fixing / expired · warn = expiring soon ·
 * missing = not submitted · locked = can't do it yet.
 */
@Component({
  selector: 'app-status-chip',
  imports: [IonIcon],
  template: `<span class="chip" [class]="'chip chip--' + kind()"><ion-icon [name]="icon()" aria-hidden="true" />{{ label() }}</span>`,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px 3px 8px;
      border-radius: 999px;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.3;
      white-space: nowrap;
    }
    ion-icon { font-size: 18px; flex: none; }
    .chip--ok { background: var(--hg-green-tint); color: var(--hg-ink); box-shadow: inset 0 0 0 2px var(--hg-green); }
    .chip--ok ion-icon { color: var(--hg-green); }
    .chip--wait { background: var(--hg-surface); color: var(--hg-ink); box-shadow: inset 0 0 0 2px var(--hg-field-line); }
    .chip--fix { background: var(--hg-alert-ground); color: var(--hg-alert); box-shadow: inset 0 0 0 2px var(--hg-alert); }
    .chip--warn { background: var(--hg-orange-tint); color: var(--hg-orange); box-shadow: inset 0 0 0 2px var(--hg-orange); }
    .chip--missing, .chip--locked { background: var(--hg-ground); color: var(--hg-ink-soft); box-shadow: inset 0 0 0 2px var(--hg-line); }
  `,
})
export class StatusChipComponent {
  readonly kind = input.required<ChipKind>();
  readonly label = input.required<string>();
  readonly icon = input.required<string>();

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, closeCircle, ellipseOutline, lockClosedOutline, timeOutline });
  }
}
