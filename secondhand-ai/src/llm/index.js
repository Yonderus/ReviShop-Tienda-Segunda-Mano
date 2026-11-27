import { env } from "../config/env.js";
import { AI_MESSAGES } from "../constants/ai.constants.js";
import { BadGatewayError, ServiceUnavailableError } from "../utils/AppError.js";
import { toProviderError } from "./errors.js";
import * as fakeProvider from "./fake.provider.js";
import * as openaiProvider from "./openai.provider.js";

/*
 * Punto único de acceso al modelo: el resto del servicio llama a `complete()` sin saber qué proveedor hay
 * detrás. Aquí se elige el proveedor, se traducen sus errores y se registra cada llamada.
 */

const provider = env.AI_PROVIDER === "fake" ? fakeProvider : openaiProvider;

/** Lo que se puede contar del proveedor (para /health y los logs). Nunca la key. */
export const providerInfo = () => ({
  provider: env.AI_PROVIDER,
  model: env.AI_PROVIDER === "fake" ? "fake" : env.AI_MODEL || null,
  enabled: env.aiEnabled,
});

/**
 * @param {{ messages: object[], tools?: object[], signal?: AbortSignal, user?: { id: string } }} input
 * @returns {Promise<{ content: string, toolCalls: object[], usage: object | null, model: string }>}
 */
export async function complete({ messages, tools, json, signal, user }) {
  if (!env.aiEnabled) throw new ServiceUnavailableError(AI_MESSAGES.DISABLED);

  const startedAt = Date.now();
  let result;
  try {
    result = await provider.complete({ messages, tools, json, signal });
  } catch (error) {
    throw toProviderError(error);
  }

  // Lo justo para controlar el gasto y la latencia. Nunca el contenido de los mensajes ni la key.
  const tokens = result.usage ? `${result.usage.prompt_tokens}+${result.usage.completion_tokens} tokens` : "tokens ?";
  console.log(`[ai] user=${user?.id ?? "-"} model=${result.model} ${tokens} ${Date.now() - startedAt}ms`);

  // Sin texto ni herramientas no hay nada que enseñar (p. ej. el modelo cortó por max_tokens antes de empezar).
  if (!result.content && !result.toolCalls.length) throw new BadGatewayError(AI_MESSAGES.FAILED);
  return result;
}
