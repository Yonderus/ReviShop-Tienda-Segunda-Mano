import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from '../../ui/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span class="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <app-icon [name]="icon()" [size]="28" />
      </span>
      <h2 class="text-lg font-semibold text-ink">{{ title() }}</h2>
      <p class="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{{ message() }}</p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <ng-content />
      </div>
    </section>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly icon = input<IconName>('recycle');
}
