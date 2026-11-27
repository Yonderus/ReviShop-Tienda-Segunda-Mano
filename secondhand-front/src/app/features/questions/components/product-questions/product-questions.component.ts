import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PendingStore } from '../../../../core/activity/pending.store';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ApiError, isAbortError, toApiError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { RelativeTimePipe } from '../../../../shared/utils/relative-time.pipe';
import { REPORT_REASONS, REPORT_REASON_LABELS, ReportReason } from '../../../reviews/models/review.model';
import { ANSWER_MAX, QUESTION_MAX, QUESTION_MIN, Question } from '../../models/question.model';
import { QuestionsService } from '../../services/questions.service';

/** Qué formulario hay abierto en una pregunta: responder o denunciar (uno a la vez en toda la sección). */
type OpenForm = { id: string; kind: 'answer' | 'report' } | null;

/**
 * Preguntas y respuestas de un anuncio, en su ficha (`#preguntas`).
 * - Cualquiera las lee. Con sesión se pregunta (el vendedor no puede en lo suyo); sin sesión, enlace al login.
 * - El vendedor responde (una vez, con «Sugerir respuesta» de la IA si quiere), oculta y vuelve a mostrar; quien preguntó borra la suya si sigue sin respuesta;
 *   los demás denuncian. Qué botones salen lo decide la API (`question.can`).
 * - El texto de los usuarios va con interpolación, nunca como HTML.
 */
@Component({
  selector: 'app-product-questions',
  standalone: true,
  imports: [DatePipe, RouterLink, RelativeTimePipe, BadgeComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="preguntas" class="mt-8 scroll-mt-24 border-t border-line pt-6" aria-labelledby="questions-title">
      <h2 id="questions-title" class="text-base font-semibold text-ink">
        Preguntas
        @if (visibleCount()) {
          <span class="font-normal text-ink-muted">({{ visibleCount() }})</span>
        }
      </h2>

      @if (pendingForMe()) {
        <p class="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950" role="status">
          {{ pendingForMe() === 1 ? 'Tienes 1 pregunta sin responder.' : 'Tienes ' + pendingForMe() + ' preguntas sin responder.' }} Respondiendo pronto das confianza.
        </p>
      }

      <!-- Preguntar -->
      @if (!auth.isAuthenticated()) {
        <p class="mt-3 text-sm text-ink-muted">
          <a routerLink="/login" [queryParams]="{ returnUrl: router.url }" class="font-semibold text-primary-700 hover:underline">Inicia sesión</a>
          para preguntar al vendedor.
        </p>
      } @else if (!isSeller()) {
        <form class="mt-3" (submit)="$event.preventDefault(); askQuestion()" novalidate>
          <label for="question-text" class="field-label">Pregunta al vendedor</label>
          <textarea
            id="question-text"
            rows="2"
            class="field-control"
            [attr.maxlength]="questionMax"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            placeholder="¿Tiene factura? ¿Envías a otra ciudad?"
            aria-describedby="question-hint question-error"
          ></textarea>
          <p id="question-hint" class="mt-1 flex justify-between gap-2 text-xs text-ink-muted">
            <span>Será pública: la verán los demás junto a la respuesta.</span>
            <span class="tabular-nums">{{ draft().length }}/{{ questionMax }}</span>
          </p>
          <p id="question-error" class="text-sm font-medium text-red-700" aria-live="polite">{{ askError() }}</p>
          <button type="submit" class="btn btn-primary mt-2 min-h-9 px-3 text-sm" [disabled]="busy() || draft().trim().length < questionMin">
            {{ busy() ? 'Enviando…' : 'Preguntar' }}
          </button>
        </form>
      }

      <!-- Listado -->
      @if (loadError(); as error) {
        <p class="mt-4 text-sm text-ink-muted">
          No hemos podido cargar las preguntas.
          <button type="button" class="font-semibold text-primary-700 hover:underline" (click)="load()">Reintentar</button>
        </p>
      } @else if (questions().length === 0 && loaded()) {
        <p class="mt-4 text-sm text-ink-muted">Aún no hay preguntas. ¡Sé el primero en preguntar!</p>
      } @else {
        <ul class="mt-4 space-y-3">
          @for (q of questions(); track q._id) {
            <li class="rounded-2xl border p-4" [class]="q.hidden ? 'border-dashed border-line bg-canvas/60' : 'border-line bg-surface'">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                @if (q.asker.slug) {
                  <a [routerLink]="['/sellers', q.asker.slug]" class="font-semibold text-ink hover:text-primary-700 hover:underline">{{ q.asker.name }}</a>
                } @else {
                  <span class="font-semibold text-ink">{{ q.asker.name }}</span>
                }
                <time [attr.datetime]="q.createdAt" [title]="q.createdAt | date: 'medium' : undefined : 'es-ES'">{{ q.createdAt | relativeTime }}</time>
                @if (q.hidden) {
                  <app-badge tone="neutral">Oculta: solo la ves tú</app-badge>
                }
              </div>
              <p class="mt-1 whitespace-pre-line break-words text-[0.9375rem] text-ink">{{ q.text }}</p>

              @if (q.answer; as answer) {
                <div class="mt-2 rounded-xl border-l-4 border-primary-200 bg-canvas px-3 py-2">
                  <p class="text-xs font-semibold text-ink">Respuesta de {{ sellerName() }}</p>
                  <p class="mt-0.5 whitespace-pre-line break-words text-sm text-ink">{{ answer.text }}</p>
                </div>
              } @else if (!q.can.answer) {
                <p class="mt-2 text-xs text-ink-muted">Esperando respuesta del vendedor.</p>
              }

              <!-- Responder (el vendedor) -->
              @if (isOpen(q, 'answer')) {
                <form class="mt-3" (submit)="$event.preventDefault(); answerQuestion(q)" novalidate>
                  <div class="flex flex-wrap items-end justify-between gap-2">
                    <label [for]="'answer-' + q._id" class="field-label">Tu respuesta (pública, una sola vez)</label>
                    <!-- La IA propone una respuesta con lo que dice el anuncio; el vendedor la revisa y la publica él -->
                    <button type="button" class="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline disabled:opacity-60" [disabled]="suggesting()" (click)="suggest(q)">
                      <app-icon name="sparkles" [size]="16" />
                      {{ suggesting() ? 'Pensando…' : 'Sugerir respuesta' }}
                    </button>
                  </div>
                  <textarea [id]="'answer-' + q._id" rows="3" class="field-control" [attr.maxlength]="answerMax" [value]="formText()" (input)="formText.set($any($event.target).value)"></textarea>
                  <p class="mt-1 flex justify-between gap-2 text-xs text-ink-muted" aria-live="polite">
                    <span>{{ suggestStatus() }}</span>
                    <span class="tabular-nums">{{ formText().length }}/{{ answerMax }}</span>
                  </p>
                  @if (suggestError(); as message) {
                    <p class="text-sm font-medium text-red-700" role="alert">{{ message }}</p>
                  }
                  @if (suggestion(); as text) {
                    <div class="mt-2 rounded-xl border border-primary-100 bg-primary-50/60 p-3 text-sm">
                      <p class="text-xs font-semibold text-primary-800">Sugerencia de la IA</p>
                      <p class="mt-1 whitespace-pre-line text-ink">{{ text }}</p>
                      <div class="mt-2 flex gap-3">
                        <button type="button" class="font-semibold text-primary-700 hover:underline" (click)="useSuggestion()">Usar esta respuesta</button>
                        <button type="button" class="text-ink-muted hover:text-ink hover:underline" (click)="suggestion.set(null)">Descartar</button>
                      </div>
                    </div>
                  }
                  @if (formError(); as message) {
                    <p class="text-sm font-medium text-red-700" role="alert">{{ message }}</p>
                  }
                  <div class="mt-2 flex gap-2">
                    <button type="submit" class="btn btn-primary min-h-9 px-3 text-sm" [disabled]="busy() || formText().trim().length < 2">{{ busy() ? 'Enviando…' : 'Publicar respuesta' }}</button>
                    <button type="button" class="btn btn-secondary min-h-9 px-3 text-sm" (click)="open.set(null)">Cancelar</button>
                  </div>
                </form>
              }

              <!-- Denunciar -->
              @if (isOpen(q, 'report')) {
                <form class="mt-3 rounded-xl border border-line bg-canvas p-3" (submit)="$event.preventDefault(); reportQuestion(q)" novalidate>
                  <label [for]="'qreport-' + q._id" class="field-label">¿Por qué la denuncias?</label>
                  <select [id]="'qreport-' + q._id" class="field-control" (change)="reason.set($any($event.target).value)">
                    <option value="" [selected]="!reason()">Elige un motivo</option>
                    @for (item of reasons; track item) {
                      <option [value]="item" [selected]="reason() === item">{{ reasonLabels[item] }}</option>
                    }
                  </select>
                  @if (formError(); as message) {
                    <p class="mt-1 text-sm font-medium text-red-700" role="alert">{{ message }}</p>
                  }
                  <div class="mt-2 flex gap-2">
                    <button type="submit" class="btn btn-danger min-h-9 px-3 text-sm" [disabled]="busy() || !reason()">Denunciar</button>
                    <button type="button" class="btn btn-secondary min-h-9 px-3 text-sm" (click)="open.set(null)">Cancelar</button>
                  </div>
                </form>
              }

              <!-- Acciones -->
              @if (!open() || open()!.id !== q._id) {
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  @if (q.can.answer) {
                    <button type="button" class="font-semibold text-primary-700 hover:underline" (click)="openForm(q, 'answer')">Responder</button>
                  }
                  @if (q.can.hide) {
                    <button type="button" class="text-ink-muted hover:text-ink hover:underline" [disabled]="busy()" (click)="toggleHidden(q)">{{ q.hidden ? 'Volver a mostrar' : 'Ocultar' }}</button>
                  }
                  @if (q.can.delete) {
                    <button type="button" class="text-ink-muted hover:text-red-700 hover:underline" [disabled]="busy()" (click)="remove(q)">Borrar</button>
                  }
                  @if (q.can.report && !reported().has(q._id)) {
                    <button type="button" class="text-ink-muted hover:text-red-700 hover:underline" (click)="openForm(q, 'report')">Denunciar</button>
                  }
                </div>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class ProductQuestionsComponent implements OnChanges {
  private readonly api = inject(QuestionsService);
  private readonly alert = inject(AlertService);
  private readonly pending = inject(PendingStore);
  protected readonly auth = inject(AuthStore);
  protected readonly router = inject(Router);

  readonly productId = input.required<string>();
  readonly slug = input.required<string>();
  readonly sellerId = input.required<string>();
  readonly sellerName = input.required<string>();

  protected readonly questionMin = QUESTION_MIN;
  protected readonly questionMax = QUESTION_MAX;
  protected readonly answerMax = ANSWER_MAX;
  protected readonly reasons = REPORT_REASONS;
  protected readonly reasonLabels = REPORT_REASON_LABELS;

  protected readonly questions = signal<Question[]>([]);
  protected readonly loaded = signal(false);
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly draft = signal('');
  protected readonly askError = signal('');
  protected readonly busy = signal(false);
  protected readonly open = signal<OpenForm>(null);
  protected readonly formText = signal('');
  protected readonly formError = signal<string | null>(null);
  protected readonly reason = signal<ReportReason | ''>('');
  protected readonly reported = signal(new Set<string>());
  // Respuesta sugerida por la IA (V8)
  protected readonly suggesting = signal(false);
  protected readonly suggestion = signal<string | null>(null);
  protected readonly suggestError = signal<string | null>(null);
  protected readonly suggestStatus = signal('');
  private suggestController: AbortController | null = null;

  protected readonly isSeller = computed(() => this.auth.user()?._id === this.sellerId());
  protected readonly visibleCount = computed(() => this.questions().filter((q) => !q.hidden).length);
  /** Las que puede responder quien mira (el vendedor, o un admin). */
  protected readonly pendingForMe = computed(() => this.questions().filter((q) => q.can.answer && !q.hidden).length);

  ngOnChanges(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loadError.set(null);
    try {
      this.questions.set(await this.api.list(this.slug()));
      this.loaded.set(true);
      // Si se llega con #preguntas (desde Mi actividad), se baja aquí cuando ya existe la sección.
      if (location.hash === '#preguntas') setTimeout(() => document.getElementById('preguntas')?.scrollIntoView({ block: 'start' }));
    } catch (error) {
      this.loadError.set(toApiError(error));
    }
  }

  protected isOpen(q: Question, kind: 'answer' | 'report'): boolean {
    const open = this.open();
    return !!open && open.id === q._id && open.kind === kind;
  }

  protected openForm(q: Question, kind: 'answer' | 'report'): void {
    this.suggestController?.abort();
    this.suggestion.set(null);
    this.suggestError.set(null);
    this.suggestStatus.set('');
    this.formText.set('');
    this.formError.set(null);
    this.reason.set('');
    this.open.set({ id: q._id, kind });
  }

  private replace(updated: Question): void {
    this.questions.update((list) => list.map((q) => (q._id === updated._id ? updated : q)));
  }

  private message(error: unknown): string {
    const apiError = toApiError(error);
    return apiError.errors[0]?.message ?? apiError.message;
  }

  protected async askQuestion(): Promise<void> {
    this.busy.set(true);
    this.askError.set('');
    try {
      const created = await this.api.ask(this.productId(), this.draft().trim());
      // Las respondidas van primero: la nueva, después de ellas.
      this.questions.update((list) => {
        const answered = list.filter((q) => q.answer);
        return [...answered, created, ...list.filter((q) => !q.answer)];
      });
      this.draft.set('');
      void this.alert.success('Pregunta publicada. El vendedor la verá en sus pendientes.');
    } catch (error) {
      this.askError.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Pide a la IA una respuesta con lo que dice el anuncio. Si el campo está vacío, la pone directamente; si ya habías
   * escrito algo, no lo pisa: la enseña aparte y eliges si la usas. Nunca se publica sola.
   */
  protected async suggest(q: Question): Promise<void> {
    this.suggestController?.abort();
    const controller = (this.suggestController = new AbortController());
    this.suggesting.set(true);
    this.suggestError.set(null);
    this.suggestion.set(null);
    this.suggestStatus.set('');
    try {
      const { suggestion } = await this.api.suggestAnswer(q._id, this.slug(), controller.signal);
      if (this.formText().trim()) {
        this.suggestion.set(suggestion);
        this.suggestStatus.set('Sugerencia lista: elige si sustituye a lo que has escrito.');
      } else {
        this.formText.set(suggestion);
        this.suggestStatus.set('Respuesta sugerida por la IA: revísala antes de publicarla.');
      }
    } catch (error) {
      if (isAbortError(error)) return;
      const apiError = toApiError(error);
      // Sin conexión con la IA: se puede responder a mano igualmente.
      this.suggestError.set(
        apiError.kind === 'network' ? 'El asistente no está disponible ahora mismo. Puedes escribir la respuesta tú.' : apiError.message,
      );
    } finally {
      if (this.suggestController === controller) this.suggesting.set(false);
    }
  }

  protected useSuggestion(): void {
    const text = this.suggestion();
    if (text) this.formText.set(text);
    this.suggestion.set(null);
    this.suggestStatus.set('Respuesta sugerida por la IA: revísala antes de publicarla.');
  }

  protected async answerQuestion(q: Question): Promise<void> {
    this.busy.set(true);
    this.formError.set(null);
    try {
      this.replace(await this.api.answer(q._id, this.formText().trim()));
      this.open.set(null);
      void this.pending.refresh();
      void this.alert.success('Respuesta publicada');
    } catch (error) {
      this.formError.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggleHidden(q: Question): Promise<void> {
    this.busy.set(true);
    try {
      this.replace(await this.api.setHidden(q._id, !q.hidden));
      void this.pending.refresh();
      void this.alert.success(q.hidden ? 'La pregunta vuelve a verse' : 'Pregunta oculta: solo la ves tú');
    } catch {
      // El errorInterceptor ya ha avisado.
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(q: Question): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿Borrar tu pregunta?',
      text: 'Desaparecerá del anuncio. Solo se puede mientras el vendedor no la haya respondido.',
      confirmText: 'Borrar',
      danger: true,
    });
    if (!confirmed) return;
    this.busy.set(true);
    try {
      await this.api.remove(q._id);
      this.questions.update((list) => list.filter((item) => item._id !== q._id));
      void this.alert.success('Pregunta borrada');
    } catch {
      // 409: el vendedor la respondió justo antes. Se recarga para verlo.
      void this.load();
    } finally {
      this.busy.set(false);
    }
  }

  protected async reportQuestion(q: Question): Promise<void> {
    const reason = this.reason();
    if (!reason) return;
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.api.report(q._id, reason);
      this.markReported(q);
      void this.alert.success('Gracias. Lo revisará un administrador');
    } catch (error) {
      if (toApiError(error).status === 409) this.markReported(q);
      else this.formError.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  private markReported(q: Question): void {
    this.open.set(null);
    this.reported.update((set) => new Set(set).add(q._id));
  }
}
