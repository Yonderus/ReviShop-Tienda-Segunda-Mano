import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ApiError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ToggleSwitchComponent } from '../../../../shared/ui/toggle-switch.component';
import { PricePipe } from '../../../../shared/utils/price.pipe';
import { CatalogStore } from '../../../catalog/store/catalog.store';
import { ProductVariant } from '../../models/product-variant.model';
import { PRODUCT_STATUSES, Product, ProductStatus, STATUS_LABELS } from '../../models/product.model';
import { variantLabel } from '../../models/product.utils';
import { ProductsStore } from '../../store/products.store';

interface Draft {
  price: string;
  stock: string;
}

/** "" = precio base (null); si no, número ≥ 0 con hasta 2 decimales. Devuelve undefined si no es válido. */
function parsePrice(text: string): number | null | undefined {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 && /^\d+(\.\d{1,2})?$/.test(text.trim()) ? value : undefined;
}

function parseStock(text: string): number | undefined {
  const value = Number(text);
  return text.trim() !== '' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

const errorMessages = (error: unknown): string[] =>
  error instanceof ApiError ? (error.errors.length ? error.errors.map((e) => e.message) : [error.message]) : [];

/**
 * Gestión de las variantes de un producto en el panel: precio, stock, estado de venta, visibilidad y borrado
 * de cada una, y alta de variantes nuevas con los atributos de su categoría.
 */
@Component({
  selector: 'app-product-variants-editor',
  standalone: true,
  imports: [IconComponent, ToggleSwitchComponent, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="variantes" class="scroll-mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="ve-title">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ve-title" class="text-base font-semibold text-ink">Variantes</h2>
        <span class="text-xs tabular-nums text-ink-muted">{{ variants().length }} {{ variants().length === 1 ? 'variante' : 'variantes' }}</span>
      </div>
      <p class="field-hint mt-1">
        Cada variante tiene su propio precio, stock y estado de venta. El estado del producto se calcula a partir de ellas.
      </p>

      <ul class="mt-4 space-y-3" aria-label="Variantes del producto">
        @for (variant of variants(); track variant._id) {
          <li class="rounded-xl border border-line p-3.5" [class.opacity-60]="busy(variant._id)" [class.bg-canvas]="!variant.isActive">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium text-ink">{{ label(variant) }}</p>
                <p class="truncate font-mono text-xs text-ink-muted">{{ variant.sku }}</p>
              </div>
              <div class="flex items-center gap-1">
                <app-toggle-switch
                  [checked]="variant.isActive"
                  [busy]="busy(variant._id)"
                  [label]="'Variante activa: ' + label(variant)"
                  (toggled)="setActive(variant, $event)"
                />
                <button
                  type="button"
                  class="icon-btn hover:!bg-red-50 hover:!text-red-700"
                  [attr.aria-label]="'Eliminar la variante ' + label(variant)"
                  [title]="canDelete() ? 'Eliminar variante' : 'Un producto necesita al menos una variante'"
                  [disabled]="!canDelete() || busy(variant._id)"
                  (click)="remove(variant)"
                >
                  <app-icon name="trash" [size]="18" />
                </button>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto] sm:items-end">
              <div>
                <label class="field-label" [for]="'ve-price-' + variant._id">Precio (€)</label>
                <input
                  [id]="'ve-price-' + variant._id"
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  class="field-control tabular-nums"
                  [placeholder]="'Base: ' + product().basePrice"
                  [value]="draftOf(variant).price"
                  (input)="edit(variant, 'price', $any($event.target).value)"
                />
              </div>
              <div>
                <label class="field-label" [for]="'ve-stock-' + variant._id">Stock</label>
                <input
                  [id]="'ve-stock-' + variant._id"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  class="field-control tabular-nums"
                  [value]="draftOf(variant).stock"
                  (input)="edit(variant, 'stock', $any($event.target).value)"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="field-label" [for]="'ve-status-' + variant._id">Estado de venta</label>
                <select
                  [id]="'ve-status-' + variant._id"
                  class="field-control"
                  [disabled]="busy(variant._id)"
                  (change)="changeStatus(variant, $any($event.target).value)"
                >
                  @for (s of statuses; track s) {
                    <option [value]="s" [selected]="s === variant.status">{{ statusLabels[s] }}</option>
                  }
                </select>
              </div>
              @if (isDirty(variant)) {
                <div class="col-span-2 flex gap-2 sm:col-span-1">
                  <button type="button" class="btn btn-primary min-h-10 px-3" [disabled]="busy(variant._id)" (click)="save(variant)">Guardar</button>
                  <button type="button" class="btn btn-ghost min-h-10 px-3" (click)="discard(variant)">Descartar</button>
                </div>
              }
            </div>
            @if (variant.price === null && !isDirty(variant)) {
              <p class="field-hint mt-2">Usa el precio base del producto: {{ product().basePrice | price }}.</p>
            }
            @for (message of rowErrors()[variant._id] ?? []; track $index) {
              <p class="mt-2 text-sm font-medium text-red-700" role="alert">{{ message }}</p>
            }
          </li>
        }
      </ul>

      <div class="mt-6 border-t border-line pt-5">
        <h3 class="text-sm font-semibold text-ink">Añadir variante</h3>
        @if (attributes().length === 0) {
          <p class="field-hint mt-1">
            La categoría de este producto no tiene atributos (como talla o capacidad), así que no admite variantes.
          </p>
        } @else {
          <p class="field-hint mt-1">
            @if (onlyDefault()) {
              Ahora tiene una variante única. La primera que añadas con opciones la sustituirá.
            } @else {
              Elige al menos una opción. Si coincide con una variante eliminada, se recupera.
            }
          </p>
          <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            @for (attribute of attributes(); track attribute.key) {
              <div>
                <label class="field-label" [for]="'ve-new-' + attribute.key">{{ attribute.label }}</label>
                @if (attribute.values.length) {
                  <select [id]="'ve-new-' + attribute.key" class="field-control" (change)="setOption(attribute.key, $any($event.target).value)">
                    <option value="" [selected]="!newOptions()[attribute.key]">Sin {{ attribute.label.toLowerCase() }}</option>
                    @for (value of attribute.values; track value) {
                      <option [value]="value" [selected]="newOptions()[attribute.key] === value">{{ value }}</option>
                    }
                  </select>
                } @else {
                  <input
                    [id]="'ve-new-' + attribute.key"
                    type="text"
                    class="field-control"
                    [value]="newOptions()[attribute.key] ?? ''"
                    (input)="setOption(attribute.key, $any($event.target).value)"
                  />
                }
              </div>
            }
            <div>
              <label class="field-label" for="ve-new-price">Precio (€)</label>
              <input
                id="ve-new-price"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                class="field-control tabular-nums"
                [placeholder]="'Base: ' + product().basePrice"
                [value]="newPrice()"
                (input)="newPrice.set($any($event.target).value)"
              />
            </div>
            <div>
              <label class="field-label" for="ve-new-stock">Stock</label>
              <input
                id="ve-new-stock"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                class="field-control tabular-nums"
                [value]="newStock()"
                (input)="newStock.set($any($event.target).value)"
              />
            </div>
          </div>
          @for (message of addErrors(); track $index) {
            <p class="mt-2 text-sm font-medium text-red-700" role="alert">{{ message }}</p>
          }
          <button type="button" class="btn btn-secondary mt-4" [disabled]="busy('new')" (click)="add()">
            <app-icon name="plus" [size]="18" />
            Añadir variante
          </button>
        }
      </div>
    </section>
  `,
})
export class ProductVariantsEditorComponent {
  private readonly store = inject(ProductsStore);
  private readonly catalog = inject(CatalogStore);
  private readonly alert = inject(AlertService);

  readonly product = input.required<Product>();

  protected readonly statuses = PRODUCT_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly label = variantLabel;

  protected readonly variants = computed(() => this.product().variants ?? []);
  protected readonly attributes = computed(() => this.catalog.attributesFor(this.product().categoryId));
  protected readonly canDelete = computed(() => this.variants().length > 1);
  protected readonly onlyDefault = computed(() => this.variants().length === 1 && this.variants()[0].options.length === 0);

  private readonly drafts = signal<Record<string, Draft>>({});
  protected readonly rowErrors = signal<Partial<Record<string, string[]>>>({});

  protected readonly newOptions = signal<Partial<Record<string, string>>>({});
  protected readonly newPrice = signal('');
  protected readonly newStock = signal('1');
  protected readonly addErrors = signal<string[]>([]);

  constructor() {
    void this.catalog.load();
  }

  protected busy(id: string): boolean {
    return this.store.variantPendingIds().has(id);
  }

  protected draftOf(variant: ProductVariant): Draft {
    return this.drafts()[variant._id] ?? { price: variant.price === null ? '' : String(variant.price), stock: String(variant.stock) };
  }

  protected isDirty(variant: ProductVariant): boolean {
    return variant._id in this.drafts();
  }

  protected edit(variant: ProductVariant, field: keyof Draft, value: string): void {
    this.drafts.update((all) => ({ ...all, [variant._id]: { ...this.draftOf(variant), [field]: value } }));
  }

  protected discard(variant: ProductVariant): void {
    this.drafts.update(({ [variant._id]: _removed, ...rest }) => rest);
    this.setRowErrors(variant, []);
  }

  protected async save(variant: ProductVariant): Promise<void> {
    const draft = this.draftOf(variant);
    const price = parsePrice(draft.price);
    const stock = parseStock(draft.stock);
    const errors = [
      ...(price === undefined ? ['El precio debe ser un número mayor o igual que 0, con hasta 2 decimales (vacío = precio base).'] : []),
      ...(stock === undefined ? ['El stock debe ser un número entero mayor o igual que 0.'] : []),
    ];
    this.setRowErrors(variant, errors);
    if (errors.length) return;

    try {
      await this.store.updateVariant(this.product(), variant, { price, stock });
      this.discard(variant);
      void this.alert.success(`"${this.label(variant)}" actualizada`);
    } catch (error) {
      this.setRowErrors(variant, errorMessages(error));
    }
  }

  protected async changeStatus(variant: ProductVariant, status: string): Promise<void> {
    if (status === variant.status) return;
    try {
      await this.store.changeVariantStatus(this.product(), variant, status as ProductStatus);
      void this.alert.success(`"${this.label(variant)}" pasa a ${STATUS_LABELS[status as ProductStatus]}`);
    } catch {
      // El errorInterceptor ya ha mostrado el aviso.
    }
  }

  protected async setActive(variant: ProductVariant, isActive: boolean): Promise<void> {
    try {
      await this.store.setVariantActive(this.product(), variant, isActive);
    } catch {
      // El errorInterceptor ya ha mostrado el aviso.
    }
  }

  protected async remove(variant: ProductVariant): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿Eliminar esta variante?',
      text: `"${this.label(variant)}" (${variant.sku}) pasará a la papelera. Si vuelves a crearla con las mismas opciones, se recupera.`,
      confirmText: 'Eliminar variante',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await this.store.removeVariant(this.product(), variant);
      void this.alert.success('Variante eliminada');
    } catch {
      // El errorInterceptor ya ha mostrado el aviso.
    }
  }

  protected setOption(key: string, value: string): void {
    this.newOptions.update((all) => ({ ...all, [key]: value.trim() }));
  }

  protected async add(): Promise<void> {
    const chosen = this.newOptions();
    const options = this.attributes().flatMap((attribute) => {
      const value = chosen[attribute.key];
      return value ? [{ key: attribute.key, value }] : [];
    });
    const price = parsePrice(this.newPrice());
    const stock = parseStock(this.newStock());
    const errors = [
      ...(options.length === 0 ? ['Elige al menos una opción.'] : []),
      ...(price === undefined ? ['El precio debe ser un número mayor o igual que 0, con hasta 2 decimales (vacío = precio base).'] : []),
      ...(stock === undefined ? ['El stock debe ser un número entero mayor o igual que 0.'] : []),
    ];
    this.addErrors.set(errors);
    if (errors.length) return;

    try {
      await this.store.createVariant(this.product(), { options, price, stock });
      this.newOptions.set({});
      this.newPrice.set('');
      this.newStock.set('1');
      void this.alert.success('Variante añadida');
    } catch (error) {
      this.addErrors.set(errorMessages(error));
    }
  }

  private setRowErrors(variant: ProductVariant, errors: string[]): void {
    this.rowErrors.update((all) => ({ ...all, [variant._id]: errors }));
  }
}
