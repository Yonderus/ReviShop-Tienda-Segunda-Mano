import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { STAR_PATH } from '../star-rating/star-rating.component';

const WORDS = ['', 'Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'];

/**
 * Elegir de 1 a 5 estrellas. Son radios de verdad (escondidos), así que funciona con el teclado como cualquier
 * grupo de radios (Tab entra, las flechas cambian) y el lector de pantalla dice "3 estrellas, Normal, 3 de 5".
 * Las estrellas son sus labels: pinchar una la elige. `value` es un `model()`: se usa con `[(value)]`.
 */
@Component({
  selector: 'app-star-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset [attr.aria-describedby]="describedBy() || null">
      <legend class="text-sm font-medium text-ink" [class.sr-only]="hideLegend()">{{ legend() }}</legend>
      <div class="mt-1 flex items-center gap-2">
        <div class="flex">
          @for (star of stars; track star) {
            <label class="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500">
              <input
                type="radio"
                class="sr-only"
                [name]="name()"
                [value]="star"
                [checked]="value() === star"
                (change)="value.set(star)"
              />
              <span class="sr-only">{{ star }} {{ star === 1 ? 'estrella' : 'estrellas' }}, {{ words[star] }}</span>
              <svg
                [attr.width]="big() ? 32 : 24"
                [attr.height]="big() ? 32 : 24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                class="transition-colors"
                [class]="(value() ?? 0) >= star ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'"
              >
                <path [attr.d]="path" />
              </svg>
            </label>
          }
        </div>
        <span class="text-sm text-ink-muted" aria-hidden="true">{{ value() ? words[value()!] : '' }}</span>
      </div>
    </fieldset>
  `,
})
export class StarInputComponent {
  readonly legend = input.required<string>();
  /** Nombre del grupo de radios: único en la página. */
  readonly name = input.required<string>();
  readonly value = model<number | null>(null);
  readonly big = input(false);
  readonly hideLegend = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly words = WORDS;
  protected readonly path = STAR_PATH;
}
