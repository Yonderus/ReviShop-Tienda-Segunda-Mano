import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Interruptor accesible (role="switch"); el estado lo decide el padre, aquí solo se emite la intención. */
@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="group inline-flex items-center gap-2.5 rounded-full disabled:cursor-wait"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [attr.aria-busy]="busy() || null"
      [disabled]="busy()"
      (click)="toggled.emit(!checked())"
    >
      <span
        class="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-out"
        [class.bg-emerald-600]="checked()"
        [class.bg-slate-500]="!checked()"
        [class.opacity-60]="busy()"
      >
        <span
          class="absolute left-0.5 size-5 rounded-full bg-white shadow-[0_1px_2px_rgb(15_23_42/0.25)] transition-transform duration-200 ease-out"
          [class.translate-x-4]="checked()"
        ></span>
      </span>
      @if (showText()) {
        <span class="toggle-text w-14 text-left text-sm font-medium" [class.text-emerald-800]="checked()" [class.text-ink-muted]="!checked()" aria-hidden="true">
          {{ checked() ? onText() : offText() }}
        </span>
      }
    </button>
  `,
})
export class ToggleSwitchComponent {
  readonly checked = input.required<boolean>();
  readonly label = input.required<string>();
  readonly busy = input(false);
  readonly showText = input(true);
  readonly onText = input('Activo');
  readonly offText = input('Inactivo');
  readonly toggled = output<boolean>();
}
