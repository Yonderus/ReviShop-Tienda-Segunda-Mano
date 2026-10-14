import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-level-meter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="flex items-center gap-2" role="img" [attr.aria-label]="ariaLabel()">
      <span class="flex gap-[3px]" aria-hidden="true">
        @for (filled of segments(); track $index) {
          <span
            class="rounded-full transition-colors duration-200"
            [class]="size() === 'lg' ? 'h-2 w-6' : 'h-1.5 w-3.5'"
            [class.bg-primary-600]="filled"
            [class.bg-line]="!filled"
          ></span>
        }
      </span>
      @if (showLabel()) {
        <span class="whitespace-nowrap text-xs font-medium text-ink-muted" aria-hidden="true">{{ label() }}</span>
      }
    </span>
  `,
})
export class LevelMeterComponent {
  readonly value = input.required<number>();
  readonly max = input(5);
  readonly label = input.required<string>();
  readonly caption = input('Nivel');
  readonly size = input<'sm' | 'lg'>('sm');
  readonly showLabel = input(true);

  protected readonly segments = computed(() =>
    Array.from({ length: this.max() }, (_, i) => i < this.value()),
  );
  protected readonly ariaLabel = computed(
    () => `${this.caption()}: ${this.label()} (${this.value()} de ${this.max()})`,
  );
}
