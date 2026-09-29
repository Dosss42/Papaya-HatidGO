import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * What a screen shows when there's nothing in it yet (a real state, not a placeholder):
 * a big icon in a papaya-tint circle, a title, one line on what will appear here.
 * The icon name must be registered by the page (addIcons).
 */
@Component({
  selector: 'app-empty-state',
  imports: [IonIcon],
  template: `
    <div class="hg-empty" role="status">
      <div class="hg-empty__icon"><ion-icon [name]="icon()" aria-hidden="true" /></div>
      <h2 class="hg-empty__title">{{ title() }}</h2>
      <p class="hg-empty__text">{{ text() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly text = input.required<string>();
}
