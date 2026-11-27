import { z } from "zod";
import { coreApi } from "../clients/coreApi.client.js";
import { AI_MESSAGES, REVIEW_SUMMARY } from "../constants/ai.constants.js";
import { complete } from "../llm/index.js";
import { REVIEW_SUMMARY_PROMPT, reviewSummaryUserMessage } from "../prompts/reviews.prompt.js";
import { BadGatewayError } from "../utils/AppError.js";
import { cleanDescription } from "./listing.service.js";

/*
 * «Lo que dicen de Lucía»: un resumen de los comentarios de las valoraciones de un vendedor.
 *
 * - Este servicio sigue SIN base de datos: las valoraciones las pide a la API pública (`/shop/sellers/:slug/reviews`),
 *   que ya quita las que aún no se ven (sistema ciego) y las ocultas por moderación.
 * - El modelo solo resume texto. La nota media, el número y las barras los calcula la API.
 * - Caché en memoria por vendedor. La clave incluye cuántas valoraciones hay y cuál es la última: una valoración
 *   nueva (o una que se oculta o se restaura) cambia la clave y el resumen se rehace; el resto de visitas no pagan.
 */

/** Lo que tiene que devolver el modelo. Si no cumple, no se enseña nada (502): mejor sin resumen que uno raro. */
const modelSchema = z.object({
  summary: z.string().trim().min(10),
  strengths: z.array(z.string().trim().min(2)).max(10).default([]),
  improvements: z.array(z.string().trim().min(2)).max(10).default([]),
});

/** El JSON de la respuesta, aunque el modelo lo envuelva en texto o en un bloque ```json. */
function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Un punto fuerte o a mejorar: limpio, corto y sin vacíos ni repetidos. */
const cleanPoints = (points) =>
  [...new Set(points.map((point) => cleanDescription(point).replace(/[.;,]+$/, "").slice(0, REVIEW_SUMMARY.POINT_MAX_LENGTH)).filter(Boolean))].slice(
    0,
    REVIEW_SUMMARY.POINTS_MAX,
  );

/** Un comentario tal como se le pasa al modelo: una línea, sin comillas dobles (que cerrarían la cita) y recortado. */
const asQuote = (text) =>
  text.replace(/\s+/g, " ").replace(/"/g, "'").trim().slice(0, REVIEW_SUMMARY.COMMENT_MAX_LENGTH);

// ── Caché (LRU sencilla: un Map conserva el orden de inserción) ──
const cache = new Map();
const inFlight = new Map();

function remember(key, value) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > REVIEW_SUMMARY.CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

/**
 * Sin `signal` a propósito: la llamada se comparte entre visitas y se guarda en la caché, así que si el primero que
 * la pidió se va, se termina igual (ya está pagada y la usará el siguiente).
 */
async function generate(comments) {
  const completion = await complete({
    messages: [
      { role: "system", content: REVIEW_SUMMARY_PROMPT },
      { role: "user", content: reviewSummaryUserMessage(comments) },
    ],
    json: true,
  });
  const parsed = modelSchema.safeParse(parseJson(completion.content));
  if (!parsed.success) {
    console.warn("[ai] el resumen de valoraciones no tiene el formato pedido");
    throw new BadGatewayError(AI_MESSAGES.FAILED);
  }
  const summary = cleanDescription(parsed.data.summary).slice(0, REVIEW_SUMMARY.SUMMARY_MAX_LENGTH);
  if (summary.length < 10) throw new BadGatewayError(AI_MESSAGES.FAILED);
  return { summary, strengths: cleanPoints(parsed.data.strengths), improvements: cleanPoints(parsed.data.improvements) };
}

export const reviewSummaryService = {
  /**
   * `{ summary, strengths, improvements, basedOn, generatedAt, cached }`, o `null` si tiene menos de
   * REVIEW_SUMMARY.MIN_COMMENTS comentarios (no hay de qué resumir y no se llama al modelo).
   * 404 si el usuario no existe (lo dice la API).
   */
  async forSeller(slug) {
    const page = await coreApi.sellerReviews(slug, REVIEW_SUMMARY.FETCH_LIMIT);
    const comments = page.items
      .filter((review) => review.comment?.trim())
      .slice(0, REVIEW_SUMMARY.MAX_COMMENTS)
      .map((review) => ({ rating: review.rating, text: asQuote(review.comment) }));
    if (comments.length < REVIEW_SUMMARY.MIN_COMMENTS) return null;

    // Cambia si hay una valoración nueva, se oculta o se restaura una (cambia el total o la más reciente).
    const latest = page.items[0];
    const key = `${slug}|${page.pagination.total}|${latest._id}|${latest.publishedAt}`;
    const cached = cache.get(key);
    if (cached) {
      remember(key, cached); // la mueve al final: es de las usadas hace poco
      return { ...cached, cached: true };
    }

    // Dos visitas a la vez al mismo perfil sin caché: una sola llamada al modelo, que comparten.
    if (!inFlight.has(key)) {
      inFlight.set(
        key,
        generate(comments)
          .then((result) => {
            const value = { ...result, basedOn: comments.length, generatedAt: new Date().toISOString() };
            remember(key, value);
            return value;
          })
          .finally(() => inFlight.delete(key)),
      );
    }
    return { ...(await inFlight.get(key)), cached: false };
  },
};
