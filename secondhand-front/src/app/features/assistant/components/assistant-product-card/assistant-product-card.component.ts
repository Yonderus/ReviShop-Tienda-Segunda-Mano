import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PricePipe } from '../../../../shared/utils/price.pipe';
import { ProductImageComponent } from '../../../products/components/product-image/product-image.component';
import { CONDITION_LABELS, Product } from '../../../products/models/product.model';
import { primaryImage } from '../../../products/models/product.utils';

/**
 * Tarjeta compacta de un producto dentro del chat. Sale de los datos de la API (no del texto del modelo), así que
 * el título, el precio y el enlace son siempre los reales.
 */
@Component({
  selector: 'app-assistant-product-card',
  standalone: true,
  imports: [RouterLink, PricePipe, ProductImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/shop', product().slug]"
      class="flex items-center gap-3 rounded-xl border border-line bg-surface p-2 transition-colors hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      (click)="opened.emit()"
    >
      <app-product-image class="size-14 shrink-0 rounded-lg" [src]="cover()?.url" [alt]="cover()?.alt || product().title" sizes="56px" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold text-ink">{{ product().title }}</span>
        <span class="mt-0.5 block text-xs text-ink-muted">
          {{ conditionLabels[product().condition] }}@if (product().location) { · {{ product().location }}}
        </span>
      </span>
      <span class="shrink-0 text-sm font-bold tabular-nums text-ink">{{ product().basePrice | price }}</span>
    </a>
  `,
})
export class AssistantProductCardComponent {
  readonly product = input.required<Product>();
  /** Al abrir la ficha (en el móvil, el panel se cierra para verla). */
  readonly opened = output<void>();

  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly cover = computed(() => primaryImage(this.product()));
}
