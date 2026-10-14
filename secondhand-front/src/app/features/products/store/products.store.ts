import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError, toApiError } from '../../../core/models/api-error.model';
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  Product,
  ProductCategory,
  ProductFilters,
  ProductInput,
  ProductStatus,
  ProductUpdate,
  STATUS_LABELS,
} from '../models/product.model';
import { ProductsService } from '../services/products.service';

export type DetailStatus = 'idle' | 'loading' | 'success' | 'not-found' | 'error';
export type CollectionKey = 'active' | 'inactive' | 'trash';

export interface Breakdown<K extends string> {
  key: K;
  label: string;
  count: number;
}

export function applyFilters(products: readonly Product[], filters: ProductFilters): Product[] {
  const { category, condition, status, minPrice, maxPrice, sort = 'recent' } = filters;
  const result = products.filter(
    (p) =>
      (!category || p.category === category) &&
      (!condition || p.condition === condition) &&
      (!status || p.status === status) &&
      (minPrice === undefined || p.price >= minPrice) &&
      (maxPrice === undefined || p.price <= maxPrice),
  );
  if (sort === 'price-asc') return result.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return result.sort((a, b) => b.price - a.price);
  return result.sort(byNewest);
}

const byNewest = (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt);
const byDeletedNewest = (a: Product, b: Product) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '');

/** Una lista remota con carga única, deduplicación de peticiones y mutaciones locales. */
class ProductCollection {
  private readonly _items = signal<Product[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private readonly _loaded = signal(false);
  private inFlight: Promise<void> | null = null;

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  constructor(
    private readonly fetch: () => Promise<Product[]>,
    private readonly order: (a: Product, b: Product) => number,
  ) {}

  load(force = false): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this._loaded() && !force) return Promise.resolve();
    this.inFlight = this.run();
    return this.inFlight;
  }

  find(predicate: (product: Product) => boolean): Product | undefined {
    return this._items().find(predicate);
  }

  /** Si la colección aún no se ha cargado no se toca: se pedirá completa cuando haga falta. */
  upsert(product: Product): void {
    if (!this._loaded()) return;
    this._items.update((list) => [product, ...list.filter((p) => p._id !== product._id)].sort(this.order));
  }

  remove(id: string): void {
    this._items.update((list) => list.filter((p) => p._id !== id));
  }

  private async run(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      this._items.set([...(await this.fetch())].sort(this.order));
      this._loaded.set(true);
    } catch (raw) {
      this._error.set(toApiError(raw));
    } finally {
      this._loading.set(false);
      this.inFlight = null;
    }
  }
}

@Injectable({ providedIn: 'root' })
export class ProductsStore {
  private readonly service = inject(ProductsService);

  private readonly collections: Record<CollectionKey, ProductCollection> = {
    active: new ProductCollection(() => firstValueFrom(this.service.list()), byNewest),
    inactive: new ProductCollection(() => firstValueFrom(this.service.listInactive()), byNewest),
    trash: new ProductCollection(() => firstValueFrom(this.service.listTrashed()), byDeletedNewest),
  };

  private readonly _selectedProduct = signal<Product | null>(null);
  private readonly _detailStatus = signal<DetailStatus>('idle');
  private readonly _detailError = signal<ApiError | null>(null);
  private readonly _saving = signal(false);
  private readonly _deletingId = signal<string | null>(null);
  private readonly _pendingIds = signal<ReadonlySet<string>>(new Set());

  // Catálogo público (colección de activos).
  readonly products = this.collections.active.items;
  readonly loading = this.collections.active.loading;
  readonly error = this.collections.active.error;
  readonly count = computed(() => this.products().length);
  readonly hasError = computed(() => this.error() !== null);
  readonly isEmpty = computed(() => this.collections.active.loaded() && this.products().length === 0);
  readonly availableProducts = computed(() => this.products().filter((p) => p.status === 'disponible'));

  readonly selectedProduct = this._selectedProduct.asReadonly();
  readonly detailStatus = this._detailStatus.asReadonly();
  readonly detailError = this._detailError.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly deletingId = this._deletingId.asReadonly();
  /** Productos con una mutación optimista o de restauración en curso. */
  readonly pendingIds = this._pendingIds.asReadonly();

  // Administración.
  readonly inactiveProducts = this.collections.inactive.items;
  readonly trashedProducts = this.collections.trash.items;
  readonly trashCount = computed(() => this.trashedProducts().length);
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

  readonly categoryBreakdown = computed<Breakdown<ProductCategory>[]>(() =>
    PRODUCT_CATEGORIES.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      count: this.liveProducts().filter((p) => p.category === key).length,
    }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count),
  );

  readonly recentProducts = computed(() => [...this.liveProducts()].sort(byNewest).slice(0, 5));

  private readonly detailInFlight = new Map<string, Promise<Product>>();
  /** Productos pedidos por slug que aún no están en ninguna lista (p. ej. entrada directa al detalle). */
  private readonly detailCache = new Map<string, Product>();
  private currentSlug: string | null = null;

  collection(key: CollectionKey) {
    const { items, loading, error, loaded } = this.collections[key];
    return { items, loading, error, loaded };
  }

  loadCollection(key: CollectionKey, options: { force?: boolean } = {}): Promise<void> {
    return this.collections[key].load(options.force);
  }

  loadAll(options: { force?: boolean } = {}): Promise<void> {
    return this.loadCollection('active', options);
  }

  loadDashboard(options: { force?: boolean } = {}): Promise<unknown> {
    return Promise.all((Object.keys(this.collections) as CollectionKey[]).map((key) => this.loadCollection(key, options)));
  }

  filteredBy(filters: Signal<ProductFilters>): Signal<Product[]> {
    return computed(() => applyFilters(this.products(), filters()));
  }

  async loadBySlug(slug: string): Promise<Product | null> {
    this.currentSlug = slug;
    const cached = this.findCached(slug);
    if (cached) {
      this.select(cached);
      return cached;
    }

    this._selectedProduct.set(null);
    this._detailError.set(null);
    this._detailStatus.set('loading');

    let request = this.detailInFlight.get(slug);
    if (!request) {
      request = firstValueFrom(this.service.getBySlug(slug));
      this.detailInFlight.set(slug, request);
    }

    try {
      const product = await request;
      this.detailCache.set(product.slug, product);
      if (this.currentSlug === slug) this.select(product);
      return product;
    } catch (raw) {
      const error = toApiError(raw);
      if (this.currentSlug === slug) {
        this._detailError.set(error);
        this._detailStatus.set(error.isNotFound ? 'not-found' : 'error');
      }
      return null;
    } finally {
      this.detailInFlight.delete(slug);
    }
  }

  async create(input: ProductInput): Promise<Product> {
    this._saving.set(true);
    try {
      const product = await firstValueFrom(this.service.create(input));
      this.placeLive(product);
      this.select(product);
      return product;
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this._saving.set(false);
    }
  }

  async update(product: Product, changes: ProductUpdate): Promise<Product> {
    this._saving.set(true);
    try {
      const updated = await firstValueFrom(this.service.update(product._id, changes));
      this.detailCache.delete(product.slug);
      this.placeLive(updated);
      this.select(updated);
      return updated;
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this._saving.set(false);
    }
  }

  /** Optimista: la UI cambia al instante y se revierte si la API falla. */
  async setActive(product: Product, isActive: boolean): Promise<Product> {
    if (product.isActive === isActive || this._pendingIds().has(product._id)) return product;

    const optimistic: Product = { ...product, isActive };
    this.setPending(product._id, true);
    this.placeLive(optimistic);

    try {
      const updated = await firstValueFrom(this.service.setActive(product._id, isActive));
      this.placeLive(updated);
      return updated;
    } catch (raw) {
      this.placeLive(product);
      throw toApiError(raw);
    } finally {
      this.setPending(product._id, false);
    }
  }

  /** Soft delete: el producto pasa a la papelera con fecha de borrado. */
  async remove(product: Product): Promise<void> {
    this._deletingId.set(product._id);
    try {
      await firstValueFrom(this.service.remove(product._id), { defaultValue: undefined });
      this.collections.active.remove(product._id);
      this.collections.inactive.remove(product._id);
      this.collections.trash.upsert({ ...product, isActive: false, deletedAt: new Date().toISOString() });
      this.detailCache.delete(product.slug);
      if (this._selectedProduct()?._id === product._id) this.clearSelected();
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this._deletingId.set(null);
    }
  }

  async restore(product: Product, isActive: boolean): Promise<Product> {
    this.setPending(product._id, true);
    try {
      const restored = await firstValueFrom(this.service.restore(product._id, isActive));
      this.collections.trash.remove(product._id);
      this.placeLive(restored);
      return restored;
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this.setPending(product._id, false);
    }
  }

  clearSelected(): void {
    this.currentSlug = null;
    this._selectedProduct.set(null);
    this._detailError.set(null);
    this._detailStatus.set('idle');
  }

  /** Coloca un producto no eliminado en la colección que le corresponde según isActive. */
  private placeLive(product: Product): void {
    const [target, other] = product.isActive
      ? [this.collections.active, this.collections.inactive]
      : [this.collections.inactive, this.collections.active];
    other.remove(product._id);
    if (target.loaded()) target.upsert(product);
    else this.detailCache.set(product.slug, product);
    if (this._selectedProduct()?._id === product._id) this._selectedProduct.set(product);
  }

  private setPending(id: string, pending: boolean): void {
    this._pendingIds.update((set) => {
      const next = new Set(set);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private findCached(slug: string): Product | undefined {
    const bySlug = (p: Product) => p.slug === slug;
    return this.collections.active.find(bySlug) ?? this.collections.inactive.find(bySlug) ?? this.detailCache.get(slug);
  }

  private select(product: Product): void {
    this._selectedProduct.set(product);
    this._detailError.set(null);
    this._detailStatus.set('success');
  }
}
