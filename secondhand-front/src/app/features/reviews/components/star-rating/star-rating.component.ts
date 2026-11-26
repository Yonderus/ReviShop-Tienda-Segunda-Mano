import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatRating } from '../../models/review.model';

/** El trazo de una estrella (relleno). Lo comparten la estrella que se muestra y la que se elige. */
export const STAR_PATH = 'M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.9z';

const SIZES = { sm: 14, md: 18, lg: 26 } as const;

/**
 * Cinco estrellas que muestran una nota, con fracciones (4,5 = cuatro y media). Dos capas: las grises debajo y
 * las amarillas encima, recortadas al porcentaje de la nota. Para el lector de pantalla es una imagen con texto:
 * "4,5 de 5 estrellas".
 */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex align-middle' },
  template: `
    <span class="relative inline-flex" role="img" [attr.aria-label]="label()">
      <span class="flex text-slate-300" aria-hidden="true">
        @for (star of stars; track star) {
          <svg [attr.width]="px()" [attr.height]="px()" viewBox="0 0 24 24" fill="currentColor"><path [attr.d]="path" /></svg>
        }
      </span>
      <span class="absolute inset-y-0 left-0 flex overflow-hidden text-amber-500" [style.width.%]="percent()" aria-hidden="true">
        @for (star of stars; track star) {
          <svg class="shrink-0" [attr.width]="px()" [attr.height]="px()" viewBox="0 0 24 24" fill="currentColor"><path [attr.d]="path" /></svg>
        }
      </span>
    </span>
  `,
})
export class StarRatingComponent {
  readonly value = input<number | null>(null);
  readonly size = input<keyof typeof SIZES>('md');

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly path = STAR_PATH;
  protected readonly px = computed(() => SIZES[this.size()]);
  protected readonly percent = computed(() => Math.max(0, Math.min(100, ((this.value() ?? 0) / 5) * 100)));
  protected readonly label = computed(() => (this.value() === null ? 'Sin valoraciones' : `${formatRating(this.value())} de 5 estrellas`));
}
