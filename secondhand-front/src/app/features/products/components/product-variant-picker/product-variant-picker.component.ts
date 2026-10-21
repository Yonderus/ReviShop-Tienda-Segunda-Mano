import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { PricePipe } from '../../../../shared/utils/price.pipe';
import { ProductVariant } from '../../models/product-variant.model';
import { STATUS_LABELS, STATUS_TONES } from '../../models/product.model';
import { variantLabel } from '../../models/product.utils';

/** Radiogroup accesible: elegir variante cambia el precio y la disponibilidad del detalle. */
@Component({
  selector: 'app-product-variant-picker',
  standalone: true,
  imports: [PricePipe, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend class="text-sm font-semibold text-ink">Elige una opción</legend>
      <div class="mt-3 space-y-2" role="radiogroup" aria-label="Variantes disponibles">
        @for (variant of variants(); track variant._id) {
          <label
            class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150"
            [class.border-primary-600]="variant._id === selectedId()"
            [class.bg-primary-50]="variant._id === selectedId()"
            [class.ring-1]="variant._id === selectedId()"
            [class.ring-primary-600]="variant._id === selectedId()"
            [class.border-line]="variant._id !== selectedId()"
            [class.hover:border-primary-200]="variant._id !== selectedId()"
          >
            <input
              type="radio"
              name="variant"
              class="peer sr-only"
              [value]="variant._id"
              [checked]="variant._id === selectedId()"
              [disabled]="variant.status === 'vendido'"
              (change)="selected.emit(variant)"
            />
            <span class="text-sm font-medium text-ink peer-disabled:text-ink-muted peer-disabled:line-through">
              {{ label(variant) }}
            </span>
            <span class="flex items-center gap-3">
              <span class="text-sm font-semibold tabular-nums text-ink">{{ priceOf(variant) | price }}</span>
              <app-badge [tone]="statusTones[variant.status]">{{ statusLabels[variant.status] }}</app-badge>
            </span>
          </label>
        }
      </div>
    </fieldset>
  `,
})
export class ProductVariantPickerComponent {
  readonly variants = input.required<ProductVariant[]>();
  readonly selectedId = input<string>();
  readonly basePrice = input.required<number>();
  readonly selected = output<ProductVariant>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;
  protected readonly label = variantLabel;

  protected priceOf(variant: ProductVariant): number {
    return variant.price ?? this.basePrice();
  }
}
