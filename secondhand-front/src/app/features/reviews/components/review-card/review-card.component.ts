import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { RelativeTimePipe } from '../../../../shared/utils/relative-time.pipe';
import {
  CRITERION_LABELS,
  CriterionKey,
  PublicReview,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REVIEW_REPLY_MAX,
  ReportReason,
} from '../../models/review.model';
import { ReviewsService } from '../../services/reviews.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';

/**
 * Una valoración pública: estrellas, criterios, comentario, qué se compró, quién la escribió y la respuesta.
 * - «Responder» solo si `canReply` (eres el valorado y aún no has respondido): formulario en la propia tarjeta.
 * - «Denunciar» solo si `canReport` (con sesión y no la escribiste tú): el motivo en la propia tarjeta.
 * El texto de los usuarios se pinta con interpolación: nunca como HTML.
 */
@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [DatePipe, RouterLink, RelativeTimePipe, StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-2xl border border-line bg-surface p-4 sm:p-5" [attr.aria-label]="'Valoración de ' + review().reviewer.name">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <app-star-rating [value]="review().rating" />
          <span class="text-sm font-semibold text-ink">
            @if (review().reviewer.slug) {
              <a [routerLink]="['/sellers', review().reviewer.slug]" class="hover:text-primary-700 hover:underline">{{ review().reviewer.name }}</a>
            } @else {
              {{ review().reviewer.name }}
            }
          </span>
        </div>
        <time class="text-xs text-ink-muted" [attr.datetime]="review().publishedAt" [title]="review().publishedAt | date: 'medium' : undefined : 'es-ES'">
          {{ review().publishedAt | relativeTime }}
        </time>
      </div>

      @if (showProduct()) {
        <p class="mt-1 text-xs text-ink-muted">
          {{ review().revieweeRole === 'seller' ? 'Compró' : 'Le vendió' }}:
          <a [routerLink]="['/shop', review().product.slug]" class="hover:text-primary-700 hover:underline">{{ review().product.title }}</a>
        </p>
      }

      <dl class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        @for (item of criteria(); track item.key) {
          <div class="flex items-center gap-1">
            <dt>{{ item.label }}</dt>
            <dd class="font-semibold tabular-nums text-ink">{{ item.value }}/5</dd>
          </div>
        }
      </dl>

      @if (review().comment) {
        <p class="mt-3 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed text-ink">{{ review().comment }}</p>
      }

      @if (review().reply; as reply) {
        <div class="mt-3 rounded-xl border-l-4 border-primary-200 bg-canvas px-3 py-2">
          <p class="text-xs font-semibold text-ink">Respuesta</p>
          <p class="mt-0.5 whitespace-pre-line break-words text-sm text-ink">{{ reply.text }}</p>
        </div>
      } @else if (replying()) {
        <form class="mt-3" (submit)="$event.preventDefault(); sendReply()" novalidate>
          <label [for]="'reply-' + review()._id" class="field-label">Tu respuesta (una sola vez y pública)</label>
          <textarea
            [id]="'reply-' + review()._id"
            rows="3"
            class="field-control"
            [attr.maxlength]="replyMax"
            [value]="replyText()"
            (input)="replyText.set($any($event.target).value)"
          ></textarea>
          <p class="mt-1 text-right text-xs tabular-nums text-ink-muted">{{ replyText().length }}/{{ replyMax }}</p>
          @if (actionError(); as message) {
            <p class="text-sm font-medium text-red-700" role="alert">{{ message }}</p>
          }
          <div class="mt-2 flex gap-2">
            <button type="submit" class="btn btn-primary min-h-9 px-3 text-sm" [disabled]="busy() || replyText().trim().length < 2">{{ busy() ? 'Enviando…' : 'Publicar respuesta' }}</button>
            <button type="button" class="btn btn-secondary min-h-9 px-3 text-sm" (click)="replying.set(false)">Cancelar</button>
          </div>
        </form>
      }

      @if (reporting()) {
        <form class="mt-3 rounded-xl border border-line bg-canvas p-3" (submit)="$event.preventDefault(); sendReport()" novalidate>
          <label [for]="'report-' + review()._id" class="field-label">¿Por qué la denuncias?</label>
          <select [id]="'report-' + review()._id" class="field-control" (change)="reportReason.set($any($event.target).value)">
            <option value="" [selected]="!reportReason()">Elige un motivo</option>
            @for (reason of reasons; track reason) {
              <option [value]="reason" [selected]="reportReason() === reason">{{ reasonLabels[reason] }}</option>
            }
          </select>
          @if (actionError(); as message) {
            <p class="mt-1 text-sm font-medium text-red-700" role="alert">{{ message }}</p>
          }
          <p class="mt-2 text-xs text-ink-muted">La revisará un administrador. Quien la escribió no sabrá que has sido tú.</p>
          <div class="mt-2 flex gap-2">
            <button type="submit" class="btn btn-danger min-h-9 px-3 text-sm" [disabled]="busy() || !reportReason()">{{ busy() ? 'Enviando…' : 'Denunciar' }}</button>
            <button type="button" class="btn btn-secondary min-h-9 px-3 text-sm" (click)="reporting.set(false)">Cancelar</button>
          </div>
        </form>
      }

      @if (!replying() && !reporting() && (canReplyNow() || (canReport() && !reported()))) {
        <div class="mt-3 flex gap-3 text-sm">
          @if (canReplyNow()) {
            <button type="button" class="font-semibold text-primary-700 hover:underline" (click)="openReply()">Responder</button>
          }
          @if (canReport() && !reported()) {
            <button type="button" class="text-ink-muted hover:text-red-700 hover:underline" (click)="openReport()">Denunciar</button>
          }
        </div>
      }
    </article>
  `,
})
export class ReviewCardComponent {
  private readonly reviews = inject(ReviewsService);
  private readonly alert = inject(AlertService);

  readonly review = input.required<PublicReview>();
  readonly canReply = input(false);
  readonly canReport = input(false);
  readonly showProduct = input(true);
  /** La valoración con su respuesta, para que el padre la sustituya en su lista. */
  readonly replied = output<PublicReview>();

  protected readonly replyMax = REVIEW_REPLY_MAX;
  protected readonly reasons = REPORT_REASONS;
  protected readonly reasonLabels = REPORT_REASON_LABELS;

  protected readonly replying = signal(false);
  protected readonly reporting = signal(false);
  protected readonly reported = signal(false);
  protected readonly busy = signal(false);
  protected readonly replyText = signal('');
  protected readonly reportReason = signal<ReportReason | ''>('');
  protected readonly actionError = signal<string | null>(null);

  protected readonly canReplyNow = computed(() => this.canReply() && !this.review().reply);
  protected readonly criteria = computed(() =>
    (Object.entries(this.review().criteria) as [CriterionKey, number][]).map(([key, value]) => ({ key, label: CRITERION_LABELS[key], value })),
  );

  protected openReply(): void {
    this.actionError.set(null);
    this.replying.set(true);
  }

  protected openReport(): void {
    this.actionError.set(null);
    this.reportReason.set('');
    this.reporting.set(true);
  }

  protected async sendReply(): Promise<void> {
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await this.reviews.reply(this.review()._id, this.replyText().trim());
      this.replying.set(false);
      this.replied.emit(updated);
      void this.alert.success('Respuesta publicada');
    } catch (error) {
      this.actionError.set(toApiError(error).errors[0]?.message ?? toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected async sendReport(): Promise<void> {
    const reason = this.reportReason();
    if (!reason) return;
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await this.reviews.report(this.review()._id, reason);
      this.reporting.set(false);
      this.reported.set(true);
      void this.alert.success('Gracias. Lo revisará un administrador');
    } catch (error) {
      const apiError = toApiError(error);
      // 409: ya la habías denunciado. Para el usuario, es lo mismo que haberlo hecho ahora.
      if (apiError.status === 409) {
        this.reporting.set(false);
        this.reported.set(true);
        void this.alert.success(apiError.message);
      } else {
        this.actionError.set(apiError.errors[0]?.message ?? apiError.message);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
