import { DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { toApiError } from '../../../../core/models/api-error.model';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { Sale } from '../../../sales/models/sale.model';
import {
  CRITERION_LABELS,
  CriterionKey,
  OwnReview,
  REVIEW_COMMENT_MAX,
  REVIEW_COMMENT_MIN_WHEN_LOW,
  REVIEW_CRITERIA,
  REVIEW_LOW_RATING,
  RevieweeRole,
} from '../../models/review.model';
import { ReviewsService } from '../../services/reviews.service';
import { StarInputComponent } from '../star-input/star-input.component';

/**
 * Valorar a la otra parte de una venta, en un `<dialog>` nativo (encierra el foco, Escape lo cierra y el fondo no
 * se puede tocar). La página lo pinta cuando hace falta; al abrirse se muestra solo y al cerrarse avisa con
 * `closed` (o con `reviewed` si se ha enviado).
 *
 * - Nota general y los criterios de ese lado: al vendedor también "Estado como se anunciaba".
 * - Con 1 o 2 estrellas el comentario pasa a obligatorio (lo dice en cuanto se elige la nota, no al enviar).
 * - Avisa de las dos reglas que no se pueden deshacer: no se edita y no se ve hasta que valore el otro (o 72 h).
 */
@Component({
  selector: 'app-review-dialog',
  standalone: true,
  imports: [DatePipe, IconComponent, StarInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog::backdrop {
      background: rgb(15 23 42 / 0.55);
    }
  `,
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-lift"
      aria-labelledby="review-title"
      (close)="closed.emit()"
    >
      <form class="p-5 sm:p-6" (submit)="$event.preventDefault(); submit()" novalidate>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 id="review-title" class="text-lg font-semibold">Valorar a {{ otherName() }}</h2>
            <p class="mt-1 text-sm text-ink-muted">
              {{ role() === 'seller' ? 'Te vendió' : 'Le vendiste' }} «{{ sale().product.title }}»
            </p>
          </div>
          <button type="button" class="icon-btn -mr-2 -mt-1" aria-label="Cerrar sin valorar" (click)="close()">
            <app-icon name="close" [size]="20" />
          </button>
        </div>

        <div class="mt-5 space-y-5">
          <div>
            <app-star-input legend="Nota general" name="review-rating" [big]="true" [(value)]="rating" describedBy="rating-error" />
            @if (show() && !rating()) {
              <p id="rating-error" class="mt-1 text-sm font-medium text-red-700">Elige de 1 a 5 estrellas.</p>
            }
          </div>

          <div class="grid gap-4 rounded-2xl bg-canvas p-4 sm:grid-cols-2">
            @for (key of criteria(); track key) {
              <div>
                <app-star-input [legend]="labels[key]" [name]="'review-' + key" [value]="criteriaValues()[key] ?? null" (valueChange)="setCriterion(key, $event)" />
                @if (fieldError('criteria.' + key); as message) {
                  <p class="mt-1 text-sm font-medium text-red-700">{{ message }}</p>
                }
              </div>
            }
          </div>

          <div>
            <label for="review-comment" class="field-label">
              Comentario {{ commentRequired() ? '(obligatorio)' : '(opcional)' }}
            </label>
            <textarea
              id="review-comment"
              rows="4"
              class="field-control"
              [attr.maxlength]="commentMax"
              [value]="comment()"
              (input)="comment.set($any($event.target).value)"
              [attr.aria-invalid]="!!commentError()"
              aria-describedby="review-comment-hint review-comment-error"
              [placeholder]="commentRequired() ? 'Cuenta qué pasó: ayudará a los siguientes compradores.' : '¿Algo que destacar?'"
            ></textarea>
            <p id="review-comment-hint" class="mt-1 flex justify-between gap-2 text-xs text-ink-muted">
              <span>{{ commentRequired() ? 'Con 1 o 2 estrellas, explica qué pasó (al menos ' + commentMin + ' caracteres).' : '' }}</span>
              <span class="tabular-nums">{{ comment().length }}/{{ commentMax }}</span>
            </p>
            <p id="review-comment-error" class="text-sm font-medium text-red-700" aria-live="polite">{{ commentError() }}</p>
          </div>

          <p class="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <app-icon name="lock" [size]="18" class="mt-0.5 shrink-0" />
            <span>
              <strong>No podrás cambiarla.</strong> Se publicará cuando {{ otherName() }} te valore o, si no lo hace, el
              {{ sale().reviewWindowEndsAt | date: "d 'de' MMMM 'a las' HH:mm" : undefined : 'es-ES' }}.
            </span>
          </p>

          @if (generalError(); as message) {
            <p class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{{ message }}</p>
          }
        </div>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-secondary" (click)="close()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="sending()">{{ sending() ? 'Enviando…' : 'Enviar valoración' }}</button>
        </div>
      </form>
    </dialog>
  `,
})
export class ReviewDialogComponent implements AfterViewInit {
  private readonly reviews = inject(ReviewsService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly sale = input.required<Sale>();
  readonly reviewed = output<OwnReview>();
  readonly closed = output<void>();

  protected readonly labels = CRITERION_LABELS;
  protected readonly commentMin = REVIEW_COMMENT_MIN_WHEN_LOW;
  protected readonly commentMax = REVIEW_COMMENT_MAX;

  protected readonly rating = signal<number | null>(null);
  protected readonly criteriaValues = signal<Partial<Record<CriterionKey, number>>>({});
  protected readonly comment = signal('');
  protected readonly sending = signal(false);
  /** Después del primer intento de enviar, se enseñan los errores de los campos vacíos. */
  protected readonly show = signal(false);
  private readonly serverErrors = signal<Record<string, string>>({});
  protected readonly generalError = signal<string | null>(null);

  /** Si yo compré, valoro al vendedor; si vendí, al comprador. */
  protected readonly role = computed<RevieweeRole>(() => (this.sale().role === 'buyer' ? 'seller' : 'buyer'));
  protected readonly otherName = computed(() => (this.sale().role === 'buyer' ? this.sale().seller?.name : this.sale().buyer?.name) ?? 'la otra persona');
  protected readonly criteria = computed(() => REVIEW_CRITERIA[this.role()]);
  protected readonly commentRequired = computed(() => (this.rating() ?? 5) <= REVIEW_LOW_RATING);

  protected readonly commentError = computed(() => {
    const server = this.serverErrors()['comment'];
    if (server) return server;
    if (this.show() && this.commentRequired() && this.comment().trim().length < REVIEW_COMMENT_MIN_WHEN_LOW) {
      return `Escribe al menos ${REVIEW_COMMENT_MIN_WHEN_LOW} caracteres contando qué pasó.`;
    }
    return '';
  });

  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
  }

  protected fieldError(field: string): string | null {
    if (this.serverErrors()[field]) return this.serverErrors()[field];
    const key = field.replace('criteria.', '') as CriterionKey;
    return this.show() && !this.criteriaValues()[key] ? 'Puntúa este apartado.' : null;
  }

  protected setCriterion(key: CriterionKey, value: number | null): void {
    this.criteriaValues.update((current) => ({ ...current, [key]: value ?? undefined }));
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected async submit(): Promise<void> {
    this.show.set(true);
    this.serverErrors.set({});
    this.generalError.set(null);
    const rating = this.rating();
    const values = this.criteriaValues();
    const complete = !!rating && this.criteria().every((key) => values[key]) && !this.commentError();
    if (!complete) {
      // El foco al primer problema (el campo del primer mensaje de error), para que el teclado y el lector lleguen a él.
      setTimeout(() => {
        const messages = Array.from(this.dialog().nativeElement.querySelectorAll('p.text-red-700')) as HTMLElement[];
        const firstError = messages.find((p) => p.textContent?.trim());
        (firstError?.parentElement?.querySelector('input, textarea') as HTMLElement | null)?.focus();
      });
      return;
    }

    this.sending.set(true);
    try {
      const criteria = Object.fromEntries(this.criteria().map((key) => [key, values[key]]));
      const review = await this.reviews.create(this.sale()._id, { rating: rating!, criteria, comment: this.comment().trim() || undefined });
      this.reviewed.emit(review);
      this.close();
    } catch (error) {
      // 422: errores por campo, junto a cada uno · 409: ya valorada o fuera de plazo, arriba de los botones.
      const apiError = toApiError(error);
      const byField = Object.fromEntries(apiError.errors.filter((e) => e.field).map((e) => [e.field!, e.message]));
      this.serverErrors.set(byField);
      if (!Object.keys(byField).length) this.generalError.set(apiError.message);
    } finally {
      this.sending.set(false);
    }
  }
}
