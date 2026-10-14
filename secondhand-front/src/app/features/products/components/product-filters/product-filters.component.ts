import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { LevelMeterComponent } from '../../../../shared/ui/level-meter.component';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  CONDITION_LEVEL,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_STATUSES,
  ProductFilters,
  STATUS_LABELS,
} from '../../models/product.model';

type FilterKey = keyof ProductFilters;

@Component({
  selector: 'app-product-filters',
  standalone: true,
  imports: [IconComponent, LevelMeterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5" aria-labelledby="filters-title">
      <div class="flex items-center justify-between gap-3">
        <h2 id="filters-title" class="flex items-center gap-2 text-sm font-semibold text-ink">
          <app-icon name="sliders" [size]="18" class="text-primary-600" />
          Filtrar anuncios
          @if (activeCount()) {
            <span class="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">{{ activeCount() }}</span>
          }
        </h2>
        <div class="flex items-center gap-1">
          @if (activeCount()) {
            <button type="button" class="btn btn-ghost min-h-9 px-3" (click)="filtersChange.emit({ sort: filters().sort })">
              Limpiar
            </button>
          }
          <button
            type="button"
            class="btn btn-secondary min-h-9 px-3 md:hidden"
            [attr.aria-expanded]="expanded()"
            aria-controls="filters-panel"
            (click)="expanded.set(!expanded())"
          >
            {{ expanded() ? 'Ocultar' : 'Mostrar' }}
          </button>
        </div>
      </div>

      <div
        id="filters-panel"
        class="mt-4 grid-cols-2 gap-3 md:grid md:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)_minmax(0,1fr)]"
        [class.grid]="expanded()"
        [class.hidden]="!expanded()"
      >
        <div>
          <label for="f-category" class="field-label">Categoría</label>
          <select id="f-category" class="field-control" (change)="set('category', $event)">
            <option value="" [selected]="!filters().category">Todas</option>
            @for (c of categories; track c) {
              <option [value]="c" [selected]="filters().category === c">{{ categoryLabels[c] }}</option>
            }
          </select>
        </div>
        <div>
          <div class="flex items-center justify-between gap-2">
            <label for="f-condition" class="field-label">Condición</label>
            @if (filters().condition; as c) {
              <app-level-meter class="mb-1.5" [value]="conditionLevel[c]" [label]="conditionLabels[c]" caption="Condición filtrada" [showLabel]="false" />
            }
          </div>
          <select id="f-condition" class="field-control" (change)="set('condition', $event)">
            <option value="" [selected]="!filters().condition">Cualquiera</option>
            @for (c of conditions; track c) {
              <option [value]="c" [selected]="filters().condition === c">{{ conditionLabels[c] }}</option>
            }
          </select>
        </div>
        <div>
          <label for="f-status" class="field-label">Estado</label>
          <select id="f-status" class="field-control" (change)="set('status', $event)">
            <option value="" [selected]="!filters().status">Todos</option>
            @for (s of statuses; track s) {
              <option [value]="s" [selected]="filters().status === s">{{ statusLabels[s] }}</option>
            }
          </select>
        </div>
        <fieldset class="col-span-2 lg:col-span-1">
          <legend class="field-label">Precio (€)</legend>
          <div class="flex items-center gap-2">
            <label for="f-min" class="sr-only">Precio mínimo</label>
            <input id="f-min" type="number" min="0" inputmode="decimal" placeholder="Mín." class="field-control tabular-nums"
              [value]="filters().minPrice ?? ''" (change)="set('minPrice', $event)" />
            <span class="text-ink-muted" aria-hidden="true">–</span>
            <label for="f-max" class="sr-only">Precio máximo</label>
            <input id="f-max" type="number" min="0" inputmode="decimal" placeholder="Máx." class="field-control tabular-nums"
              [value]="filters().maxPrice ?? ''" (change)="set('maxPrice', $event)" />
          </div>
        </fieldset>
        <div class="col-span-2 md:col-span-1">
          <label for="f-sort" class="field-label">Ordenar por</label>
          <select id="f-sort" class="field-control" [value]="filters().sort ?? 'recent'" (change)="set('sort', $event)">
            <option value="recent">Más recientes</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>
    </section>
  `,
})
export class ProductFiltersComponent {
  readonly filters = input.required<ProductFilters>();
  readonly filtersChange = output<ProductFilters>();

  protected readonly expanded = signal(false);
  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly conditions = PRODUCT_CONDITIONS;
  protected readonly statuses = PRODUCT_STATUSES;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly conditionLevel = CONDITION_LEVEL;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly activeCount = computed(() => {
    const { category, condition, status, minPrice, maxPrice } = this.filters();
    return [category, condition, status, minPrice, maxPrice].filter((v) => v !== undefined).length;
  });

  protected set(key: FilterKey, event: Event): void {
    const raw = (event.target as HTMLInputElement | HTMLSelectElement).value.trim();
    this.filtersChange.emit({ ...this.filters(), [key]: raw === '' ? undefined : raw });
  }
}
