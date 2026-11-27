import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import { APP_NAME } from '../../../../core/config/app.constants';
import { ApiError, toApiError } from '../../../../core/models/api-error.model';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageNotFoundComponent } from '../../../../shared/components/page-not-found/page-not-found.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { LevelMeterComponent } from '../../../../shared/ui/level-meter.component';
import { PricePipe } from '../../../../shared/utils/price.pipe';
import { ProductGalleryComponent } from '../../../products/components/product-gallery/product-gallery.component';
import { ProductImageComponent } from '../../../products/components/product-image/product-image.component';
import { ProductVariantPickerComponent } from '../../../products/components/product-variant-picker/product-variant-picker.component';
import { ProductVariant } from '../../../products/models/product-variant.model';
import { CONDITION_LABELS, CONDITION_LEVEL, Product, STATUS_LABELS, STATUS_TONES } from '../../../products/models/product.model';
import { sellerIdOf, variantPrice } from '../../../products/models/product.utils';
import { ShopService } from '../../services/shop.service';
import { StarRatingComponent } from '../../../reviews/components/star-rating/star-rating.component';
import { formatRating } from '../../../reviews/models/review.model';
import { ProductQuestionsComponent } from '../../../questions/components/product-questions/product-questions.component';
import { responseTimeText } from '../../../questions/models/question.model';

type Status = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * Details de la tienda (`/shop/:slug`): el producto y sus variantes, con los dos endpoints del details pedidos
 * en paralelo. Solo productos a la venta (uno inactivo da 404; su vendedor lo ve en `/products/:slug`).
 * Vendedor, categoría y ubicación llevan al shop filtrado. Preparado para reservar: la variante elegida es
 * la que se reservará cuando llegue esa fase.
 */
@Component({
  selector: 'app-shop-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    PricePipe,
    StarRatingComponent,
    ProductQuestionsComponent,
    BadgeComponent,
    IconComponent,
    LevelMeterComponent,
    ProductImageComponent,
    ProductGalleryComponent,
    ProductVariantPickerComponent,
    SkeletonComponent,
    ErrorStateComponent,
    PageNotFoundComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (status()) {
      @case ('not-found') {
        <app-page-not-found title="Producto no encontrado" message="Puede que el anuncio se haya vendido, retirado o que el enlace no sea correcto." />
      }
      @case ('error') {
        <div class="container-page">
          <app-error-state title="No hemos podido cargar el anuncio" [error]="error()" (retry)="load()" />
        </div>
      }
      @default {
        <div class="container-page py-6 sm:py-10">
          <nav aria-label="Ruta de navegación" class="mb-6">
            <ol class="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
              <li><a routerLink="/shop" class="rounded hover:text-primary-700 hover:underline">Tienda</a></li>
              @if (product(); as p) {
                <li aria-hidden="true">/</li>
                <li>
                  <a routerLink="/shop" [queryParams]="{ category: p.category.slug }" class="rounded hover:text-primary-700 hover:underline">{{ p.category.name }}</a>
                </li>
                <li aria-hidden="true">/</li>
                <li class="max-w-[16rem] truncate font-medium text-ink" aria-current="page">{{ p.title }}</li>
              }
            </ol>
          </nav>

          @if (product(); as p) {
            <article class="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
              <div class="space-y-3">
                <app-product-image
                  class="aspect-[4/3] rounded-2xl border border-line"
                  [src]="activePhoto()?.url"
                  [alt]="activePhoto()?.alt || p.title"
                  [priority]="true"
                  [large]="true"
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  [style.view-transition-name]="'product-' + p._id"
                />
                @if (p.images.length > 1) {
                  @defer (on idle) {
                    <app-product-gallery [images]="p.images" [active]="activeImage()" (select)="activeImage.set($event)" />
                  } @placeholder {
                    <div class="h-16 sm:h-20" aria-hidden="true"></div>
                  }
                }
              </div>

              <div class="flex flex-col">
                <div class="flex flex-wrap items-center gap-2">
                  <app-badge [tone]="statusTones[currentStatus()]">{{ statusLabels[currentStatus()] }}</app-badge>
                  <app-badge tone="info">{{ p.category.name }}</app-badge>
                </div>

                <h1 class="mt-3 text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">{{ p.title }}</h1>

                <div class="mt-5 rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
                  <p class="text-sm font-semibold text-ink">Condición: {{ conditionLabels[p.condition] }}</p>
                  <app-level-meter class="mt-2" size="lg" [value]="conditionLevel()" [label]="conditionLabels[p.condition]" caption="Condición" [showLabel]="false" />
                </div>

                @if (variants().length > 1) {
                  <div class="mt-5">
                    <app-product-variant-picker [variants]="variants()" [selectedId]="selectedVariant()?._id" [basePrice]="p.basePrice" (selected)="selectedVariantId.set($event._id)" />
                  </div>
                }

                <p class="mt-5 self-start rounded-xl bg-accent-soft px-3 py-1 text-4xl font-bold tabular-nums tracking-tight text-accent-strong" aria-live="polite">
                  {{ currentPrice() | price }}
                </p>

                <dl class="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  <div class="flex items-start gap-3">
                    <app-icon name="user" [size]="18" class="mt-0.5 text-primary-600" />
                    <div>
                      <dt class="text-ink-muted">Vendedor</dt>
                      <dd>
                        <a [routerLink]="['/sellers', p.seller.slug]" class="font-medium text-primary-700 hover:underline">{{ p.seller.name }}</a>
                        <!-- Su nota como vendedor: lo que más pesa al decidir si fiarse -->
                        <a [routerLink]="['/sellers', p.seller.slug]" class="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
                          @if (p.seller.rating?.count) {
                            <app-star-rating [value]="p.seller.rating!.average" size="sm" />
                            <span class="tabular-nums"><strong class="text-ink">{{ ratingText(p.seller.rating!.average) }}</strong> · {{ p.seller.rating!.count === 1 ? '1 valoración' : p.seller.rating!.count + ' valoraciones' }}</span>
                          } @else {
                            <span>Aún sin valoraciones</span>
                          }
                        </a>
                        @if (responseText(p.seller.responseMinutes); as text) {
                          <span class="mt-0.5 block text-xs text-ink-muted">{{ text }}</span>
                        }
                      </dd>
                    </div>
                  </div>
                  @if (p.location) {
                    <div class="flex items-start gap-3">
                      <app-icon name="pin" [size]="18" class="mt-0.5 text-primary-600" />
                      <div>
                        <dt class="text-ink-muted">Ubicación</dt>
                        <dd>
                          @if (p.locationSlug) {
                            <a routerLink="/shop" [queryParams]="{ location: p.locationSlug }" class="font-medium text-primary-700 hover:underline">{{ p.location }}</a>
                          } @else {
                            <span class="font-medium text-ink">{{ p.location }}</span>
                          }
                        </dd>
                      </div>
                    </div>
                  }
                  <div class="flex items-start gap-3">
                    <app-icon name="calendar" [size]="18" class="mt-0.5 text-primary-600" />
                    <div>
                      <dt class="text-ink-muted">Publicado</dt>
                      <dd class="font-medium text-ink"><time [attr.datetime]="p.createdAt">{{ p.createdAt | date: 'd MMMM y' : undefined : 'es-ES' }}</time></dd>
                    </div>
                  </div>
                </dl>

                <section class="mt-8 border-t border-line pt-6" aria-labelledby="desc-title">
                  <h2 id="desc-title" class="text-base font-semibold text-ink">Descripción</h2>
                  <p class="mt-2 max-w-prose whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">{{ p.description }}</p>
                </section>

                <app-product-questions [productId]="p._id" [slug]="p.slug" [sellerId]="sellerOf(p)" [sellerName]="p.seller.name" />

                <div class="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:flex-wrap">
                  <!-- Las reservas llegan en otra fase: el botón queda preparado con la variante elegida. -->
                  <button type="button" class="btn btn-accent" disabled aria-describedby="reserve-soon">
                    <app-icon name="calendarCheck" [size]="18" />
                    Reservar
                  </button>
                  @if (canManage()) {
                    <a [routerLink]="['/products', p.slug, 'edit']" class="btn btn-secondary">
                      <app-icon name="pencil" [size]="18" />
                      Editar anuncio
                    </a>
                  }
                  @if (isOwner()) {
                    <a [routerLink]="['/products', p.slug]" fragment="ventas" class="btn btn-secondary">
                      <app-icon name="checkCircle" [size]="18" />
                      Registrar venta
                    </a>
                  }
                </div>
                <p id="reserve-soon" class="mt-2 text-xs text-ink-muted">Las reservas estarán disponibles próximamente.</p>
              </div>
            </article>
          } @else {
            <app-skeleton variant="detail" label="Cargando anuncio…" />
          }
        </div>
      }
    }
  `,
})
export class ShopDetailPageComponent implements OnChanges {
  private readonly shop = inject(ShopService);
  private readonly auth = inject(AuthStore);
  private readonly title = inject(Title);

  readonly slug = input.required<string>();

  protected readonly status = signal<Status>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly product = signal<Product | null>(null);
  protected readonly variants = signal<ProductVariant[]>([]);
  protected readonly activeImage = signal(0);
  protected readonly selectedVariantId = signal<string | null>(null);

  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;

  /** Cada carga lleva su número: si cambias de producto antes de que llegue, la respuesta vieja se descarta. */
  private request = 0;

  protected readonly activePhoto = computed(() => this.product()?.images[this.activeImage()]);
  /** La elegida, o la primera disponible, o la primera. */
  protected readonly selectedVariant = computed<ProductVariant | undefined>(() => {
    const variants = this.variants();
    return variants.find((v) => v._id === this.selectedVariantId()) ?? variants.find((v) => v.status === 'disponible') ?? variants[0];
  });
  protected readonly currentPrice = computed(() => {
    const product = this.product();
    const variant = this.selectedVariant();
    return product ? (variant ? variantPrice(product, variant) : product.basePrice) : 0;
  });
  protected readonly currentStatus = computed(() => this.selectedVariant()?.status ?? this.product()?.status ?? 'disponible');
  protected readonly conditionLevel = computed(() => {
    const product = this.product();
    return product ? CONDITION_LEVEL[product.condition] : 0;
  });
  protected readonly canManage = computed(() => {
    const product = this.product();
    return !!product && this.auth.isOwnerOrAdmin(sellerIdOf(product));
  });
  /** Registrar una venta: solo el vendedor (se hace en la ficha de gestión, sección Ventas). */
  protected readonly ratingText = formatRating;
  protected readonly responseText = responseTimeText;
  protected readonly sellerOf = sellerIdOf;
  protected readonly isOwner = computed(() => {
    const product = this.product();
    return !!product && this.auth.user()?._id === sellerIdOf(product);
  });

  ngOnChanges(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    const request = ++this.request;
    const slug = this.slug();
    this.status.set('loading');
    this.error.set(null);
    this.product.set(null);
    this.activeImage.set(0);
    this.selectedVariantId.set(null);
    try {
      const [product, variants] = await Promise.all([this.shop.product(slug), this.shop.variants(slug)]);
      if (request !== this.request) return;
      this.product.set(product);
      this.variants.set(variants);
      this.status.set('ready');
      this.title.setTitle(`${product.title} · ${APP_NAME}`);
    } catch (raw) {
      if (request !== this.request) return;
      const error = toApiError(raw);
      this.error.set(error);
      this.status.set(error.isNotFound ? 'not-found' : 'error');
    }
  }
}
