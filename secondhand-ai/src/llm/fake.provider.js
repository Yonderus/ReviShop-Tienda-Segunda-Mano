/*
 * Proveedor de pruebas: responde sin llamar a nadie, siempre igual para la misma entrada. Sirve para desarrollar
 * y verificar sin API key, sin internet y sin gastar. Misma forma de respuesta que el proveedor real.
 *
 * Guion (por el último mensaje del usuario):
 * - "busco …" / "busca …" / "buscar …"  → search_products({ search: "…" }) y después un resumen.
 * - "#tool nombre {json}"               → llama a esa herramienta con esos argumentos tal cual (aunque estén mal).
 * - "#loop"                              → pide herramientas sin parar (para probar el máximo de vueltas).
 * - "#many"                              → 6 herramientas en la misma vuelta (para probar el máximo por vuelta).
 * - cualquier otra cosa                  → "Eco: …".
 */

let counter = 0;
const toolCall = (name, args) => ({
  id: `call_fake_${++counter}`,
  type: "function",
  function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) },
});
const reply = (content, toolCalls = []) => ({ content, toolCalls, usage: null, model: "fake" });

/** Resume el último resultado de una herramienta, como haría un modelo. */
function summarize(toolMessage) {
  let result;
  try {
    result = JSON.parse(toolMessage.content);
  } catch {
    return "No he podido leer el resultado.";
  }
  if (result?.error) return `No he podido completarlo: ${result.error}`;
  if (typeof result?.total === "number") {
    if (result.total === 0) return "No he encontrado productos con esos filtros. Prueba con otra categoría o precio.";
    return `He encontrado ${result.total} productos. El primero es "${result.items[0].title}" por ${result.items[0].price} €.`;
  }
  if (Array.isArray(result)) return `Hay ${result.length} resultados.`;
  if (result?.title) return `"${result.title}" cuesta ${result.price} € y tiene ${result.variants?.length ?? 0} variantes.`;
  return "Hecho.";
}

/** @param {{ messages: { role: string, content: string }[] }} input */
export async function complete({ messages }) {
  const lastUser = messages.findLast((message) => message.role === "user")?.content ?? "";
  const last = messages.at(-1);

  if (lastUser.startsWith("#loop")) return reply("", [toolCall("list_categories", {})]);
  if (last?.role === "tool") return reply(summarize(last));

  if (lastUser.startsWith("#many")) return reply("", Array.from({ length: 6 }, () => toolCall("list_locations", {})));
  const tool = /^#tool\s+(\S+)\s*([\s\S]*)$/.exec(lastUser);
  if (tool) return reply("", [toolCall(tool[1], tool[2].trim() || "{}")]);
  const search = /^busc(?:o|a|ar)\s+(.{2,80})$/i.exec(lastUser.trim());
  if (search) return reply("", [toolCall("search_products", { search: search[1].trim() })]);

  return reply(`Eco: ${lastUser}`);
}
