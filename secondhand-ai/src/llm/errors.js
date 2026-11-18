import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import { AI_MESSAGES } from "../constants/ai.constants.js";
import {
  AppError,
  BadGatewayError,
  GatewayTimeoutError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from "../utils/AppError.js";

/**
 * Error del proveedor → AppError con un mensaje para el usuario. Al cliente **nunca** le llega el error crudo
 * del proveedor (puede incluir detalles de la cuenta o del modelo); eso va solo al log, para el desarrollador.
 *
 * | Proveedor                                  | Cliente |
 * |--------------------------------------------|:-------:|
 * | 401/403 (key mala) · 402 (sin saldo)       | 503     |
 * | 429 (límite del proveedor)                 | 429     |
 * | sin respuesta a tiempo                     | 504     |
 * | 400/404 (modelo o petición), 5xx, sin red  | 502     |
 */
export function toProviderError(error) {
  if (error instanceof AppError) return error;

  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError || error?.status === 402) {
    console.error(`[ai] el proveedor ha rechazado la petición (${error.status}): revisa la API key, los permisos o el saldo`);
    return new ServiceUnavailableError(AI_MESSAGES.DISABLED);
  }
  if (error instanceof RateLimitError) {
    console.warn("[ai] el proveedor devuelve 429 (límite de uso)");
    return new TooManyRequestsError(AI_MESSAGES.BUSY);
  }
  // El SDK distingue su propio timeout; un AbortSignal.timeout llega como TimeoutError.
  if (error instanceof APIConnectionTimeoutError || error?.name === "TimeoutError") {
    console.warn("[ai] el proveedor no ha respondido a tiempo");
    return new GatewayTimeoutError(AI_MESSAGES.TIMEOUT);
  }
  if (error instanceof APIUserAbortError) {
    // El usuario se fue (cerró el chat o la pestaña): nadie va a leer la respuesta.
    return new BadGatewayError(AI_MESSAGES.FAILED);
  }
  if (error instanceof APIError) {
    console.error(`[ai] error del proveedor (${error.status ?? "sin estado"}): ${error.message}`);
    return new BadGatewayError(AI_MESSAGES.FAILED);
  }
  if (error instanceof APIConnectionError) {
    console.error(`[ai] no se puede conectar con el proveedor: ${error.message}`);
    return new BadGatewayError(AI_MESSAGES.FAILED);
  }
  console.error("[ai] error inesperado al llamar al modelo:", error);
  return new BadGatewayError(AI_MESSAGES.FAILED);
}
