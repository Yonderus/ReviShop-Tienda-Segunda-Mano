import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../../../core/models/api-error.model';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ProductCardComponent } from '../../../products/components/product-card/product-card.component';
import { Product } from '../../../products/models/product.model';
import { CategoryCardComponent } from '../../components/category-card/category-card.component';
import { LocationCardComponent } from '../../components/location-card/location-card.component';
import { SellerCardComponent } from '../../components/seller-card/seller-card.component';
import { EMPTY_SHOP_FILTERS, ShopCategory, ShopLocation, ShopSeller } from '../../models/shop.model';
import { ShopService } from '../../services/shop.service';
import { ShopStore } from '../../store/shop.store';

/** Cuántos productos enseña "Lo último". */
const LATEST = 8;

/**
 * Home: tres carruseles (categorías, vendedores y ubicaciones) y lo último publicado. Cada card lleva al shop
 * ya filtrado (`/shop?category=…`): deep-link, así que el filtro sobrevive a recargar o compartir el enlace.
 * Los datos de los carruseles son los mismos que usan los filtros del shop (ShopStore, una sola petición).
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    RouterLink,
    CarouselComponent,
    CategoryCardComponent,
    SellerCardComponent,
    LocationCardComponent,
    ProductCardComponent,
    SkeletonComponent,
    ErrorStateComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-primary-900 pb-16 pt-10 text-white sm:pb-20 sm:pt-14">
      <div class="container-page">
        <h1 class="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-[2.5rem]">Dale una segunda vida a lo que ya no usas</h1>
        <p class="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-primary-100 sm:text-base">
          Encuentra por categoría, por vendedor o cerca de ti.
        </p>
        <a routerLink="/shop" class="btn btn-accent mt-6">
          <app-icon name="search" [size]="18" />
          Ver todos los anuncios
        </a>
      </div>
    </section>

    <div class="container-page space-y-12 py-10 sm:py-12">
      @if (store.facetsError(); as error) {
        <app-error-state title="No hemos podido cargar las categorías, los vendedores y las ubicaciones" [error]="error" (retry)="store.loadFacets(true)" />
      } @else {
        <app-carousel label="Categorías" subtitle="Elige por qué empezar" [items]="categories()" [loading]="store.facetsLoading()">
          <ng-template let-item><app-category-card [category]="item" /></ng-template>
        </app-carousel>

        <app-carousel label="Vendedores" subtitle="Quién tiene más cosas a la venta" [items]="sellers()" [loading]="store.facetsLoading()">
          <ng-template let-item><app-seller-card [seller]="item" /></ng-template>
        </app-carousel>

        <app-carousel label="Ubicaciones" subtitle="Lo que se vende cerca de ti" [items]="locations()" [loading]="store.facetsLoading()" itemWidth="min(16rem, 75vw)">
          <ng-template let-item><app-location-card [location]="item" /></ng-template>
        </app-carousel>
      }

      <section aria-labelledby="latest-title">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="latest-title" class="text-xl font-semibold tracking-tight text-ink">Lo último</h2>
            <p class="mt-1 text-sm text-ink-muted">Recién publicado</p>
          </div>
          <a routerLink="/shop" class="text-sm font-semibold text-primary-700 hover:underline">Ver todo</a>
        </div>
        @if (latestError(); as error) {
          <app-error-state title="No hemos podido cargar lo último" [error]="error" (retry)="loadLatest()" />
        } @else if (latest() === null) {
          <app-skeleton variant="cards" [count]="4" label="Cargando lo último…" />
        } @else {
          <ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            @for (product of latest(); track product._id; let i = $index) {
              <li><app-product-card [product]="product" [priority]="i < 4" [actions]="false" /></li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class HomePageComponent implements OnInit {
  protected readonly store = inject(ShopStore);
  private readonly shop = inject(ShopService);

  // Solo lo que tiene algo a la venta: una card que lleva a un shop vacío no ayuda.
  protected readonly categories = computed<ShopCategory[]>(() => this.store.mainCategories().filter((c) => c.productsCount > 0));
  protected readonly sellers = computed<ShopSeller[]>(() => this.store.sellers());
  protected readonly locations = computed<ShopLocation[]>(() => this.store.locations());

  protected readonly latest = signal<Product[] | null>(null);
  protected readonly latestError = signal<ApiError | null>(null);

  ngOnInit(): void {
    void this.store.loadFacets();
    void this.loadLatest();
  }

  protected async loadLatest(): Promise<void> {
    this.latestError.set(null);
    try {
      const page = await this.shop.products(EMPTY_SHOP_FILTERS);
      this.latest.set(page.items.slice(0, LATEST));
    } catch (error) {
      this.latestError.set(toApiError(error));
    }
  }
}
