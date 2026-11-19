import type { Params } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { EMPTY_SHOP_FILTERS } from '../../shop/models/shop.model';
import { paramsFromFilters } from '../../shop/models/shop-query';
import { AssistantShopQuery, ChatMessage, ChatTurn } from './assistant.model';

/*
 * Reglas del chat, como funciones puras (sin Angular ni peticiones): qué historial se manda, a qué URL del shop
 * lleva "Ver todos" y qué se le dice al usuario cuando algo falla.
 */

/** Los mismos límites que valida el servidor. */
export const CHAT_HISTORY_LIMIT = 10;
export const CHAT_MESSAGE_MAX_LENGTH = 1000;

/** Las preguntas de ejemplo de un chat vacío. */
export const CHAT_SUGGESTIONS = [
  'Busco un móvil de menos de 300 €',
  '¿Qué hay a la venta en Valencia?',
  'Busco una bicicleta de montaña',
] as const;

/**
 * El historial que se envía: los últimos `CHAT_HISTORY_LIMIT` mensajes, solo rol y texto (las tarjetas no se
 * reenvían). La API exige que el primero que se mande no sea del asistente a medias y el último sea del usuario.
 */
export function historyToSend(messages: readonly ChatMessage[]): ChatTurn[] {
  const turns = messages.slice(-CHAT_HISTORY_LIMIT).map(({ role, content }) => ({ role, content }));
  while (turns.length && turns[0].role === 'assistant') turns.shift();
  return turns;
}

/** Los filtros del agente → query params del shop (reutiliza el mismo traductor que la URL del shop). */
export function shopParamsOf(query: AssistantShopQuery): Params {
  return paramsFromFilters({
    ...EMPTY_SHOP_FILTERS,
    category: query.category ?? [],
    location: query.location ?? [],
    condition: query.condition ?? [],
    status: query.status ?? [],
    minPrice: query.minPrice ?? null,
    maxPrice: query.maxPrice ?? null,
    search: query.search ?? '',
    sort: query.sort ?? null,
  });
}

/** El mensaje de error que se pinta dentro del chat. */
export function chatErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'El asistente no ha podido responder. Prueba de nuevo.';
  if (error.kind === 'network') return 'El asistente no está disponible ahora mismo. Prueba de nuevo en un rato.';
  if (error.kind === 'timeout') return 'El asistente ha tardado demasiado. Prueba de nuevo.';
  if (error.status === 401) return 'Tu sesión ha caducado. Inicia sesión para seguir usando el asistente.';
  if (error.status === 429) return 'Has hecho muchas preguntas seguidas. Prueba de nuevo dentro de un rato.';
  if (error.status === 502 || error.status === 503) return 'El asistente no está disponible ahora mismo. Prueba de nuevo en un rato.';
  // 422 y 504 traen un mensaje claro de la API.
  return error.errors[0]?.message ?? error.message;
}
