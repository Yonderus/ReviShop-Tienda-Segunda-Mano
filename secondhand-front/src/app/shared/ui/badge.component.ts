import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'neutral' | 'info';

/** Combinaciones con contraste AA (≥ 4.5:1) para texto de 12 px. */
const TONES: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  info: 'bg-primary-50 text-primary-700 ring-primary-600/20',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="classes()">
      <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');

  protected readonly classes = computed(
    () =>
      `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[this.tone()]}`,
  );
}
