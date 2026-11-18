import { complete } from "../llm/index.js";

export const chatService = {
  /**
   * Una vuelta de conversación. `messages` ya viene validado (solo `user`/`assistant`, el último del usuario).
   * La respuesta tiene siempre la misma forma; `products` y `shopQuery` se rellenan cuando el agente busque en
   * la tienda (tools).
   *
   * @param {{ role: "user" | "assistant", content: string }[]} messages
   * @param {{ id: string, name: string }} _user el usuario de la sesión (para los logs y el límite)
   */
  async reply(messages, _user) {
    const { content } = await complete({ messages });
    return { reply: content, products: [], shopQuery: null };
  },
};
