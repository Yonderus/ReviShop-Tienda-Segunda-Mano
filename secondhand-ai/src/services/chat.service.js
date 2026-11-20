import { env } from "../config/env.js";
import { AI_MESSAGES } from "../constants/ai.constants.js";
import { AGENT_SHOP } from "../constants/shop.constants.js";
import { complete } from "../llm/index.js";
import { SHOP_ASSISTANT_PROMPT } from "../prompts/system.prompt.js";
import { TOOL_DEFINITIONS, runTool } from "../tools/index.js";

/**
 * Bucle del agente: modelo → herramientas → modelo… hasta que conteste con texto o se agoten las vueltas
 * (`AI_MAX_TOOL_STEPS`). Sin frameworks: se ve entero aquí.
 *
 * Lo que vuelve al front:
 * - `reply`: el texto del modelo (el front lo pinta como texto, nunca como HTML);
 * - `products`: los de la ÚLTIMA búsqueda, tal cual los devolvió la API (las tarjetas no dependen del modelo);
 * - `shopQuery`: los filtros de esa búsqueda, con los nombres de los query params de `/shop/products`
 *   (para el botón "Ver todos en la tienda"), o null si no hubo búsqueda con resultados.
 */
export const chatService = {
  /**
   * @param {{ role: "user" | "assistant", content: string }[]} history ya validado (solo user/assistant)
   * @param {{ id: string }} user el usuario de la sesión (para los logs)
   * @param {AbortSignal} [signal] se aborta si el usuario se va antes de la respuesta
   */
  async reply(history, user, signal) {
    // Las instrucciones las pone siempre el servidor, delante del historial.
    const messages = [{ role: "system", content: SHOP_ASSISTANT_PROMPT }, ...history];
    const context = { products: [], shopQuery: null };

    for (let step = 0; step < env.AI_MAX_TOOL_STEPS; step++) {
      const { content, toolCalls } = await complete({ messages, tools: TOOL_DEFINITIONS, signal, user });
      if (!toolCalls.length) return { reply: content, ...context };

      // Se atienden como mucho MAX_CALLS_PER_STEP llamadas por vuelta; el resto no se ejecuta, pero la API de
      // OpenAI exige una respuesta para cada `tool_call_id`, así que también se le contesta.
      // Sin texto, `content` se omite (la API de OpenAI lo permite cuando hay `tool_calls`): no todos los
      // proveedores compatibles aceptan `content: null`.
      messages.push({ role: "assistant", ...(content ? { content } : {}), tool_calls: toolCalls });
      for (const [index, call] of toolCalls.entries()) {
        const result =
          index < AGENT_SHOP.MAX_CALLS_PER_STEP
            ? await runTool(call, context)
            : { error: `Demasiadas herramientas a la vez: como mucho ${AGENT_SHOP.MAX_CALLS_PER_STEP}` };
        // El resultado va SIEMPRE como mensaje `tool` (datos), nunca como `system` ni `user`.
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    // Vueltas agotadas: respuesta honesta, con lo último que se encontró (si se encontró algo).
    console.warn(`[ai] user=${user?.id ?? "-"}: el agente agotó ${env.AI_MAX_TOOL_STEPS} vueltas sin contestar`);
    return { reply: AI_MESSAGES.INCOMPLETE, ...context };
  },
};
