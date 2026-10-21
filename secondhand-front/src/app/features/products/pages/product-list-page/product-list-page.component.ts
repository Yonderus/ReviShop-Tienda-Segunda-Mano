import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertService } from '../../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ProductFiltersComponent } from '../../components/product-filters/product-filters.component';
import { ProductGridComponent } from '../../components/product-grid/product-grid.component';
import { CatalogStore } from '../../../catalog/store/catalog.store';
import {
  PRODUCT_CONDITIONS,
  PRODUCT_STATUSES,
  Product,
  ProductFilters,
  ProductSort,
} from '../../models/product.model';
import { ProductsStore } from '../../store/products.store';

const SORTS: readonly ProductSort[] = ['recent', 'price-asc', 'price-desc'];

const pick = <T extends string>(allowed: readonly T[], value?: string): T | undefined =>
  allowed.includes(value as T) ? (value as T) : undefined;

const toPrice = (value?: string): number | undefined => {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    ProductFiltersComponent,
    ProductGridComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list-page.component.html',
})
export class ProductListPageComponent implements OnInit {
  protected readonly store = inject(ProductsStore);
  private readonly catalog = inject(CatalogStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  readonly category = input<string>();
  readonly condition = input<string>();
  readonly status = input<string>();
  readonly minPrice = input<string>();
  readonly maxPrice = input<string>();
  readonly sort = input<string>();

  protected readonly filters = computed<ProductFilters>(() => ({
    // El slug se valida contra las categorías reales de la API.
    category: this.catalog.categoryBySlug(this.category())?.slug,
    condition: pick(PRODUCT_CONDITIONS, this.condition()),
    status: pick(PRODUCT_STATUSES, this.status()),
    minPrice: toPrice(this.minPrice()),
    maxPrice: toPrice(this.maxPrice()),
    sort: pick(SORTS, this.sort()),
  }));

  /** Una categoría raíz incluye sus subcategorías. */
  private readonly categoryScope = computed(() => {
    const slug = this.filters().category;
    return slug ? this.catalog.descendantSlugs(slug) : null;
  });

  protected readonly visible = this.store.filteredBy(this.filters, this.categoryScope);
  protected readonly hasFilters = computed(() => {
    const { sort, ...rest } = this.filters();
    return Object.values(rest).some((v) => v !== undefined);
  });

  ngOnInit(): void {
    void this.store.loadAll();
    void this.catalog.load();
  }

  protected retry(): void {
    void this.store.loadAll({ force: true });
  }

  protected applyFilters(filters: ProductFilters): void {
    const queryParams = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => value !== undefined && !(key === 'sort' && value === 'recent')),
    );
    void this.router.navigate([], { queryParams });
  }

  protected clearFilters(): void {
    this.applyFilters({ sort: this.filters().sort });
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿Retirar este anuncio?',
      text: `"${product.title}" dejará de mostrarse en el catálogo.`,
      confirmText: 'Sí, retirar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.store.remove(product);
      void this.alert.success('Anuncio retirado');
    } catch {
      // El errorInterceptor ya ha mostrado el aviso al usuario.
    }
  }
}
