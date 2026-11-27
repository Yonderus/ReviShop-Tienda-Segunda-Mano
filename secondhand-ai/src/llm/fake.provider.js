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
 * Con las instrucciones del asistente de anuncio, redacta una descripción con los datos (ver listingDraft).
 * Con las del resumen de valoraciones, devuelve un JSON con los comentarios (ver reviewSummary).
 */
import { LISTING_ASSISTANT_PROMPT } from "../prompts/listing.prompt.js";
import { REVIEW_SUMMARY_PROMPT } from "../prompts/reviews.prompt.js";

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

/**
 * Asistente de anuncio: una descripción con los datos recibidos. Para probar la limpieza, si el título lleva
 * "#sucio" devuelve formato, enlace, correo y teléfono; "#largo", un texto enorme; "#corto", casi nada.
 */
function listingDraft(userMessage) {
  const field = (name) => new RegExp(`^${name}: (.*)$`, "m").exec(userMessage)?.[1] ?? "";
  const title = field("Título");
  if (title.includes("#sucio")) {
    return '"**Vendo** esto. Escríbeme a vendedor@correo.es o al 612 345 678.\n- Más fotos en https://ejemplo.com/fotos"';
  }
  if (title.includes("#largo")) return "Está como nuevo y funciona perfectamente. ".repeat(40);
  if (title.includes("#corto")) return "Ok";
  return `Vendo ${title} (${field("Categoría")}) en estado "${field("Estado").toLowerCase()}". Lo vendo porque ya no lo uso. Si tienes dudas o quieres más fotos, pregúntame.`;
}

/**
 * Resumen de valoraciones: un JSON hecho con los comentarios (cuántos hay y si alguno es de 1 o 2 estrellas). Para
 * probar la validación y la limpieza: si un comentario lleva "#roto" devuelve algo que no es JSON; "#markdown", el
 * JSON dentro de un bloque ```json con formato, un correo y un teléfono; "#vacio", un JSON sin resumen.
 */
function reviewSummary(userMessage) {
  const lines = userMessage.split("\n").slice(1);
  if (userMessage.includes("#roto")) return "Lo siento, no puedo resumir esto.";
  if (userMessage.includes("#vacio")) return '{"summary": "", "strengths": [], "improvements": []}';
  const low = lines.filter((line) => /\((1|2)\/5\)/.test(line)).length;
  const json = JSON.stringify({
    summary: `Los compradores comentan ${lines.length} experiencias con este vendedor.${low ? " Alguno señala problemas con el estado del producto." : ""}`,
    strengths: ["Buen trato", "Responde rápido", "Buen trato"],
    improvements: low ? ["Estado del producto"] : [],
  });
  if (userMessage.includes("#markdown")) {
    return "```json\n" + json.replace("Los compradores", "**Los compradores** (escribe a fake@correo.es o al 612 345 678)") + "\n```";
  }
  return json;
}

/** @param {{ messages: { role: string, content: string }[] }} input */
export async function complete({ messages }) {
  const lastUser = messages.findLast((message) => message.role === "user")?.content ?? "";
  if (messages[0]?.content === LISTING_ASSISTANT_PROMPT) return reply(listingDraft(lastUser));
  if (messages[0]?.content === REVIEW_SUMMARY_PROMPT) return reply(reviewSummary(lastUser));
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
