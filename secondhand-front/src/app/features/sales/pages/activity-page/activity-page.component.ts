import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PendingStore } from '../../../../core/activity/pending.store';
import { ApiError, isAbortError, toApiError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { PricePipe } from '../../../../shared/utils/price.pipe';
import { RelativeTimePipe } from '../../../../shared/utils/relative-time.pipe';
import { CLOSE_REASON_TEXT, SALE_STATE_LABELS, SALE_STATE_TONES, Sale, SalePage, SaleRole } from '../../models/sale.model';
import { SalesService } from '../../services/sales.service';
import { ReviewCardComponent } from '../../../reviews/components/review-card/review-card.component';
import { ReviewDialogComponent } from '../../../reviews/components/review-dialog/review-dialog.component';
import { StarRatingComponent } from '../../../reviews/components/star-rating/star-rating.component';
import { OwnReview, PublicReview } from '../../../reviews/models/review.model';

/** Las pestañas van en la URL (`?tab=ventas`): recargar o compartir el enlace deja la misma. */
type Tab = 'compras' | 'ventas';
const ROLE_OF: Record<Tab, SaleRole> = { compras: 'buyer', ventas: 'seller' };
const PAGE_SIZE = 20;

/**
 * Mi actividad: mis compras y mis ventas.
 * - Compras pendientes: «Sí, la he comprado» o «No he sido yo».
 * - Ventas pendientes: a quién y hasta cuándo, con «Cancelar».
 * - Confirmadas: hasta cuándo se pueden valorar (las valoraciones llegan en V4).
 * - Cerradas: por qué (rechazada, cancelada, caducada…), contado desde cada lado.
 *
 * Qué botones salen lo decide la API (`sale.can`). Después de cada acción se sustituye la venta por la que devuelve
 * la API y se refresca el aviso del menú.
 */
@Component({
  selector: 'app-activity-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    PricePipe,
    RelativeTimePipe,
    BadgeComponent,
    IconComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginationComponent,
    ReviewDialogComponent,
    ReviewCardComponent,
    StarRatingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-page max-w-4xl py-6 sm:py-10">
      <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Mi actividad</h1>
      <p class="mt-2 text-[0.9375rem] text-ink-muted">Tus compras y tus ventas. Cuando una venta se confirma, podéis valoraros durante 72 horas.</p>

      @if (pending.counts()?.salesToConfirm; as count) {
        <p class="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          <app-icon name="package" [size]="20" class="mt-0.5 shrink-0" />
          <span>
            {{ count === 1 ? 'Tienes 1 compra por confirmar.' : 'Tienes ' + count + ' compras por confirmar.' }}
            Confírmala si de verdad la has hecho: así podréis valoraros.
          </span>
        </p>
      }

      <nav class="mt-6 flex gap-1 border-b border-line" aria-label="Compras o ventas">
        @for (item of tabs; track item.id) {
          <a
            [routerLink]="[]"
            [queryParams]="{ tab: item.id === 'compras' ? null : item.id, page: null }"
            class="-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors"
            [class]="activeTab() === item.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-muted hover:text-ink'"
            [attr.aria-current]="activeTab() === item.id ? 'page' : null"
          >
            {{ item.label }}
            @if (item.id === 'compras' && pending.counts()?.salesToConfirm) {
              <span class="ml-1 rounded-full bg-accent px-1.5 text-xs tabular-nums text-ink">{{ pending.counts()?.salesToConfirm }}</span>
            }
          </a>
        }
      </nav>

      <div class="mt-6">
        @if (error(); as err) {
          <app-error-state [title]="'No hemos podido cargar tus ' + activeTab()" [error]="err" (retry)="load()" />
        } @else if (!data()) {
          <app-skeleton variant="table" [count]="4" [label]="'Cargando tus ' + activeTab() + '…'" />
        } @else if (data()!.items.length === 0) {
          @if (activeTab() === 'compras') {
            <app-empty-state icon="package" title="Aún no tienes compras" message="Cuando un vendedor registre que te ha vendido algo, aparecerá aquí para que lo confirmes." />
          } @else {
            <app-empty-state icon="store" title="Aún no has registrado ventas" message="Cuando vendas algo, regístralo desde tu anuncio con el email de la cuenta del comprador." />
          }
        } @else {
          <ul class="space-y-3" [attr.aria-label]="activeTab() === 'compras' ? 'Tus compras' : 'Tus ventas'">
            @for (sale of data()!.items; track sale._id) {
              <li
                class="rounded-2xl border bg-surface p-4 shadow-card sm:p-5"
                [class]="sale.can.confirm || sale.can.review ? 'border-amber-300 ring-1 ring-amber-200' : 'border-line'"
              >
                <div class="flex gap-4">
                  <div class="size-16 shrink-0 overflow-hidden rounded-xl bg-canvas sm:size-20">
                    @if (sale.product.imageUrl) {
                      <img [src]="sale.product.imageUrl" alt="" class="size-full object-cover" loading="lazy" width="80" height="80" />
                    } @else {
                      <span class="flex size-full items-center justify-center text-ink-muted"><app-icon name="imageOff" [size]="22" /></span>
                    }
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <a [routerLink]="['/shop', sale.product.slug]" class="font-semibold text-ink hover:text-primary-700 hover:underline">{{ sale.product.title }}</a>
                        @if (sale.product.variantLabel) {
                          <p class="text-sm text-ink-muted">{{ sale.product.variantLabel }}</p>
                        }
                      </div>
                      <app-badge [tone]="stateTones[sale.status]">{{ stateLabels[sale.status] }}</app-badge>
                    </div>

                    <p class="mt-1 text-sm text-ink">
                      <span class="font-semibold tabular-nums">{{ sale.product.price | price }}</span>
                      ·
                      @if (sale.role === 'buyer') {
                        Vendido por <span class="font-medium">{{ sale.seller?.name ?? 'Usuario de Revishop' }}</span>
                      } @else {
                        Vendido a <span class="font-medium">{{ sale.buyer?.name ?? 'Usuario de Revishop' }}</span>
                      }
                      ·
                      <time class="text-ink-muted" [attr.datetime]="sale.createdAt" [title]="sale.createdAt | date: 'medium' : undefined : 'es-ES'">{{ sale.createdAt | relativeTime }}</time>
                    </p>

                    <!-- Qué pasa con ella y qué se puede hacer -->
                    @switch (sale.status) {
                      @case ('pending') {
                        @if (sale.role === 'buyer') {
                          <p class="mt-3 text-sm text-ink">
                            {{ sale.seller?.name }} dice que te ha vendido esto. ¿Lo has comprado? Tienes hasta el
                            <time [attr.datetime]="sale.expiresAt">{{ sale.expiresAt | date: "d 'de' MMMM" : undefined : 'es-ES' }}</time>.
                          </p>
                          <div class="mt-3 flex flex-col gap-2 sm:flex-row">
                            @if (sale.can.confirm) {
                              <button type="button" class="btn btn-primary min-h-10" [disabled]="busyId() === sale._id" (click)="confirm(sale)">
                                <app-icon name="checkCircle" [size]="18" />
                                Sí, la he comprado
                              </button>
                            }
                            @if (sale.can.reject) {
                              <button type="button" class="btn btn-secondary min-h-10" [disabled]="busyId() === sale._id" (click)="reject(sale)">No he sido yo</button>
                            }
                          </div>
                        } @else {
                          <p class="mt-3 text-sm text-ink-muted">
                            Esperando a que {{ sale.buyer?.name }} la confirme (hasta el
                            <time [attr.datetime]="sale.expiresAt">{{ sale.expiresAt | date: "d 'de' MMMM" : undefined : 'es-ES' }}</time>).
                          </p>
                          @if (sale.can.cancel) {
                            <button type="button" class="btn btn-secondary mt-3 min-h-10" [disabled]="busyId() === sale._id" (click)="cancel(sale)">Cancelar la venta</button>
                          }
                        }
                      }
                      @case ('confirmed') {
                        <p class="mt-3 text-sm text-ink-muted">
                          Confirmada el <time [attr.datetime]="sale.confirmedAt">{{ sale.confirmedAt | date: "d 'de' MMMM" : undefined : 'es-ES' }}</time>.
                        </p>

                        <!-- Valorar (sistema ciego: la del otro no se ve hasta que valores tú o pasen las 72 h) -->
                        @if (sale.can.review) {
                          <div class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                            <p>
                              @if (sale.reviews.theirsSubmitted) {
                                <strong>{{ otherName(sale) }} ya te ha valorado.</strong> Valora tú para ver las dos.
                              } @else {
                                ¿Qué tal con {{ otherName(sale) }}? Valórale.
                              }
                              <span class="font-semibold tabular-nums">{{ timeLeft(sale.reviewWindowEndsAt) }}</span>
                            </p>
                            <button type="button" class="btn btn-primary mt-2 min-h-10" (click)="reviewing.set(sale)">
                              <app-icon name="star" [size]="18" />
                              Valorar a {{ otherName(sale) }}
                            </button>
                          </div>
                        } @else if (sale.reviews.mine && !sale.reviews.mine.isPublished) {
                          <p class="mt-3 text-sm text-ink">
                            Ya has valorado a {{ otherName(sale) }} ({{ sale.reviews.mine.rating }} ★). Se publicará cuando te valore o el
                            <time [attr.datetime]="sale.reviews.mine.visibleAt">{{ sale.reviews.mine.visibleAt | date: "d 'de' MMMM, HH:mm" : undefined : 'es-ES' }}</time>.
                          </p>
                        } @else if (!sale.reviews.mine) {
                          <p class="mt-3 text-sm text-ink-muted">El plazo para valorar esta venta ya terminó.</p>
                        }

                        @if (sale.reviews.theirs; as theirs) {
                          <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ otherName(sale) }} te valoró</p>
                          <app-review-card class="mt-1 block" [review]="theirs" [canReply]="true" [showProduct]="false" (replied)="replaceTheirs(sale, $event)" />
                        }
                        @if (sale.reviews.mine?.isPublished) {
                          <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Tu valoración</p>
                          <div class="mt-1 rounded-2xl border border-line p-3 text-sm">
                            <app-star-rating [value]="sale.reviews.mine!.rating" size="sm" />
                            @if (sale.reviews.mine!.comment) {
                              <p class="mt-1 whitespace-pre-line break-words text-ink">{{ sale.reviews.mine!.comment }}</p>
                            }
                            @if (sale.reviews.mine!.reply; as reply) {
                              <p class="mt-2 border-l-4 border-primary-200 pl-2 text-ink-muted">Respuesta: {{ reply.text }}</p>
                            }
                          </div>
                        }
                      }
                      @default {
                        @if (sale.closeReason) {
                          <p class="mt-3 text-sm text-ink-muted">{{ closeReasons[sale.closeReason][sale.role] }}</p>
                        }
                      }
                    }
                  </div>
                </div>
              </li>
            }
          </ul>

          @if (data()!.pagination.totalPages > 1) {
            <div class="mt-6">
              <app-pagination [page]="data()!.pagination.page" [totalPages]="data()!.pagination.totalPages" [label]="'Páginas de tus ' + activeTab()" (pageChange)="goToPage($event)" />
            </div>
          }
        }
      </div>
    </div>

    @if (reviewing(); as sale) {
      <app-review-dialog [sale]="sale" (reviewed)="onReviewed(sale, $event)" (closed)="reviewing.set(null)" />
    }
  `,
})
export class ActivityPageComponent implements OnChanges, OnDestroy {
  private readonly sales = inject(SalesService);
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);
  protected readonly pending = inject(PendingStore);

  /** Query params (`withComponentInputBinding`). */
  readonly tab = input<string | undefined>();
  readonly page = input<string | undefined>();

  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'compras', label: 'Compras' },
    { id: 'ventas', label: 'Ventas' },
  ];
  protected readonly stateLabels = SALE_STATE_LABELS;
  protected readonly stateTones = SALE_STATE_TONES;
  protected readonly closeReasons = CLOSE_REASON_TEXT;

  protected readonly activeTab = computed<Tab>(() => (this.tab() === 'ventas' ? 'ventas' : 'compras'));
  private readonly pageNumber = computed(() => Math.max(1, Number.parseInt(this.page() ?? '1', 10) || 1));

  protected readonly data = signal<SalePage | null>(null);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly busyId = signal<string | null>(null);
  /** La venta que se está valorando (abre el diálogo). */
  protected readonly reviewing = signal<Sale | null>(null);
  /** La hora, refrescada cada minuto: las cuentas atrás («Quedan 41 h») se mantienen al día solas. */
  private readonly now = signal(Date.now());
  private readonly clock = setInterval(() => this.now.set(Date.now()), 60_000);
  private controller: AbortController | null = null;

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.controller?.abort();
    clearInterval(this.clock);
  }

  /** El nombre de la otra parte de la venta. */
  protected otherName(sale: Sale): string {
    return (sale.role === 'buyer' ? sale.seller?.name : sale.buyer?.name) ?? 'la otra persona';
  }

  /** «Quedan 41 h» / «Quedan 25 min» hasta que se cierre la ventana para valorar. */
  protected timeLeft(until: string | null): string {
    if (!until) return '';
    const minutes = Math.max(0, Math.round((new Date(until).getTime() - this.now()) / 60_000));
    return minutes >= 60 ? `Quedan ${Math.floor(minutes / 60)} h.` : `Quedan ${minutes} min.`;
  }

  /**
   * Valoración enviada: se recarga la lista, porque si el otro ya había valorado ahora se ven las dos (lo decide
   * la API), y se refresca el aviso del menú.
   */
  protected onReviewed(sale: Sale, review: OwnReview): void {
    void this.alert.success(
      review.isPublished ? 'Valoración publicada. Ya podéis ver las dos.' : `Valoración guardada. Se publicará cuando ${this.otherName(sale)} te valore.`,
    );
    void this.load();
  }

  /** Has respondido a la valoración que te dejaron: se sustituye en la venta. */
  protected replaceTheirs(sale: Sale, updated: PublicReview): void {
    this.data.update((page) =>
      page && { ...page, items: page.items.map((item) => (item._id === sale._id ? { ...item, reviews: { ...item.reviews, theirs: updated } } : item)) },
    );
  }

  /** Al cambiar de pestaña o de página se cancela la petición anterior: no puede llegar tarde y pisar la nueva. */
  protected async load(): Promise<void> {
    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.data.set(null);
    this.error.set(null);
    void this.pending.refresh();
    try {
      const page = await this.sales.mine({ as: ROLE_OF[this.activeTab()], page: this.pageNumber(), limit: PAGE_SIZE }, controller.signal);
      // Las que esperan algo de mí, arriba (dentro de la página; el orden de la API es por fecha).
      page.items = [...page.items].sort((a, b) => Number(needsMe(b)) - Number(needsMe(a)));
      this.data.set(page);
    } catch (raw) {
      if (!isAbortError(raw)) this.error.set(toApiError(raw));
    }
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page: page > 1 ? page : null }, queryParamsHandling: 'merge' });
  }

  protected confirm(sale: Sale): Promise<void> {
    return this.act(sale, () => this.sales.confirm(sale._id), 'Compra confirmada. Ya podéis valoraros.');
  }

  protected async reject(sale: Sale): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿No has sido tú?',
      text: `Le diremos a ${sale.seller?.name ?? 'el vendedor'} que no has comprado "${sale.product.title}". No podréis valoraros por esta venta.`,
      confirmText: 'No he sido yo',
      cancelText: 'Volver',
      danger: true,
    });
    if (confirmed) await this.act(sale, () => this.sales.reject(sale._id), 'Hemos avisado al vendedor');
  }

  protected async cancel(sale: Sale): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿Cancelar la venta?',
      text: `${sale.buyer?.name ?? 'El comprador'} ya no podrá confirmarla y la variante volverá al estado que tenía.`,
      confirmText: 'Cancelar la venta',
      cancelText: 'Volver',
      danger: true,
    });
    if (confirmed) await this.act(sale, () => this.sales.cancel(sale._id), 'Venta cancelada');
  }

  /** Una acción sobre una venta: se sustituye por la que devuelve la API. Si falla (409: ya no estaba pendiente), se recarga. */
  private async act(sale: Sale, request: () => Promise<Sale>, done: string): Promise<void> {
    this.busyId.set(sale._id);
    try {
      const updated = await request();
      this.data.update((page) => page && { ...page, items: page.items.map((item) => (item._id === updated._id ? updated : item)) });
      void this.alert.success(done);
    } catch {
      // El errorInterceptor ya ha avisado; se recarga para enseñar cómo está de verdad.
      void this.load();
    } finally {
      this.busyId.set(null);
      void this.pending.refresh();
    }
  }
}

/** Espera algo del usuario: confirmarla, rechazarla o cancelarla. */
const needsMe = (sale: Sale): boolean => sale.can.confirm || sale.can.cancel || sale.can.review;
