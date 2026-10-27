import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { EntityStore, byNewest } from '../../../core/store/entity.store';
import { toApiError } from '../../../core/models/api-error.model';
import {
  PRODUCT_STATUSES,
  Product,
  ProductFilters,
  ProductInput,
  ProductStatus,
  STATUS_LABELS,
} from '../models/product.model';
import { ProductVariant, VariantInput } from '../models/product-variant.model';
import { ProductsService } from '../services/products.service';
import { VariantsService } from '../services/variants.service';

export interface Breakdown<K extends string> {
  key: K;
  label: string;
  count: number;
}

/** `categoryScope`: slugs válidos para el filtro de categoría (la categoría y sus subcategorías). */
export function applyFilters(
  products: readonly Product[],
  filters: ProductFilters,
  categoryScope: ReadonlySet<string> | null = null,
): Product[] {
  const { category, condition, status, minPrice, maxPrice, sort = 'recent' } = filters;
  const scope = category ? (categoryScope ?? new Set([category])) : null;
  const result = products.filter(
    (p) =>
      (!scope || scope.has(p.category?.slug)) &&
      (!condition || p.condition === condition) &&
      (!status || p.status === status) &&
      (minPrice === undefined || p.basePrice >= minPrice) &&
      (maxPrice === undefined || p.basePrice <= maxPrice),
  );
  if (sort === 'price-asc') return result.sort((a, b) => a.basePrice - b.basePrice);
  if (sort === 'price-desc') return result.sort((a, b) => b.basePrice - a.basePrice);
  return result.sort(byNewest);
}

/**
 * Carga, detalle, escrituras y visibilidad optimista vienen de EntityStore. Aquí solo lo propio de
 * productos: el catálogo público con sus filtros, el estado de venta y las estadísticas del resumen.
 */
@Injectable({ providedIn: 'root' })
export class ProductsStore extends EntityStore<Product, ProductInput> {
  protected readonly api = inject(ProductsService);
  private readonly variants = inject(VariantsService);

  // Catálogo público (colección de activos).
  readonly products = this.collections.active.items;
  readonly loading = this.collections.active.loading;
  readonly error = this.collections.active.error;
  readonly count = computed(() => this.products().length);
  readonly hasError = computed(() => this.error() !== null);
  readonly isEmpty = computed(() => this.collections.active.loaded() && this.products().length === 0);
  readonly availableProducts = computed(() => this.products().filter((p) => p.status === 'disponible'));

  // Resumen del panel.
  readonly inactiveProducts = this.collections.inactive.items;
  readonly trashedProducts = this.collections.trash.items;
  readonly statsReady = computed(() => Object.values(this.collections).every((c) => c.loaded()));

  private readonly liveProducts = computed(() => [...this.products(), ...this.inactiveProducts()]);

  readonly stats = computed(() => {
    const live = this.liveProducts();
    return {
      published: live.length,
      active: this.products().length,
      inactive: this.inactiveProducts().length,
      trashed: this.trashCount(),
      reserved: live.filter((p) => p.status === 'reservado').length,
      sold: live.filter((p) => p.status === 'vendido').length,
    };
  });

  readonly statusBreakdown = computed<Breakdown<ProductStatus>[]>(() =>
    PRODUCT_STATUSES.map((key) => ({
      key,
      label: STATUS_LABELS[key],
      count: this.liveProducts().filter((p) => p.status === key).length,
    })),
  );

  /** Agrupado por la categoría poblada de cada producto (nombre real de la API, no constantes). */
  readonly categoryBreakdown = computed<Breakdown<string>[]>(() => {
    const rows = new Map<string, Breakdown<string>>();
    for (const p of this.liveProducts()) {
      const key = p.category?.slug ?? 'sin-categoria';
      const row = rows.get(key) ?? { key, label: p.category?.name ?? 'Sin categoría', count: 0 };
      row.count++;
      rows.set(key, row);
    }
    return [...rows.values()].sort((a, b) => b.count - a.count);
  });

  readonly recentProducts = computed(() => [...this.liveProducts()].sort(byNewest).slice(0, 5));

  /** Los listados traen un resumen (solo la portada y sin variantes); el detalle trae `variants`. */
  protected override isComplete(product: Product): boolean {
    return product.variants !== undefined;
  }

  /** El catálogo público solo necesita los activos. */
  loadAll(options: { force?: boolean } = {}): Promise<void> {
    return this.loadCollection('active', options);
  }

  filteredBy(filters: Signal<ProductFilters>, categoryScope?: Signal<ReadonlySet<string> | null>): Signal<Product[]> {
    return computed(() => applyFilters(this.products(), filters(), categoryScope?.() ?? null));
  }

  // Variantes. Después de cada cambio se vuelve a pedir el producto: su estado y su nº de variantes los
  // calcula la API a partir de ellas.

  private readonly _variantPendingIds = signal<ReadonlySet<string>>(new Set());
  /** Variantes con una operación en curso (para deshabilitar su fila). */
  readonly variantPendingIds = this._variantPendingIds.asReadonly();

  createVariant(product: Product, input: VariantInput): Promise<Product> {
    return this.withVariant(product, null, () => this.variants.create(product._id, input));
  }

  updateVariant(product: Product, variant: ProductVariant, changes: Pick<VariantInput, 'price' | 'stock'>): Promise<Product> {
    return this.withVariant(product, variant._id, () => this.variants.update(variant._id, changes));
  }

  changeVariantStatus(product: Product, variant: ProductVariant, status: ProductStatus): Promise<Product> {
    return this.withVariant(product, variant._id, () => this.variants.changeStatus(variant._id, status));
  }

  setVariantActive(product: Product, variant: ProductVariant, isActive: boolean): Promise<Product> {
    return this.withVariant(product, variant._id, () => this.variants.setActive(variant._id, isActive));
  }

  removeVariant(product: Product, variant: ProductVariant): Promise<Product> {
    return this.withVariant(product, variant._id, () => this.variants.remove(variant._id));
  }

  private async withVariant(product: Product, variantId: string | null, call: () => Promise<unknown>): Promise<Product> {
    const key = variantId ?? 'new';
    this._variantPendingIds.update((ids) => new Set(ids).add(key));
    try {
      await call();
      return await this.reload(product.slug);
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this._variantPendingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(key);
        return next;
      });
    }
  }

  /** Optimista: el estado de venta cambia al instante y se revierte si la API falla. */
  async changeStatus(product: Product, status: ProductStatus): Promise<Product> {
    if (product.status === status || this.isPending(product._id)) return product;

    this.setPending(product._id, true);
    this.placeLive({ ...product, status });

    try {
      const updated = await this.api.changeStatus(product._id, status);
      this.placeLive(updated);
      return updated;
    } catch (raw) {
      this.placeLive(product);
      throw toApiError(raw);
    } finally {
      this.setPending(product._id, false);
    }
  }
}
