import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiRequestOptions, ApiService } from '../../../core/services/api.service';
import { ChatResponse, ChatTurn, ListingDraft, ListingDraftInput } from '../models/assistant.model';

/**
 * Peticiones al servicio de IA (`/api/ai`). Todas:
 * - van a la misma API que el resto: el gateway las manda al servicio de IA por la ruta;
 * - esperan más que el resto (`aiRequestTimeoutMs`): el modelo puede tardar varios segundos;
 * - pintan su error donde se pidieron (sin modal ni loader global).
 */
const AI_REQUEST: ApiRequestOptions = {
  timeoutMs: environment.aiRequestTimeoutMs,
  skipErrorAlert: true,
  skipGlobalLoader: true,
};

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = inject(ApiService);

  /** Una vuelta del asistente de compra. `messages`: el historial (ya recortado), el último del usuario. */
  chat(messages: readonly ChatTurn[], signal?: AbortSignal): Promise<ChatResponse> {
    return this.api.post<ChatResponse>('/ai/chat', { messages }, { ...AI_REQUEST, signal });
  }

  /** Descripción sugerida y rango de precio. No guarda nada. */
  draftListing(input: ListingDraftInput, signal?: AbortSignal): Promise<ListingDraft> {
    return this.api.post<ListingDraft>('/ai/listings/draft', input, { ...AI_REQUEST, signal });
  }
}
