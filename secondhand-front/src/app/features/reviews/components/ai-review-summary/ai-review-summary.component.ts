import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, inject, input, signal } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ReviewSummary } from '../../models/review.model';
import { ReviewsService } from '../../services/reviews.service';

/**
 * «Lo que dicen de Lucía»: el resumen que hace la IA de los comentarios de sus valoraciones como vendedor.
 *
 * - Mientras carga, un esqueleto del mismo tamaño (para que la página no salte).
 * - Si la IA falla, está apagada o aún no hay 3 comentarios (`null`), el bloque **no aparece**: el resto del perfil
 *   ya tiene las notas y las valoraciones. Nunca se enseña un error por esto.
 * - Pone que lo ha generado la IA y sobre cuántos comentarios: que nadie lo confunda con una opinión de la tienda.
 * - El texto viene del modelo (ya limpiado en el servidor) y se pinta con interpolación, nunca como HTML.
 */
@Component({
  selector: 'app-ai-review-summary',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="rounded-2xl border border-line bg-surface p-5 shadow-card" role="status" aria-label="Preparando el resumen de las valoraciones">
        <div class="h-4 w-48 animate-pulse rounded bg-line"></div>
        <div class="mt-3 h-3 w-full animate-pulse rounded bg-line"></div>
        <div class="mt-2 h-3 w-4/5 animate-pulse rounded bg-line"></div>
      </div>
    }
    @if (!loading() && data(); as s) {
      <section class="rounded-2xl border border-primary-100 bg-primary-50/50 p-5 shadow-card" aria-labelledby="ai-summary-title">
        <h3 id="ai-summary-title" class="flex items-center gap-2 text-base font-semibold text-ink">
          <app-icon name="sparkles" [size]="18" class="text-primary-600" />
          Lo que dicen de {{ firstName() }}
        </h3>
        <p class="mt-2 text-[0.9375rem] leading-relaxed text-ink">{{ s.summary }}</p>

        @if (s.strengths.length || s.improvements.length) {
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            @if (s.strengths.length) {
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-emerald-800">Destacan</p>
                <ul class="mt-1.5 space-y-1 text-sm text-ink">
                  @for (point of s.strengths; track point) {
                    <li class="flex gap-2"><span class="text-emerald-700" aria-hidden="true">✓</span>{{ point }}</li>
                  }
                </ul>
              </div>
            }
            @if (s.improvements.length) {
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-amber-800">A mejorar</p>
                <ul class="mt-1.5 space-y-1 text-sm text-ink">
                  @for (point of s.improvements; track point) {
                    <li class="flex gap-2"><span class="text-amber-700" aria-hidden="true">!</span>{{ point }}</li>
                  }
                </ul>
              </div>
            }
          </div>
        }

        <p class="mt-4 text-xs text-ink-muted">Resumen generado con IA a partir de {{ s.basedOn }} comentarios. Puede no ser exacto: lee las valoraciones.</p>
      </section>
    }
  `,
})
export class AiReviewSummaryComponent implements OnChanges, OnDestroy {
  private readonly reviews = inject(ReviewsService);

  readonly slug = input.required<string>();
  readonly name = input.required<string>();

  protected readonly loading = signal(false);
  protected readonly data = signal<ReviewSummary | null>(null);
  protected readonly firstName = () => this.name().split(' ')[0];
  private controller: AbortController | null = null;

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.controller?.abort();
  }

  private async load(): Promise<void> {
    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.loading.set(true);
    this.data.set(null);
    try {
      this.data.set(await this.reviews.summary(this.slug(), controller.signal));
    } catch {
      // Sin resumen: la IA está apagada, ha fallado o ha tardado. El perfil se ve igual.
      this.data.set(null);
    } finally {
      if (this.controller === controller) this.loading.set(false);
    }
  }
}
