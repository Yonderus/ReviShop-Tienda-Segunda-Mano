import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ShopCategory } from '../../models/shop.model';

/** Card de categoría del Home: lleva al shop filtrado por ella (con sus subcategorías). */
@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <a
      routerLink="/shop"
      [queryParams]="{ category: category().slug }"
      class="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-5 shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <span class="inline-flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-lg font-semibold text-primary-700" aria-hidden="true">
        {{ initial() }}
      </span>
      <span class="min-w-0">
        <span class="block truncate font-semibold text-ink group-hover:text-primary-700">{{ category().name }}</span>
        <span class="mt-1 flex items-center gap-1 text-sm text-ink-muted">
          <app-icon name="tag" [size]="14" />
          {{ countLabel() }}
        </span>
      </span>
    </a>
  `,
})
export class CategoryCardComponent {
  readonly category = input.required<ShopCategory>();

  protected readonly initial = computed(() => this.category().name.charAt(0).toUpperCase());
  protected readonly countLabel = computed(() => anuncios(this.category().productsCount));
}

/** "1 anuncio" / "5 anuncios" (lo comparten las cards del Home). */
export const anuncios = (count: number): string => `${count} ${count === 1 ? 'anuncio' : 'anuncios'}`;
