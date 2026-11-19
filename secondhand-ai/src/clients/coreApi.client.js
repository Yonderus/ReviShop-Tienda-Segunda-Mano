import { env } from "../config/env.js";
import { AI_MESSAGES, SESSION_COOKIE_NAME } from "../constants/ai.constants.js";
import { ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError, ValidationError } from "../utils/AppError.js";

/*
 * Cliente de la API de la tienda. Es la ÚNICA fuente de datos de este servicio: no hay base de datos.
 *
 * - La sesión se comprueba con `GET /auth/me`, reenviando solo la cookie de la sesión. Así se respeta todo lo
 *   que decide la API (token revocado con el logout, usuario suspendido…), sin compartir JWT_SECRET.
 * - Los datos de la tienda salen de `/shop/*`, que es público y de solo lectura: no se reenvía la cookie.
 */

/** `{ category: ["a","b"], maxPrice: 300 }` → `category=a,b&maxPrice=300` (el formato que entiende /shop). */
function toQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join(","));
    } else {
      query.set(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/**
 * Una petición GET a la API. Devuelve `data` o lanza un AppError:
 * sin respuesta o 5xx → 503; 401/403/404 → el mismo código con el mensaje de la API.
 */
async function get(path, { cookie, query } = {}) {
  let response;
  try {
    response = await fetch(`${env.coreApiUrl}${path}${toQuery(query)}`, {
      headers: { Accept: "application/json", ...(cookie && { Cookie: cookie }) },
      signal: AbortSignal.timeout(env.CORE_API_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn(`[core-api] GET ${path}: ${error.name === "TimeoutError" ? "sin respuesta a tiempo" : error.message}`);
    throw new ServiceUnavailableError(AI_MESSAGES.CORE_UNAVAILABLE);
  }

  const body = await response.json().catch(() => null);
  if (response.ok && body?.success) return body.data;

  const message = body?.message;
  if (response.status === 401) throw new UnauthorizedError(message);
  if (response.status === 403) throw new ForbiddenError(message);
  if (response.status === 404) throw new NotFoundError(message);
  // Parámetros que la API no acepta (p. ej. un filtro mal formado): con el detalle de cada campo.
  if (response.status === 400 || response.status === 422) throw new ValidationError(message, body?.errors);
  console.warn(`[core-api] GET ${path}: ${response.status}`);
  throw new ServiceUnavailableError(AI_MESSAGES.CORE_UNAVAILABLE);
}

export const coreApi = {
  /**
   * El usuario de la sesión, o lanza 401/403. Solo se reenvía la cookie de la sesión (ninguna otra que tenga
   * el navegador) y se devuelve solo lo que este servicio necesita.
   */
  async me(sessionToken) {
    const user = await get("/auth/me", { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}` });
    return { id: String(user._id), name: user.name, role: user.role?.slug ?? null };
  },

  /** `GET /shop/products` con los mismos query params que el shop: `{ items, pagination, search? }`. */
  searchProducts(params) {
    return get("/shop/products", { query: params });
  },

  getProduct(slug) {
    return get(`/shop/products/${encodeURIComponent(slug)}`);
  },

  getProductVariants(slug) {
    return get(`/shop/products/${encodeURIComponent(slug)}/variants`);
  },

  listCategories() {
    return get("/shop/categories");
  },

  listLocations() {
    return get("/shop/locations");
  },
};
