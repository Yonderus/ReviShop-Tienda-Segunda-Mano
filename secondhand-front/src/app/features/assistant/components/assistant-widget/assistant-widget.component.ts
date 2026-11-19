import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { CHAT_MESSAGE_MAX_LENGTH, CHAT_SUGGESTIONS, shopParamsOf } from '../../models/assistant-chat';
import { AssistantShopQuery } from '../../models/assistant.model';
import { AssistantStore } from '../../store/assistant.store';
import { AssistantProductCardComponent } from '../assistant-product-card/assistant-product-card.component';

/**
 * Asistente de compra: botón flotante y panel de chat. Va en el layout de la tienda (no en el panel admin).
 *
 * - Panel lateral no modal en escritorio (se puede seguir usando la página) y a pantalla completa en el móvil.
 * - El texto del modelo se pinta con interpolación (nunca `innerHTML`): aunque escriba HTML, se ve como texto.
 * - Accesible: `dialog` con nombre, foco al campo al abrir, Escape cierra y devuelve el foco al botón, y las
 *   respuestas se anuncian con `aria-live`.
 */
@Component({
  selector: 'app-assistant-widget',
  standalone: true,
  imports: [RouterLink, IconComponent, AssistantProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeFromKeyboard()' },
  template: `
    <button
      #launcher
      type="button"
      class="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      [class.max-sm:hidden]="store.open()"
      aria-controls="assistant-panel"
      [attr.aria-expanded]="store.open()"
      (click)="store.toggle()"
    >
      <app-icon [name]="store.open() ? 'close' : 'sparkles'" [size]="18" />
      <span>{{ store.open() ? 'Cerrar asistente' : 'Asistente' }}</span>
    </button>

    @if (store.open()) {
      <section
        id="assistant-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="assistant-title"
        class="fixed inset-0 z-50 flex flex-col bg-surface sm:inset-auto sm:bottom-20 sm:right-5 sm:h-[min(36rem,calc(100vh-7rem))] sm:w-[24rem] sm:rounded-2xl sm:border sm:border-line sm:shadow-lift"
      >
        <header class="flex items-center gap-3 border-b border-line px-4 py-3">
          <span class="flex size-9 items-center justify-center rounded-full bg-primary-50 text-primary-700" aria-hidden="true">
            <app-icon name="sparkles" [size]="18" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 id="assistant-title" class="text-sm font-semibold text-ink">Asistente de compra</h2>
            <p class="text-xs text-ink-muted">Busca en la tienda por ti</p>
          </div>
          @if (!store.isEmpty()) {
            <button type="button" class="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink" aria-label="Nueva conversación" title="Nueva conversación" (click)="newConversation()">
              <app-icon name="refresh" [size]="18" />
            </button>
          }
          <button type="button" class="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink" aria-label="Cerrar el asistente" (click)="closeAndFocus()">
            <app-icon name="close" [size]="18" />
          </button>
        </header>

        <div #scroller class="flex-1 space-y-4 overflow-y-auto px-4 py-4" data-testid="assistant-messages">
          @if (!auth.isAuthenticated()) {
            <div class="rounded-xl bg-canvas p-4 text-sm text-ink">
              <p class="font-semibold">Inicia sesión para usar el asistente</p>
              <p class="mt-1 text-ink-muted">Te ayuda a encontrar productos de la tienda con lo que le cuentes.</p>
              <a routerLink="/login" [queryParams]="{ returnUrl: router.url }" class="btn btn-primary mt-3 min-h-9 px-3" (click)="store.close()">Iniciar sesión</a>
            </div>
          } @else {
            @if (store.isEmpty()) {
              <div class="text-sm text-ink">
                <p>Hola. Dime qué buscas (qué, cuánto quieres gastar, dónde) y lo busco en la tienda.</p>
                <ul class="mt-3 flex flex-wrap gap-2" aria-label="Ejemplos">
                  @for (suggestion of suggestions; track suggestion) {
                    <li>
                      <button type="button" class="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-primary-200 hover:bg-primary-50" (click)="sendText(suggestion)">
                        {{ suggestion }}
                      </button>
                    </li>
                  }
                </ul>
              </div>
            }

            @for (message of store.messages(); track message.id) {
              @if (message.role === 'user') {
                <div class="flex justify-end">
                  <p class="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-primary-600 px-3.5 py-2 text-sm text-white">
                    <span class="sr-only">Tú: </span>{{ message.content }}
                  </p>
                </div>
              } @else {
                <div class="space-y-2" data-testid="assistant-reply">
                  <p class="max-w-[90%] whitespace-pre-line break-words rounded-2xl rounded-bl-md bg-canvas px-3.5 py-2 text-sm text-ink">
                    <span class="sr-only">Asistente: </span>{{ message.content }}
                  </p>
                  @if (message.products.length) {
                    <ul class="space-y-2" [attr.aria-label]="'Productos encontrados: ' + message.products.length">
                      @for (product of message.products; track product._id) {
                        <li><app-assistant-product-card [product]="product" (opened)="closeOnSmallScreens()" /></li>
                      }
                    </ul>
                  }
                  @if (message.shopQuery; as query) {
                    <a
                      routerLink="/shop"
                      [queryParams]="shopParams(query)"
                      class="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline"
                      (click)="closeOnSmallScreens()"
                    >
                      Ver todos en la tienda <app-icon name="chevronRight" [size]="16" />
                    </a>
                  }
                </div>
              }
            }

            @if (store.sending()) {
              <p class="flex items-center gap-2 text-sm text-ink-muted" role="status">
                <span class="flex gap-1" aria-hidden="true">
                  <span class="size-1.5 rounded-full bg-ink-muted motion-safe:animate-pulse"></span>
                  <span class="size-1.5 rounded-full bg-ink-muted motion-safe:animate-pulse [animation-delay:150ms]"></span>
                  <span class="size-1.5 rounded-full bg-ink-muted motion-safe:animate-pulse [animation-delay:300ms]"></span>
                </span>
                Pensando…
              </p>
            }

            @if (store.error(); as error) {
              <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                <p>{{ error }}</p>
                <button type="button" class="mt-2 font-semibold underline" (click)="store.retry()">Reintentar</button>
              </div>
            }
          }
        </div>

        <!-- Las respuestas nuevas, para los lectores de pantalla. -->
        <p class="sr-only" aria-live="polite">{{ announcement() }}</p>

        @if (auth.isAuthenticated()) {
          <form class="border-t border-line px-4 py-3" (submit)="submit($event)">
            <label for="assistant-input" class="sr-only">Escribe qué buscas</label>
            <div class="flex items-end gap-2">
              <textarea
                #input
                id="assistant-input"
                rows="2"
                class="field-control min-h-0 flex-1 resize-none py-2 text-sm"
                placeholder="Escribe qué buscas…"
                [attr.maxlength]="maxLength"
                [value]="draft()"
                (input)="draft.set($any($event.target).value)"
                (keydown)="onKeydown($event)"
                aria-describedby="assistant-disclaimer"
              ></textarea>
              <button type="submit" class="btn btn-primary min-h-10 px-3" [disabled]="!canSend()" aria-label="Enviar">
                <app-icon name="chevronRight" [size]="18" />
              </button>
            </div>
            <p id="assistant-disclaimer" class="mt-2 text-[0.6875rem] text-ink-muted">
              Las respuestas las genera una IA y pueden contener errores. Enter envía · Mayús+Enter, salto de línea.
            </p>
          </form>
        }
      </section>
    }
  `,
})
export class AssistantWidgetComponent {
  protected readonly store = inject(AssistantStore);
  protected readonly auth = inject(AuthStore);
  protected readonly router = inject(Router);

  private readonly launcher = viewChild.required<ElementRef<HTMLButtonElement>>('launcher');
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('input');
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly suggestions = CHAT_SUGGESTIONS;
  protected readonly maxLength = CHAT_MESSAGE_MAX_LENGTH;
  protected readonly draft = signal('');
  protected readonly canSend = computed(() => this.draft().trim().length > 0 && !this.store.sending());

  /** Lo que se anuncia: la última respuesta del asistente. */
  protected readonly announcement = computed(() => {
    const last = this.store.messages().at(-1);
    return last?.role === 'assistant' ? `Asistente: ${last.content}` : '';
  });

  constructor() {
    // Al abrir, el foco va al campo de texto.
    effect(() => {
      const input = this.input();
      if (this.store.open() && input) untracked(() => setTimeout(() => input.nativeElement.focus()));
    });
    // Con cada mensaje nuevo (o el "Pensando…" / un error), al final de la conversación.
    effect(() => {
      this.store.messages();
      this.store.sending();
      this.store.error();
      const scroller = this.scroller();
      if (scroller) untracked(() => setTimeout(() => scroller.nativeElement.scrollTo({ top: scroller.nativeElement.scrollHeight })));
    });
  }

  protected shopParams(query: AssistantShopQuery) {
    return shopParamsOf(query);
  }

  protected sendText(text: string): void {
    void this.store.send(text);
    this.draft.set('');
    this.input()?.nativeElement.focus();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.canSend()) this.sendText(this.draft());
  }

  /** Enter envía; Mayús+Enter hace salto de línea (y no se envía mientras se compone un carácter, p. ej. con IME). */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (this.canSend()) this.sendText(this.draft());
  }

  protected newConversation(): void {
    this.store.reset();
    this.draft.set('');
    this.input()?.nativeElement.focus();
  }

  protected closeAndFocus(): void {
    this.store.close();
    this.launcher().nativeElement.focus();
  }

  protected closeFromKeyboard(): void {
    if (this.store.open()) this.closeAndFocus();
  }

  /** En el móvil el panel tapa la página: al ir a una ficha o al shop, se cierra para verlos. */
  protected closeOnSmallScreens(): void {
    if (window.matchMedia('(max-width: 639px)').matches) this.store.close();
  }
}
