import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FilterGroup, FilterPanelComponent, PriceRange } from '../../../../shared/components/filter-panel/filter-panel.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchBoxComponent } from '../../../../shared/components/search-box/search-box.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ProductCardComponent } from '../../../products/components/product-card/product-card.component';
import { CONDITION_LABELS, PRODUCT_CONDITIONS, PRODUCT_STATUSES, STATUS_LABELS } from '../../../products/models/product.model';
import { filtersFromParams, paramsFromFilters, sameFilters, withChanges } from '../../models/shop-query';
import { SHOP_SORTS, SHOP_SORT_LABELS, ShopFilters, ShopSort } from '../../models/shop.model';
import { ShopStore } from '../../store/shop.store';

type ListKey = 'category' | 'seller' | 'location' | 'condition' | 'status';
const LIST_KEYS: readonly string[] = ['category', 'seller', 'location', 'condition', 'status'];

/**
 * El shop (`/shop`). La URL es la fuente de verdad:
 *
 * 1. **Lee los query params** (al entrar, al volver atrás/adelante o al llegar desde el Home con un filtro).
 * 2. **Obtiene los datos de los filtros** (categorías, vendedores, ubicaciones) del ShopStore.
 * 3. **Obtiene los productos** con el ShopStore, que cancela la petición anterior (AbortController).
 * 4. Búsqueda, filtros, orden y página **cambian la URL**, y el paso 1 hace el resto.
 */
@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [
    RouterLink,
    SearchBoxComponent,
    FilterPanelComponent,
    PaginationComponent,
    ProductCardComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-primary-900 pb-16 pt-8 text-white sm:pt-10">
      <div class="container-page">
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Tienda</h1>
        <p class="mt-1 text-sm text-primary-100" aria-live="polite">
          @if (store.pagination(); as page) {
            <span class="font-semibold tabular-nums text-white">{{ page.total }}</span> {{ page.total === 1 ? 'anuncio' : 'anuncios' }}
            {{ store.hasFilters() ? 'con estos filtros' : 'a la venta' }}
          } @else {
            Buscando anuncios…
          }
        </p>
        <div class="mt-5 max-w-2xl">
          <app-search-box inputId="shop-search" label="Buscar anuncios" placeholder="Busca por título: bici, iphone, sofá…" [value]="filters().search" (search)="change({ search: $event }, true)" />
        </div>
      </div>
    </section>

    <div class="container-page -mt-8 grid gap-6 pb-16 lg:grid-cols-[17rem_1fr]">
      <aside class="lg:sticky lg:top-20 lg:self-start">
        <app-filter-panel [groups]="groups()" [selected]="selected()" [price]="price()" (toggle)="toggle($event)" (priceChange)="changePrice($event)" (clear)="clearFilters()" />
      </aside>

      <div class="min-w-0">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
          <p class="text-sm text-ink-muted">
            @if (store.searchInfo(); as search) {
              @if (search.mode === 'partial') {
                Sin coincidencias exactas: mostramos los que contienen «<span class="font-medium text-ink">{{ search.term }}</span>».
              } @else {
                Resultados de «<span class="font-medium text-ink">{{ search.term }}</span>».
              }
            } @else {
              Lo más nuevo primero, salvo que elijas otro orden.
            }
          </p>
          <label class="flex items-center gap-2 text-sm text-ink-muted">
            Ordenar
            <!-- [selected] en cada opción: un [value] en el select se aplicaría antes de que existan las opciones. -->
            <select class="field-control min-h-10 w-auto py-1.5" (change)="changeSort($any($event.target).value)">
              <option value="" [selected]="!filters().sort">{{ filters().search ? 'Más relevantes' : 'Más recientes' }}</option>
              @for (sort of sorts(); track sort) {
                <option [value]="sort" [selected]="filters().sort === sort">{{ sortLabels[sort] }}</option>
              }
            </select>
          </label>
        </div>

        <div class="mt-5">
          @if (store.error(); as error) {
            <app-error-state title="No hemos podido cargar los anuncios" [error]="error" (retry)="reload()" />
          } @else if (!store.loaded()) {
            <app-skeleton variant="cards" [count]="6" label="Cargando anuncios…" />
          } @else if (store.items().length === 0) {
            @if (outOfRange(); as last) {
              <app-empty-state icon="search" title="Esta página no existe" [message]="'Con estos filtros hay ' + last + (last === 1 ? ' página.' : ' páginas.')">
                <button type="button" class="btn btn-primary" (click)="goToPage(last)">Ir a la última página</button>
              </app-empty-state>
            } @else if (store.hasFilters()) {
              <app-empty-state icon="search" title="Ningún anuncio con estos filtros" message="Prueba a quitar algún filtro o a buscar otra cosa.">
                <button type="button" class="btn btn-primary" (click)="clearFilters()">Limpiar filtros</button>
              </app-empty-state>
            } @else {
              <app-empty-state icon="recycle" title="Todavía no hay anuncios" message="Ese objeto que ya no usas puede ser justo lo que alguien busca.">
                <a routerLink="/products/new" class="btn btn-primary">Publicar el primero</a>
              </app-empty-state>
            }
          } @else {
            <ul
              class="grid grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3"
              [class.opacity-60]="store.loading()"
              [attr.aria-busy]="store.loading()"
              aria-label="Anuncios"
            >
              @for (product of store.items(); track product._id; let i = $index) {
                <li><app-product-card [product]="product" [priority]="i < 3" detailBase="/shop" [actions]="false" /></li>
              }
            </ul>
            @if (store.pagination(); as page) {
              <div class="mt-8">
                <app-pagination label="Páginas de anuncios" [page]="page.page" [totalPages]="page.totalPages" (pageChange)="goToPage($event)" />
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class ShopPageComponent implements OnInit, OnDestroy {
  protected readonly store = inject(ShopStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly sortLabels = SHOP_SORT_LABELS;

  /** Los filtros de la URL (fuente de verdad). */
  protected readonly filters = toSignal(this.route.queryParamMap.pipe(map((params) => filtersFromParams(paramsOf(params)))), {
    initialValue: filtersFromParams({}),
  });

  /** "Relevancia" solo tiene sentido con búsqueda; el primer `<option>` ya es el orden por defecto. */
  protected readonly sorts = computed<ShopSort[]>(() =>
    SHOP_SORTS.filter((sort) => sort !== 'recent' && (sort !== 'relevance' || this.filters().search !== '')),
  );

  protected readonly groups = computed<FilterGroup[]>(() => {
    const filters = this.filters();
    // Las principales, más cualquier subcategoría que venga en la URL (p. ej. desde la miga de una ficha).
    const main = this.store.mainCategories();
    const extra = filters.category
      .filter((slug) => !main.some((category) => category.slug === slug))
      .map((slug) => ({ value: slug, label: this.store.categoryName(slug) }));
    return [
      { key: 'category', label: 'Categoría', options: [...main.map((c) => ({ value: c.slug, label: c.name })), ...extra] },
      { key: 'condition', label: 'Estado de conservación', options: PRODUCT_CONDITIONS.map((value) => ({ value, label: CONDITION_LABELS[value] })) },
      { key: 'status', label: 'Disponibilidad', options: PRODUCT_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })) },
      { key: 'location', label: 'Ubicación', options: this.store.locations().map((l) => ({ value: l.slug, label: l.name })) },
      { key: 'seller', label: 'Vendedor', options: this.store.sellers().map((s) => ({ value: s.slug, label: s.name })) },
    ];
  });

  protected readonly selected = computed<Record<ListKey, readonly string[]>>(() => {
    const { category, seller, location, condition, status } = this.filters();
    return { category, seller, location, condition, status };
  });

  protected readonly price = computed<PriceRange>(() => ({ min: this.filters().minPrice, max: this.filters().maxPrice }));

  /** Página pedida mayor que la última (p. ej. un enlace viejo): el número de la última, o null. */
  protected readonly outOfRange = computed(() => {
    const page = this.store.pagination();
    return page && page.total > 0 && page.page > page.totalPages ? page.totalPages : null;
  });

  constructor() {
    // Al entrar se piden siempre (lo de antes puede haber cambiado: alguien publicó o editó un anuncio); después,
    // cada vez que la URL trae otros filtros.
    let first = true;
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const filters = filtersFromParams(paramsOf(params));
      if (first || this.store.error() || !sameFilters(filters, this.store.filters())) void this.store.load(filters);
      first = false;
    });
  }

  ngOnInit(): void {
    void this.store.loadFacets();
  }

  ngOnDestroy(): void {
    this.store.cancel();
  }

  /** Cambia la URL (y con ella, los productos). Escribir en el buscador no llena el historial (`replaceUrl`). */
  protected change(changes: Partial<ShopFilters>, replaceUrl = false): void {
    const next = withChanges(this.filters(), changes);
    void this.router.navigate([], { relativeTo: this.route, queryParams: paramsFromFilters(next), replaceUrl });
  }

  protected toggle({ key, values }: { key: string; values: string[] }): void {
    if (LIST_KEYS.includes(key)) this.change({ [key]: values } as Partial<ShopFilters>);
  }

  protected changePrice({ min, max }: PriceRange): void {
    // Un rango imposible no se envía: el panel ya avisa y la API daría 422.
    if (min !== null && max !== null && min > max) return;
    this.change({ minPrice: min, maxPrice: max });
  }

  protected changeSort(value: string): void {
    this.change({ sort: (SHOP_SORTS as readonly string[]).includes(value) ? (value as ShopSort) : null });
  }

  protected clearFilters(): void {
    this.change({ category: [], seller: [], location: [], condition: [], status: [], minPrice: null, maxPrice: null, search: '' });
  }

  protected goToPage(page: number): void {
    this.change({ page });
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  protected reload(): void {
    void this.store.load(this.filters());
  }
}

/** ParamMap → objeto (los parámetros repetidos como array). */
function paramsOf(params: import('@angular/router').ParamMap): Record<string, string | string[]> {
  return Object.fromEntries(params.keys.map((key) => {
    const values = params.getAll(key);
    return [key, values.length > 1 ? values : values[0]];
  }));
}
