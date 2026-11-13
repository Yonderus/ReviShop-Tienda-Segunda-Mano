import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError, isAbortError, toApiError } from '../../../core/models/api-error.model';
import { Product } from '../../products/models/product.model';
import { hasActiveFilters } from '../models/shop-query';
import { EMPTY_SHOP_FILTERS, ShopCategory, ShopFilters, ShopLocation, ShopPage, ShopSeller } from '../models/shop.model';
import { ShopService } from '../services/shop.service';

/**
 * Estado de la tienda, con Signals.
 *
 * - **Listado**: los filtros (los de la URL, que es la fuente de verdad), la página de productos, la carga y el
 *   error. `load()` cancela la petición anterior antes de lanzar la nueva (AbortController): una respuesta vieja
 *   nunca pisa a una nueva, aunque se cambie de filtro muy rápido.
 * - **Datos de los filtros** (categorías, vendedores y ubicaciones): se piden una vez y en paralelo, y los
 *   comparten el Home (carruseles) y el shop (filtros).
 */
@Injectable({ providedIn: 'root' })
export class ShopStore {
  private readonly shop = inject(ShopService);

  // ── Listado ──
  private readonly _filters = signal<ShopFilters>(EMPTY_SHOP_FILTERS);
  private readonly _page = signal<ShopPage<Product> | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private controller: AbortController | null = null;

  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly items = computed(() => this._page()?.items ?? []);
  readonly pagination = computed(() => this._page()?.pagination ?? null);
  /** Cómo se ha buscado (`partial` = por trozos, porque las palabras completas no encontraron nada). */
  readonly searchInfo = computed(() => this._page()?.search ?? null);
  readonly hasFilters = computed(() => hasActiveFilters(this._filters()));
  /** Ya hay una respuesta para estos filtros (para distinguir "cargando por primera vez" de "recargando"). */
  readonly loaded = computed(() => this._page() !== null);

  /** Pide la página de productos de estos filtros. Si había otra petición en curso, la cancela. */
  async load(filters: ShopFilters): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this._filters.set(filters);
    this._loading.set(true);
    this._error.set(null);
    try {
      this._page.set(await this.shop.products(filters, controller.signal));
    } catch (error) {
      // Cancelada: ya hay otra petición más nueva encargándose.
      if (isAbortError(error)) return;
      this._error.set(toApiError(error));
    } finally {
      if (this.controller === controller) {
        this.controller = null;
        this._loading.set(false);
      }
    }
  }

  /** Al salir del shop: que no llegue una respuesta a una pantalla que ya no está. */
  cancel(): void {
    this.controller?.abort();
    this.controller = null;
    this._loading.set(false);
  }

  // ── Datos de los filtros (y del Home) ──
  private readonly _categories = signal<ShopCategory[]>([]);
  private readonly _sellers = signal<ShopSeller[]>([]);
  private readonly _locations = signal<ShopLocation[]>([]);
  private readonly _facetsLoading = signal(false);
  private readonly _facetsError = signal<ApiError | null>(null);
  private facetsRequest: Promise<void> | null = null;

  readonly categories = this._categories.asReadonly();
  readonly sellers = this._sellers.asReadonly();
  readonly locations = this._locations.asReadonly();
  readonly facetsLoading = this._facetsLoading.asReadonly();
  readonly facetsError = this._facetsError.asReadonly();
  /** Solo las categorías principales (las subcategorías se incluyen al filtrar por su principal). */
  readonly mainCategories = computed(() => this._categories().filter((category) => !category.parentId));

  /** Una sola vez (y si falla, se puede reintentar con `force`). Los tres a la vez. */
  loadFacets(force = false): Promise<void> {
    if (this.facetsRequest && !force) return this.facetsRequest;
    this._facetsLoading.set(true);
    this._facetsError.set(null);
    this.facetsRequest = Promise.all([this.shop.categories(), this.shop.sellers(), this.shop.locations()])
      .then(([categories, sellers, locations]) => {
        this._categories.set(categories);
        this._sellers.set(sellers);
        this._locations.set(locations);
      })
      .catch((error) => {
        this._facetsError.set(toApiError(error));
        this.facetsRequest = null;
      })
      .finally(() => this._facetsLoading.set(false));
    return this.facetsRequest;
  }

  /** Nombres legibles para los filtros aplicados (chips): el slug si aún no han llegado los datos. */
  categoryName = (slug: string) => this._categories().find((c) => c.slug === slug)?.name ?? slug;
  sellerName = (slug: string) => this._sellers().find((s) => s.slug === slug)?.name ?? slug;
  locationName = (slug: string) => this._locations().find((l) => l.slug === slug)?.name ?? slug;
}
