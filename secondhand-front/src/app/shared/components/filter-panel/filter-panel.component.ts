import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../ui/icon.component';

export interface FilterOption {
  value: string;
  label: string;
  /** Cuántos resultados tiene (se muestra entre paréntesis si llega). */
  count?: number;
}

/** Un grupo de opciones que se pueden marcar varias a la vez (se combinan con O). */
export interface FilterGroup {
  key: string;
  label: string;
  options: readonly FilterOption[];
}

export interface PriceRange {
  min: number | null;
  max: number | null;
}

/**
 * Panel de filtros genérico: grupos de chips (selección múltiple) y, opcionalmente, un rango de precio.
 * No sabe de productos: recibe la configuración y lo seleccionado, y emite los cambios. En móvil se pliega
 * detrás de un botón "Filtros (n)".
 */
@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-2xl border border-line bg-surface shadow-card" aria-labelledby="filters-title">
      <div class="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 id="filters-title" class="flex items-center gap-2 text-sm font-semibold text-ink">
          <app-icon name="sliders" [size]="18" class="text-primary-600" />
          Filtros
          @if (activeCount()) {
            <span class="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">{{ activeCount() }}</span>
          }
        </h2>
        <div class="flex items-center gap-2">
          @if (activeCount()) {
            <button type="button" class="text-sm font-medium text-primary-700 hover:underline" (click)="clear.emit()">Limpiar filtros</button>
          }
          <button
            type="button"
            class="icon-btn lg:hidden"
            [attr.aria-expanded]="open()"
            aria-controls="filters-body"
            [attr.aria-label]="open() ? 'Ocultar filtros' : 'Mostrar filtros'"
            (click)="open.set(!open())"
          >
            <app-icon [name]="open() ? 'close' : 'sliders'" [size]="18" />
          </button>
        </div>
      </div>

      <div id="filters-body" class="space-y-5 border-t border-line px-4 py-4 sm:px-5 lg:block" [class.hidden]="!open()">
        @for (group of groups(); track group.key) {
          @if (group.options.length) {
            <fieldset>
              <legend class="field-label">{{ group.label }}</legend>
              <div class="flex flex-wrap gap-2">
                @for (option of group.options; track option.value) {
                  <button
                    type="button"
                    class="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors"
                    [class]="isSelected(group.key, option.value) ? 'border-primary-600 bg-primary-600 text-white' : 'border-line bg-surface text-ink hover:border-primary-300 hover:bg-primary-50'"
                    [attr.aria-pressed]="isSelected(group.key, option.value)"
                    (click)="toggleOption(group.key, option.value)"
                  >
                    {{ option.label }}
                    @if (option.count !== undefined) {
                      <span class="tabular-nums opacity-75">({{ option.count }})</span>
                    }
                  </button>
                }
              </div>
            </fieldset>
          }
        }

        @if (price(); as range) {
          <fieldset>
            <legend class="field-label">Precio (€)</legend>
            <div class="flex items-center gap-2">
              <label for="filter-min-price" class="sr-only">Precio mínimo</label>
              <input #minInput id="filter-min-price" type="number" min="0" inputmode="decimal" placeholder="Mín." class="field-control tabular-nums"
                [value]="range.min ?? ''" (change)="changePrice(minInput.value, maxInput.value)" />
              <span class="text-ink-muted" aria-hidden="true">–</span>
              <label for="filter-max-price" class="sr-only">Precio máximo</label>
              <input #maxInput id="filter-max-price" type="number" min="0" inputmode="decimal" placeholder="Máx." class="field-control tabular-nums"
                [value]="range.max ?? ''" (change)="changePrice(minInput.value, maxInput.value)" />
            </div>
            @if (range.min !== null && range.max !== null && range.min > range.max) {
              <p class="mt-1.5 text-sm font-medium text-red-700" role="alert">El mínimo no puede ser mayor que el máximo.</p>
            }
          </fieldset>
        }
      </div>
    </section>
  `,
})
export class FilterPanelComponent {
  readonly groups = input.required<readonly FilterGroup[]>();
  readonly selected = input.required<Readonly<Record<string, readonly string[]>>>();
  /** Sin rango (`null`), no se pinta el precio. */
  readonly price = input<PriceRange | null>(null);
  readonly toggle = output<{ key: string; values: string[] }>();
  readonly priceChange = output<PriceRange>();
  readonly clear = output<void>();

  /** Solo en móvil: en escritorio el panel está siempre abierto. */
  protected readonly open = signal(false);

  protected readonly activeCount = computed(() => {
    const chips = Object.values(this.selected()).reduce((sum, values) => sum + values.length, 0);
    const range = this.price();
    return chips + (range?.min !== null && range?.min !== undefined ? 1 : 0) + (range?.max !== null && range?.max !== undefined ? 1 : 0);
  });

  protected isSelected(key: string, value: string): boolean {
    return this.selected()[key]?.includes(value) ?? false;
  }

  protected toggleOption(key: string, value: string): void {
    const current = this.selected()[key] ?? [];
    const values = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    this.toggle.emit({ key, values });
  }

  /**
   * Se leen los dos campos a la vez (y no el valor que llegó por `price`): si se cambian seguidos, el segundo
   * cambio aún no tendría el primero.
   */
  protected changePrice(rawMin: string, rawMax: string): void {
    this.priceChange.emit({ min: parsePrice(rawMin), max: parsePrice(rawMax) });
  }
}

/** Vacío, negativo o no numérico = sin límite. */
function parsePrice(raw: string): number | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
