/*
 * Proveedor de pruebas: responde sin llamar a nadie, siempre igual para la misma entrada. Sirve para desarrollar
 * y verificar sin API key, sin internet y sin gastar. Misma forma de respuesta que el proveedor real.
 */

/**
 * @param {{ messages: { role: string, content: string }[] }} input
 */
export async function complete({ messages }) {
  const last = messages.findLast((message) => message.role === "user");
  return {
    content: `Eco: ${last?.content ?? ""}`,
    toolCalls: [],
    usage: null,
    model: "fake",
  };
}
