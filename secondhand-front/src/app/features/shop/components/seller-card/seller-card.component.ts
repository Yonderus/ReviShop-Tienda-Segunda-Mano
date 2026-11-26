import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../../../../shared/ui/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ShopSeller } from '../../models/shop.model';
import { anuncios } from '../category-card/category-card.component';

/** Card de vendedor del Home: su foto (o iniciales), dónde está y cuánto vende; lleva a su perfil (valoraciones y anuncios). */
@Component({
  selector: 'app-seller-card',
  standalone: true,
  imports: [RouterLink, AvatarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <a
      [routerLink]="['/sellers', seller().slug]"
      class="group flex h-full flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-center shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <app-avatar size="lg" [name]="seller().name" [src]="seller().avatarUrl" />
      <span class="w-full min-w-0">
        <span class="block truncate font-semibold text-ink group-hover:text-primary-700">{{ seller().name }}</span>
        @if (seller().location) {
          <span class="mt-0.5 flex items-center justify-center gap-1 text-sm text-ink-muted">
            <app-icon name="pin" [size]="14" />
            {{ seller().location }}
          </span>
        }
        <span class="mt-2 inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-strong">{{ countLabel() }}</span>
      </span>
    </a>
  `,
})
export class SellerCardComponent {
  readonly seller = input.required<ShopSeller>();

  protected readonly countLabel = computed(() => anuncios(this.seller().productsCount));
}
