import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ShopLocation } from '../../models/shop.model';
import { anuncios } from '../category-card/category-card.component';

/** Card de ubicación del Home: lleva al shop con lo que se vende allí. */
@Component({
  selector: 'app-location-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <a
      routerLink="/shop"
      [queryParams]="{ location: location().slug }"
      class="group flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <span class="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-900 text-white" aria-hidden="true">
        <app-icon name="pin" [size]="22" />
      </span>
      <span class="min-w-0">
        <span class="block truncate font-semibold text-ink group-hover:text-primary-700">{{ location().name }}</span>
        <span class="mt-0.5 block text-sm text-ink-muted">{{ countLabel() }}</span>
      </span>
    </a>
  `,
})
export class LocationCardComponent {
  readonly location = input.required<ShopLocation>();

  protected readonly countLabel = computed(() => anuncios(this.location().productsCount));
}
