import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError, isAbortError, toApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { RelativeTimePipe } from '../../../shared/utils/relative-time.pipe';
import { StarRatingComponent } from '../../reviews/components/star-rating/star-rating.component';
import { CRITERION_LABELS, CriterionKey } from '../../reviews/models/review.model';
import { AdminTab, AdminTabsComponent } from '../components/admin-tabs/admin-tabs.component';
import { AdminReport, ModerationService, ReportAction, ReportPage, ReportView } from './moderation.service';

/**
 * Denuncias (`/admin/reports` y `/admin/reports/resolved`). Cada una enseña la valoración entera (para decidir sin
 * salir de aquí), quién denuncia, por qué y cuántas denuncias tiene lo mismo.
 * - Abiertas (las más antiguas primero): «Ocultar valoración» o «Descartar».
 * - Resueltas: cómo se resolvió y quién; la valoración se puede volver a mostrar (o a ocultar).
 * Después de cada acción se recarga: ocultar resuelve a la vez las demás denuncias de lo mismo (lo decide la API).
 */
@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    RelativeTimePipe,
    BadgeComponent,
    StarRatingComponent,
    AdminTabsComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-5xl">
      <header class="mb-5">
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Denuncias</h1>
        <p class="mt-1 text-sm text-ink-muted">
          {{ isOpen() ? 'Valoraciones que los usuarios han denunciado. Ocultarla la quita del perfil y de la media; se puede deshacer.' : 'Las ya revisadas. Una valoración oculta se puede volver a mostrar.' }}
        </p>
      </header>

      <app-admin-tabs label="Denuncias abiertas o resueltas" [tabs]="tabs()" />

      @if (error(); as err) {
        <app-error-state title="No hemos podido cargar las denuncias" [error]="err" (retry)="load()" />
      } @else if (!data()) {
        <app-skeleton variant="table" [count]="4" label="Cargando denuncias…" />
      } @else if (data()!.items.length === 0) {
        @if (isOpen()) {
          <app-empty-state icon="checkCircle" title="No hay denuncias por revisar" message="Cuando alguien denuncie una valoración, aparecerá aquí." />
        } @else {
          <app-empty-state icon="message" title="Aún no has resuelto ninguna" message="Las denuncias que descartes u ocultes quedarán aquí." />
        }
      } @else {
        <ul class="space-y-4">
          @for (report of data()!.items; track report._id) {
            <li class="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
              <!-- La denuncia -->
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <app-badge tone="warning">{{ report.reasonLabel }}</app-badge>
                @if (report.reportsOnTarget > 1) {
                  <app-badge tone="neutral">{{ report.reportsOnTarget }} denuncias</app-badge>
                }
                @if (!isOpen()) {
                  <app-badge [tone]="report.status === 'actioned' ? 'success' : 'neutral'">{{ report.status === 'actioned' ? 'Ocultada' : 'Descartada' }}</app-badge>
                }
                <span class="text-ink-muted">
                  Denunciada por <span class="font-medium text-ink">{{ report.reporter?.name ?? 'Usuario de Revishop' }}</span>
                  · <time [attr.datetime]="report.createdAt" [title]="report.createdAt | date: 'medium' : undefined : 'es-ES'">{{ report.createdAt | relativeTime }}</time>
                </span>
              </div>
              @if (report.note) {
                <p class="mt-2 text-sm text-ink">«{{ report.note }}»</p>
              }

              <!-- Lo denunciado -->
              @if (report.target; as review) {
                <div class="mt-3 rounded-xl border p-3" [class]="review.hiddenAt ? 'border-dashed border-line bg-canvas/60' : 'border-line bg-canvas'">
                  <div class="flex flex-wrap items-center gap-2 text-sm">
                    <app-star-rating [value]="review.rating" size="sm" />
                    @if (review.author) {
                      <a [routerLink]="['/sellers', review.author.slug]" target="_blank" class="font-semibold text-ink hover:text-primary-700 hover:underline">{{ review.author.name }}</a>
                    } @else {
                      <span class="font-semibold text-ink">Usuario de Revishop</span>
                    }
                    <span class="text-ink-muted">sobre</span>
                    @if (review.reviewee) {
                      <a [routerLink]="['/sellers', review.reviewee.slug]" target="_blank" class="font-semibold text-ink hover:text-primary-700 hover:underline">{{ review.reviewee.name }}</a>
                    }
                    <span class="text-ink-muted">({{ review.revieweeRole === 'seller' ? 'como vendedor' : 'como comprador' }})</span>
                    @if (review.hiddenAt) {
                      <app-badge tone="neutral">Oculta</app-badge>
                    }
                  </div>
                  <p class="mt-1 text-xs text-ink-muted">
                    {{ review.product.title }} · {{ criteriaText(review.criteria) }}
                  </p>
                  @if (review.comment) {
                    <p class="mt-2 whitespace-pre-line break-words text-sm text-ink">{{ review.comment }}</p>
                  }
                  @if (review.reply) {
                    <p class="mt-2 border-l-4 border-primary-200 pl-2 text-sm text-ink-muted">Respuesta: {{ review.reply.text }}</p>
                  }
                  @if (review.hiddenAt && review.hiddenReason) {
                    <p class="mt-2 text-xs text-ink-muted">Oculta por: {{ review.hiddenReason }}</p>
                  }
                </div>
              } @else {
                <p class="mt-3 rounded-xl border border-dashed border-line p-3 text-sm text-ink-muted">Lo denunciado ya no existe.</p>
              }

              <!-- Qué hacer -->
              <div class="mt-3 flex flex-wrap items-center gap-2">
                @if (isOpen()) {
                  @if (report.target && !report.target.hiddenAt) {
                    <button type="button" class="btn btn-danger min-h-9 px-3 text-sm" [disabled]="busyId() === report._id" (click)="resolve(report, 'hide')">Ocultar valoración</button>
                  }
                  <button type="button" class="btn btn-secondary min-h-9 px-3 text-sm" [disabled]="busyId() === report._id" (click)="resolve(report, 'dismiss')">Descartar</button>
                } @else {
                  <span class="text-xs text-ink-muted">
                    Resuelta por {{ report.resolvedBy?.name ?? 'un administrador' }}
                    · <time [attr.datetime]="report.resolvedAt">{{ report.resolvedAt | relativeTime }}</time>
                  </span>
                  @if (report.target; as review) {
                    <button type="button" class="btn btn-secondary ml-auto min-h-9 px-3 text-sm" [disabled]="busyId() === report._id" (click)="toggleHidden(report)">
                      {{ review.hiddenAt ? 'Volver a mostrar' : 'Ocultar valoración' }}
                    </button>
                  }
                }
              </div>
            </li>
          }
        </ul>

        @if (data()!.pagination.totalPages > 1) {
          <div class="mt-6">
            <app-pagination label="Páginas de denuncias" [page]="page()" [totalPages]="data()!.pagination.totalPages" (pageChange)="goTo($event)" />
          </div>
        }
      }
    </div>
  `,
})
export class AdminReportsPageComponent implements OnChanges, OnDestroy {
  private readonly moderation = inject(ModerationService);
  private readonly alert = inject(AlertService);

  /** Viene de `data.view` de la ruta (withComponentInputBinding). */
  readonly view = input<ReportView>('open');

  protected readonly data = signal<ReportPage | null>(null);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly page = signal(1);
  private controller: AbortController | null = null;

  protected readonly isOpen = computed(() => this.view() !== 'resolved');
  protected readonly tabs = computed<AdminTab[]>(() => {
    const counts = this.data()?.counts ?? null;
    return [
      { label: 'Abiertas', icon: 'message', link: '/admin/reports', count: counts?.open ?? null },
      { label: 'Resueltas', icon: 'checkCircle', link: '/admin/reports/resolved', count: counts?.resolved ?? null },
    ];
  });

  ngOnChanges(): void {
    this.page.set(1);
    void this.load();
  }

  ngOnDestroy(): void {
    this.controller?.abort();
  }

  /** "Estado 2/5 · Trato 3/5 · Puntualidad 3/5" */
  protected criteriaText(criteria: Partial<Record<CriterionKey, number>>): string {
    return (Object.entries(criteria) as [CriterionKey, number][]).map(([key, value]) => `${CRITERION_LABELS[key]} ${value}/5`).join(' · ');
  }

  protected async load(): Promise<void> {
    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.error.set(null);
    try {
      this.data.set(await this.moderation.list(this.isOpen() ? 'open' : 'resolved', this.page(), controller.signal));
    } catch (raw) {
      if (!isAbortError(raw)) this.error.set(toApiError(raw));
    }
  }

  protected goTo(page: number): void {
    this.page.set(page);
    void this.load();
  }

  protected async resolve(report: AdminReport, action: ReportAction): Promise<void> {
    if (action === 'hide') {
      const confirmed = await this.alert.confirm({
        title: '¿Ocultar esta valoración?',
        text: `Dejará de verse en el perfil de ${report.target?.reviewee?.name ?? 'esta persona'} y de contar en su media. Las demás denuncias de esta valoración se resolverán también. Podrás volver a mostrarla desde Resueltas.`,
        confirmText: 'Ocultar',
        danger: true,
      });
      if (!confirmed) return;
    }
    await this.run(report, () => this.moderation.resolve(report._id, action), action === 'hide' ? 'Valoración ocultada' : 'Denuncia descartada');
  }

  protected async toggleHidden(report: AdminReport): Promise<void> {
    const review = report.target;
    if (!review) return;
    const hide = !review.hiddenAt;
    if (hide) {
      const confirmed = await this.alert.confirm({
        title: '¿Ocultar esta valoración?',
        text: 'Dejará de verse en el perfil y de contar en la media.',
        confirmText: 'Ocultar',
        danger: true,
      });
      if (!confirmed) return;
    }
    await this.run(
      report,
      () => this.moderation.setReviewHidden(review._id, hide, hide ? report.reasonLabel : undefined),
      hide ? 'Valoración ocultada' : 'Valoración visible de nuevo',
    );
  }

  /** Una acción y después recargar (la API puede haber resuelto otras denuncias a la vez). */
  private async run(report: AdminReport, request: () => Promise<unknown>, done: string): Promise<void> {
    this.busyId.set(report._id);
    try {
      await request();
      void this.alert.success(done);
    } catch {
      // El errorInterceptor ya ha avisado (p. ej. 409: otro admin la resolvió antes).
    } finally {
      this.busyId.set(null);
      // Si era la última de la página, se vuelve a una que exista.
      if (this.data()?.items.length === 1 && this.page() > 1) this.page.update((p) => p - 1);
      void this.load();
    }
  }
}
