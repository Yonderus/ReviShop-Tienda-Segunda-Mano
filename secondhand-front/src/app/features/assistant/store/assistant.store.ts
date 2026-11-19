import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';
import { isAbortError } from '../../../core/models/api-error.model';
import { CHAT_MESSAGE_MAX_LENGTH, chatErrorMessage, historyToSend } from '../models/assistant-chat';
import { ChatMessage } from '../models/assistant.model';
import { AssistantService } from '../services/assistant.service';

/**
 * Estado del asistente de compra. La conversación vive solo aquí (en memoria): no se guarda en el servidor ni en
 * el navegador, y se vacía al cerrar sesión. Los signals son privados y se exponen de solo lectura.
 */
@Injectable({ providedIn: 'root' })
export class AssistantStore {
  private readonly service = inject(AssistantService);

  private readonly _open = signal(false);
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _sending = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly open = this._open.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly sending = this._sending.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isEmpty = computed(() => this._messages().length === 0);

  private nextId = 1;
  private controller: AbortController | null = null;

  constructor() {
    // La conversación es de quien la tuvo: al salir (logout, sesión caducada) se borra y se cierra.
    inject(AuthStore).onSessionEnd(() => {
      this.reset();
      this._open.set(false);
    });
  }

  toggle(): void {
    this._open.update((open) => !open);
  }

  close(): void {
    this._open.set(false);
  }

  /** Envía un mensaje. Mientras hay uno en camino no se manda otro (el botón está desactivado). */
  async send(text: string): Promise<void> {
    const content = text.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
    if (!content || this._sending()) return;
    this._messages.update((messages) => [...messages, { id: this.nextId++, role: 'user', content, products: [], shopQuery: null }]);
    await this.request();
  }

  /** Vuelve a pedir la respuesta al último mensaje (tras un error). */
  async retry(): Promise<void> {
    if (this._sending() || this._messages().at(-1)?.role !== 'user') return;
    await this.request();
  }

  /** Nueva conversación: corta la petición en curso y borra todo. */
  reset(): void {
    this.controller?.abort();
    this.controller = null;
    this._messages.set([]);
    this._error.set(null);
    this._sending.set(false);
  }

  private async request(): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this._sending.set(true);
    this._error.set(null);

    try {
      const response = await this.service.chat(historyToSend(this._messages()), controller.signal);
      this._messages.update((messages) => [
        ...messages,
        {
          id: this.nextId++,
          role: 'assistant',
          content: response.reply,
          products: response.products ?? [],
          shopQuery: response.shopQuery ?? null,
        },
      ]);
    } catch (error) {
      if (isAbortError(error)) return;
      this._error.set(chatErrorMessage(error));
    } finally {
      if (this.controller === controller) {
        this._sending.set(false);
        this.controller = null;
      }
    }
  }
}
