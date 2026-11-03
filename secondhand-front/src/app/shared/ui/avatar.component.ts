import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** "Lucía Martín" → "LM". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-20 text-2xl',
} as const;

/** Foto de perfil redonda; sin foto (o si no carga), las iniciales. Decorativa: el nombre va siempre al lado. */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    @if (src() && failedSrc() !== src()) {
      <img
        [src]="src()"
        alt=""
        [class]="'rounded-full object-cover bg-line ' + sizeClass()"
        referrerpolicy="no-referrer"
        (error)="failedSrc.set(src())"
      />
    } @else {
      <span [class]="'grid place-items-center rounded-full bg-primary-50 font-semibold text-primary-700 ' + sizeClass()">
        {{ letters() }}
      </span>
    }
  `,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly src = input<string | null | undefined>(null);
  readonly size = input<keyof typeof SIZES>('md');

  /** La URL que ha fallado: si cambia la URL, se vuelve a intentar. */
  protected readonly failedSrc = signal<string | null | undefined>(null);
  protected readonly letters = computed(() => initials(this.name()));
  protected readonly sizeClass = computed(() => SIZES[this.size()]);
}
