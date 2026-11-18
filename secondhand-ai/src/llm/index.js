import { env } from "../config/env.js";
import { AI_MESSAGES } from "../constants/ai.constants.js";
import { ServiceUnavailableError } from "../utils/AppError.js";

/*
 * Punto único de acceso al modelo: el resto del servicio llama a `complete()` sin saber qué proveedor hay
 * detrás. De momento (A1) solo responde el proveedor `fake`, con un eco; los proveedores reales (OpenRouter y
 * xAI) se conectan en la siguiente fase.
 */

/** Lo que se puede contar del proveedor (para /health y los logs). Nunca la key. */
export const providerInfo = () => ({ provider: env.AI_PROVIDER, model: env.AI_PROVIDER === "fake" ? "fake" : env.AI_MODEL || null, enabled: env.aiEnabled });

/**
 * @param {{ messages: { role: string, content: string }[] }} input
 * @returns {Promise<{ content: string }>}
 */
export async function complete({ messages }) {
  if (!env.aiEnabled) throw new ServiceUnavailableError(AI_MESSAGES.DISABLED);

  if (env.AI_PROVIDER === "fake") {
    const last = messages.findLast((message) => message.role === "user");
    return { content: `Eco: ${last?.content ?? ""}` };
  }

  throw new ServiceUnavailableError(AI_MESSAGES.DISABLED);
}
