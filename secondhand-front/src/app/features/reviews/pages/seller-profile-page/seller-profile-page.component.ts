import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, SimpleChanges, computed, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import { APP_NAME } from '../../../../core/config/app.constants';
import { ApiError, isAbortError, toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageNotFoundComponent } from '../../../../shared/components/page-not-found/page-not-found.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../../shared/ui/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ProductCardComponent } from '../../../products/components/product-card/product-card.component';
import { Product } from '../../../products/models/product.model';
import { EMPTY_SHOP_FILTERS } from '../../../shop/models/shop.model';
import { ShopService } from '../../../shop/services/shop.service';
import { AiReviewSummaryComponent } from '../../components/ai-review-summary/ai-review-summary.component';
import { RatingSummaryComponent } from '../../components/rating-summary/rating-summary.component';
import { ReviewCardComponent } from '../../components/review-card/review-card.component';
import { PublicProfile, PublicReview, ReviewPage, RevieweeRole } from '../../models/review.model';
import { ReviewsService } from '../../services/reviews.service';
import { responseTimeText } from '../../../questions/models/question.model';

/** Cuántos anuncios del vendedor se enseñan debajo; el resto, en la tienda filtrada. */
const LISTINGS_PREVIEW = 8;

/**
 * Perfil público de un usuario (`/sellers/:slug`): quién es, sus valoraciones como vendedor y como comprador
 * (con las medias, las barras y los criterios) y sus anuncios.
 *
 * El papel, las estrellas y la página van en la URL (`?role=buyer&rating=2&page=2`): recargar o compartir el enlace
 * deja lo mismo. Si eres tú, puedes responder a tus valoraciones; con sesión, denunciar las de los demás.
 */
@Component({
  selector: 'app-seller-profile-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    AvatarComponent,
    IconComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PageNotFoundComponent,
    PaginationComponent,
    ProductCardComponent,
    RatingSummaryComponent,
    ReviewCardComponent,
    AiReviewSummaryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'not-found') {
      <app-page-not-found title="Usuario no encontrado" message="No existe, o su cuenta ya no está activa." />
    } @else if (status() === 'error') {
      <div class="container-page py-10"><app-error-state title="No hemos podido cargar el perfil" [error]="error()" (retry)="loadProfile()" /></div>
    } @else {
      @if (profile(); as p) {
      <div class="container-page max-w-5xl py-6 sm:py-10">
        <!-- Quién es -->
        <section class="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:p-6" aria-label="Perfil">
          <app-avatar size="lg" [name]="p.name" [src]="p.avatarUrl" />
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{{ p.name }}</h1>
            <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
              @if (p.location) {
                <li class="flex items-center gap-1"><app-icon name="pin" [size]="16" />{{ p.location }}</li>
              }
              <li class="flex items-center gap-1"><app-icon name="calendar" [size]="16" />En Revishop desde {{ p.memberSince | date: 'MMMM y' : undefined : 'es-ES' }}</li>
              <li class="flex items-center gap-1"><app-icon name="checkCircle" [size]="16" />{{ p.salesCount === 1 ? '1 venta cerrada' : p.salesCount + ' ventas cerradas' }}</li>
              @if (responseText(p.responseMinutes); as text) {
                <li class="flex items-center gap-1"><app-icon name="message" [size]="16" />{{ text }}</li>
              }
            </ul>
            @if (p.bio) {
              <p class="mt-3 max-w-prose whitespace-pre-line text-[0.9375rem] text-ink">{{ p.bio }}</p>
            }
          </div>
        </section>

        <!-- Valoraciones -->
        <section class="mt-8" aria-labelledby="reviews-title">
          <h2 id="reviews-title" class="text-xl font-semibold text-ink">Valoraciones</h2>
          <nav class="mt-3 flex gap-1 border-b border-line" aria-label="Valoraciones como vendedor o como comprador">
            @for (tab of tabs; track tab.role) {
              <a
                [routerLink]="[]"
                [queryParams]="{ role: tab.role === 'seller' ? null : tab.role, rating: null, page: null }"
                queryParamsHandling="merge"
                class="-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors"
                [class]="activeRole() === tab.role ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-muted hover:text-ink'"
                [attr.aria-current]="activeRole() === tab.role ? 'page' : null"
              >
                {{ tab.label }} <span class="tabular-nums text-ink-muted">({{ summaryOf(tab.role).count }})</span>
              </a>
            }
          </nav>

          @if (summary().count === 0) {
            <div class="mt-6">
              <app-empty-state
                icon="star"
                title="Aún no tiene valoraciones"
                [message]="activeRole() === 'seller' ? 'Cuando alguien le compre algo, podrá valorarle aquí.' : 'Cuando compre algo, el vendedor podrá valorarle aquí.'"
              />
            </div>
          } @else {
            <div class="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <app-rating-summary [summary]="summary()" [selected]="ratingFilter()" (filter)="filterBy($event)" />
            </div>

            <!-- El resumen de la IA es de las valoraciones como vendedor: solo en esa pestaña -->
            @if (activeRole() === 'seller') {
              <app-ai-review-summary class="mt-4 block" [slug]="p.slug" [name]="p.name" />
            }

            <div class="mt-6" aria-live="polite">
              @if (ratingFilter()) {
                <p class="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink">
                  Solo las de {{ ratingFilter() }} {{ ratingFilter() === 1 ? 'estrella' : 'estrellas' }}.
                  <button type="button" class="font-semibold text-primary-700 hover:underline" (click)="filterBy(null)">Ver todas</button>
                </p>
              }
              @if (reviewsError(); as err) {
                <app-error-state title="No hemos podido cargar las valoraciones" [error]="err" (retry)="loadReviews()" />
              } @else if (!reviews()) {
                <app-skeleton variant="table" [count]="3" label="Cargando valoraciones…" />
              } @else {
                <ul class="space-y-3">
                  @for (review of reviews()!.items; track review._id) {
                    <li>
                      <app-review-card
                        [review]="review"
                        [canReply]="isMe()"
                        [canReport]="canReport(review)"
                        (replied)="replaceReview($event)"
                      />
                    </li>
                  }
                </ul>
                @if (reviews()!.pagination.totalPages > 1) {
                  <div class="mt-6">
                    <app-pagination label="Páginas de valoraciones" [page]="reviews()!.pagination.page" [totalPages]="reviews()!.pagination.totalPages" (pageChange)="goToPage($event)" />
                  </div>
                }
              }
            </div>
          }
        </section>

        <!-- Sus anuncios -->
        <section class="mt-10" aria-labelledby="listings-title">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="listings-title" class="text-xl font-semibold text-ink">Sus anuncios</h2>
            @if (listingsTotal() > listings().length) {
              <a routerLink="/shop" [queryParams]="{ seller: p.slug }" class="text-sm font-semibold text-primary-700 hover:underline">Ver los {{ listingsTotal() }} en la tienda</a>
            }
          </div>
          @if (listings().length) {
            <ul class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (product of listings(); track product._id) {
                <li><app-product-card [product]="product" detailBase="/shop" [actions]="false" /></li>
              }
            </ul>
          } @else {
            <p class="mt-3 text-sm text-ink-muted">Ahora mismo no tiene nada a la venta.</p>
          }
        </section>
      </div>
      } @else {
        <div class="container-page max-w-5xl py-10"><app-skeleton variant="detail" label="Cargando el perfil…" /></div>
      }
    }
  `,
})
export class SellerProfilePageComponent implements OnChanges, OnDestroy {
  private readonly reviewsApi = inject(ReviewsService);
  private readonly shop = inject(ShopService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  /** Ruta y query params (`withComponentInputBinding`). */
  readonly slug = input.required<string>();
  readonly role = input<string | undefined>();
  readonly rating = input<string | undefined>();
  readonly page = input<string | undefined>();

  protected readonly responseText = responseTimeText;
  protected readonly tabs: { role: RevieweeRole; label: string }[] = [
    { role: 'seller', label: 'Como vendedor' },
    { role: 'buyer', label: 'Como comprador' },
  ];

  protected readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly reviews = signal<ReviewPage | null>(null);
  protected readonly reviewsError = signal<ApiError | null>(null);
  protected readonly listings = signal<Product[]>([]);
  protected readonly listingsTotal = signal(0);
  private reviewsController: AbortController | null = null;

  protected readonly activeRole = computed<RevieweeRole>(() => (this.role() === 'buyer' ? 'buyer' : 'seller'));
  protected readonly ratingFilter = computed(() => {
    const value = Number(this.rating());
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
  });
  private readonly pageNumber = computed(() => Math.max(1, Number.parseInt(this.page() ?? '1', 10) || 1));
  protected readonly summary = computed(() => this.summaryOf(this.activeRole()));
  protected readonly isMe = computed(() => !!this.profile() && this.auth.user()?._id === this.profile()!._id);

  ngOnChanges(changes: SimpleChanges): void {
    // Otro usuario: se carga todo. Solo cambia el papel, las estrellas o la página: solo las valoraciones.
    if (changes['slug']) {
      void this.loadProfile();
    } else {
      // El router vuelve a poner el título de la ruta en cada navegación (también al cambiar un query param).
      this.applyTitle();
      void this.loadReviews();
    }
  }

  ngOnDestroy(): void {
    this.reviewsController?.abort();
  }

  protected summaryOf(role: RevieweeRole) {
    const p = this.profile();
    return role === 'seller' ? p!.ratings.asSeller : p!.ratings.asBuyer;
  }

  /** Con sesión y que no la hayas escrito tú (la API también lo comprueba). */
  protected canReport(review: PublicReview): boolean {
    const me = this.auth.user();
    return !!me && review.reviewer.slug !== me.slug;
  }

  protected async loadProfile(): Promise<void> {
    const slug = this.slug();
    this.status.set('loading');
    this.profile.set(null);
    try {
      const [profile, listings] = await Promise.all([
        this.reviewsApi.profile(slug),
        this.shop.products({ ...EMPTY_SHOP_FILTERS, seller: [slug] }).catch(() => null),
      ]);
      if (slug !== this.slug()) return; // se cambió de perfil mientras cargaba
      this.profile.set(profile);
      this.listings.set(listings?.items.slice(0, LISTINGS_PREVIEW) ?? []);
      this.listingsTotal.set(listings?.pagination.total ?? 0);
      this.applyTitle();
      this.status.set('ready');
      void this.loadReviews();
    } catch (raw) {
      const apiError = toApiError(raw);
      this.error.set(apiError);
      this.status.set(apiError.isNotFound ? 'not-found' : 'error');
    }
  }

  /** Cada carga cancela la anterior: cambiar rápido de pestaña o de página no mezcla respuestas. */
  protected async loadReviews(): Promise<void> {
    if (!this.profile()) return;
    this.reviewsController?.abort();
    const controller = (this.reviewsController = new AbortController());
    this.reviews.set(null);
    this.reviewsError.set(null);
    try {
      this.reviews.set(
        await this.reviewsApi.list(this.slug(), { role: this.activeRole(), rating: this.ratingFilter(), page: this.pageNumber() }, controller.signal),
      );
    } catch (raw) {
      if (!isAbortError(raw)) this.reviewsError.set(toApiError(raw));
    }
  }

  /** El nombre en la pestaña del navegador. El de la ruta es genérico; el router lo repone en cada navegación. */
  private applyTitle(): void {
    const profile = this.profile();
    if (profile) setTimeout(() => this.title.setTitle(`${profile.name} · ${APP_NAME}`));
  }

  protected filterBy(rating: number | null): void {
    void this.router.navigate([], { queryParams: { rating, page: null }, queryParamsHandling: 'merge' });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page: page > 1 ? page : null }, queryParamsHandling: 'merge' });
  }

  protected replaceReview(updated: PublicReview): void {
    this.reviews.update((page) => page && { ...page, items: page.items.map((r) => (r._id === updated._id ? updated : r)) });
  }
}
