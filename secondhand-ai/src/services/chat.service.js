import { complete } from "../llm/index.js";
import { SHOP_ASSISTANT_PROMPT } from "../prompts/system.prompt.js";

export const chatService = {
  /**
   * Una vuelta de conversación. `messages` ya viene validado (solo `user`/`assistant`, el último del usuario).
   * Las instrucciones (`system`) las pone siempre el servidor, delante del historial.
   * La respuesta tiene siempre la misma forma; `products` y `shopQuery` se rellenan cuando el agente busque en
   * la tienda (tools).
   *
   * @param {{ role: "user" | "assistant", content: string }[]} messages
   * @param {{ id: string }} user el usuario de la sesión (para los logs)
   * @param {AbortSignal} [signal] se aborta si el usuario se va antes de la respuesta
   */
  async reply(messages, user, signal) {
    const { content } = await complete({
      messages: [{ role: "system", content: SHOP_ASSISTANT_PROMPT }, ...messages],
      signal,
      user,
    });
    return { reply: content, products: [], shopQuery: null };
  },
};
