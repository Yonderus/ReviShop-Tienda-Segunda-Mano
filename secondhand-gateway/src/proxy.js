import { createProxyMiddleware, debugProxyErrorsPlugin, proxyEventsPlugin } from "http-proxy-middleware";

/*
 * Un proxy por servicio. Decisiones que evitan los fallos típicos de un gateway:
 *
 * - Se monta con `app.use(proxy)` y un `pathFilter`, NO con `app.use("/api", proxy)`: Express quitaría el prefijo
 *   y la API recibiría `/products` en vez de `/api/products`.
 * - El filtro es una función: con el texto "/api", también entraría "/apix".
 * - Delante NO hay `express.json()`: leería el body y el servicio lo recibiría vacío. El gateway solo reenvía.
 * - El Host se conserva (sin `changeOrigin`): la API compara el Origin con su propio origen, que para el
 *   navegador es el del gateway (Swagger cargado desde :4000).
 * - Los errores salen con el formato de siempre ({ success: false, message }) en vez del texto plano del plugin
 *   de la librería, que por eso se quita (`ejectPlugins`) y se vuelven a poner solo los que se usan.
 */

/** "::ffff:127.0.0.1" → "127.0.0.1". */
const clientIp = (req) => (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");

/**
 * El gateway es la puerta de entrada: lo que diga el cliente en X-Forwarded-* no vale (se podría inventar una IP
 * para saltarse el límite de intentos de login). Se borran y se ponen los de verdad: la IP de quien se ha
 * conectado al gateway, el protocolo y el Host que pidió.
 */
function setForwardedHeaders(proxyReq, req) {
  for (const header of ["forwarded", "x-forwarded-for", "x-forwarded-proto", "x-forwarded-host", "x-forwarded-port", "x-real-ip"]) {
    proxyReq.removeHeader(header);
  }
  proxyReq.setHeader("x-forwarded-for", clientIp(req));
  proxyReq.setHeader("x-forwarded-proto", req.socket.encrypted ? "https" : "http");
  if (req.headers.host) proxyReq.setHeader("x-forwarded-host", req.headers.host);
}

/** CORS lo pone el gateway (con `Vary: Origin`): si el servicio trae su propio Vary, se juntan en vez de pisarse. */
function keepVaryOrigin(proxyRes) {
  const vary = proxyRes.headers.vary;
  if (vary && !/\borigin\b/i.test(vary)) proxyRes.headers.vary = `${vary}, Origin`;
}

const CONNECTION_REFUSED = new Set(["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "EAI_AGAIN"]);

/**
 * @param {object} config
 * @param {string} config.name      para los logs ("api", "ia")
 * @param {string} config.target    URL del servicio
 * @param {(path: string) => boolean} config.matches   qué rutas le tocan
 * @param {number} config.timeoutMs cuánto se espera su respuesta
 * @param {{ down: string, slow: string }} config.messages  lo que ve el usuario si no responde
 */
export function serviceProxy({ name, target, matches, timeoutMs, messages }) {
  return createProxyMiddleware({
    target,
    pathFilter: (path) => matches(path),
    proxyTimeout: timeoutMs,
    ejectPlugins: true,
    plugins: [debugProxyErrorsPlugin, proxyEventsPlugin],
    on: {
      proxyReq: (proxyReq, req) => {
        req.gatewayStartedAt = Date.now();
        setForwardedHeaders(proxyReq, req);
      },
      proxyRes: keepVaryOrigin,
      error: (err, req, res) => {
        // httpxy corta la conexión al pasarse el `proxyTimeout` (llega como ECONNRESET): se distingue por el tiempo.
        const elapsed = Date.now() - (req.gatewayStartedAt ?? Date.now());
        const timedOut = err.code === "ECONNRESET" && elapsed >= timeoutMs - 50;
        const status = timedOut ? 504 : 502;
        const reason = timedOut ? `sin respuesta en ${timeoutMs} ms` : CONNECTION_REFUSED.has(err.code) ? "no está arrancado" : err.code || err.message;
        console.warn(`[gateway] ${req.method} ${req.originalUrl ?? req.url} → ${name}: ${reason} (${status})`);

        if (typeof res.writeHead !== "function") return res.destroy?.();
        if (res.headersSent) return res.end();
        res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: timedOut ? messages.slow : messages.down }));
      },
    },
  });
}

/** `/api/ai` y lo que cuelga de él. */
export const isAiPath = (path) => path === "/api/ai" || path.startsWith("/api/ai/");

/** El resto de `/api` (la IA se reparte antes, pero se excluye igualmente para que el filtro se lea solo). */
export const isApiPath = (path) => (path === "/api" || path.startsWith("/api/")) && !isAiPath(path);
