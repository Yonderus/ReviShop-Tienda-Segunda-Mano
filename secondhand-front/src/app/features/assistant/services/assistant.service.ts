import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiRequestOptions, ApiService } from '../../../core/services/api.service';
import { ListingDraft, ListingDraftInput } from '../models/assistant.model';

/**
 * Peticiones al servicio de IA (`/api/ai`). Todas:
 * - van a `environment.aiApiUrl` (hasta el gateway, otro puerto; después, el mismo origen);
 * - esperan más que el resto (`aiRequestTimeoutMs`): el modelo puede tardar varios segundos;
 * - pintan su error donde se pidieron (sin modal ni loader global).
 */
const AI_REQUEST: ApiRequestOptions = {
  baseUrl: environment.aiApiUrl,
  timeoutMs: environment.aiRequestTimeoutMs,
  skipErrorAlert: true,
  skipGlobalLoader: true,
};

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = inject(ApiService);

  /** Descripción sugerida y rango de precio. No guarda nada. */
  draftListing(input: ListingDraftInput, signal?: AbortSignal): Promise<ListingDraft> {
    return this.api.post<ListingDraft>('/ai/listings/draft', input, { ...AI_REQUEST, signal });
  }
}
