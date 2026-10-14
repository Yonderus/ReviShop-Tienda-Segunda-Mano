import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export type StatTone = 'primary' | 'success' | 'neutral' | 'warning' | 'retired';

const DOTS: Record<StatTone, string> = {
  primary: 'bg-primary-600',
  success: 'bg-emerald-600',
  neutral: 'bg-slate-500',
  warning: 'bg-amber-500',
  retired: 'border border-dashed border-slate-500 bg-transparent',
};

/** Una cifra real con su etiqueta; si recibe `link` toda la tarjeta navega a esa sección. */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (link(); as href) {
      <a [routerLink]="href" class="stat group block h-full rounded-xl p-4 transition-colors duration-150 hover:bg-canvas sm:p-5">
        <ng-container *ngTemplateOutlet="body" />
      </a>
    } @else {
      <div class="stat h-full p-4 sm:p-5"><ng-container *ngTemplateOutlet="body" /></div>
    }

    <ng-template #body>
      <p class="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <span class="size-2 rounded-full" [class]="dot()" aria-hidden="true"></span>
        {{ label() }}
      </p>
      <p class="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-[2.125rem]">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-1 text-xs text-ink-muted">{{ hint() }}</p>
      }
    </ng-template>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly hint = input<string>();
  readonly tone = input<StatTone>('primary');
  readonly link = input<string>();

  protected readonly dot = computed(() => DOTS[this.tone()]);
}
