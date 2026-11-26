import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CRITERION_LABELS, CriterionKey, RatingSummary, formatRating } from '../../models/review.model';
import { StarRatingComponent } from '../star-rating/star-rating.component';

/**
 * Las medias de un papel: la nota grande, las barras de 5 a 1 estrellas (como en las tiendas grandes) y la media de
 * cada criterio. Cada barra es un botón que filtra el listado por esas estrellas (`filter`); la elegida se marca.
 */
@Component({
  selector: 'app-rating-summary',
  standalone: true,
  imports: [StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <div class="text-center sm:pr-6">
        <p class="text-5xl font-bold tabular-nums tracking-tight text-ink">{{ average() }}</p>
        <app-star-rating class="mt-1" [value]="summary().average" size="lg" />
        <p class="mt-1 text-sm text-ink-muted">{{ countLabel() }}</p>
      </div>

      <ul class="space-y-1.5" aria-label="Valoraciones por estrellas">
        @for (row of bars(); track row.stars) {
          <li>
            <button
              type="button"
              class="group flex w-full items-center gap-3 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-canvas disabled:cursor-default disabled:hover:bg-transparent"
              [class.bg-primary-50]="selected() === row.stars"
              [disabled]="!row.count"
              [attr.aria-pressed]="selected() === row.stars"
              [attr.aria-label]="row.stars + ' estrellas: ' + row.count + (row.count === 1 ? ' valoración' : ' valoraciones') + (selected() === row.stars ? ' (filtrando)' : '')"
              (click)="filter.emit(selected() === row.stars ? null : row.stars)"
            >
              <span class="w-12 shrink-0 text-left tabular-nums text-ink">{{ row.stars }} ★</span>
              <span class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <span class="block h-full rounded-full bg-amber-500" [style.width.%]="row.percent"></span>
              </span>
              <span class="w-8 shrink-0 text-right tabular-nums text-ink-muted">{{ row.count }}</span>
            </button>
          </li>
        }
      </ul>
    </div>

    @if (criteria().length) {
      <dl class="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
        @for (item of criteria(); track item.key) {
          <div>
            <dt class="text-xs text-ink-muted">{{ item.label }}</dt>
            <dd class="mt-0.5 flex items-center gap-2">
              <app-star-rating [value]="item.value" size="sm" />
              <span class="text-sm font-semibold tabular-nums text-ink">{{ item.text }}</span>
            </dd>
          </div>
        }
      </dl>
    }
  `,
})
export class RatingSummaryComponent {
  readonly summary = input.required<RatingSummary>();
  /** Las estrellas por las que se está filtrando (o null). */
  readonly selected = input<number | null>(null);
  readonly filter = output<number | null>();

  protected readonly average = computed(() => formatRating(this.summary().average));
  protected readonly countLabel = computed(() => {
    const count = this.summary().count;
    return count === 1 ? '1 valoración' : `${count} valoraciones`;
  });
  protected readonly bars = computed(() => {
    const { distribution, count } = this.summary();
    return [5, 4, 3, 2, 1].map((stars) => {
      const value = distribution[String(stars) as keyof typeof distribution] ?? 0;
      return { stars, count: value, percent: count ? (value / count) * 100 : 0 };
    });
  });
  protected readonly criteria = computed(() =>
    (Object.entries(this.summary().criteria) as [CriterionKey, number | null][])
      .filter(([, value]) => value !== null)
      .map(([key, value]) => ({ key, label: CRITERION_LABELS[key], value, text: formatRating(value) })),
  );
}
