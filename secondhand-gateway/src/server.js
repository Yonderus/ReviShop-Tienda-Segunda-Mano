import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { isAiPath, isApiPath, serviceProxy } from "./proxy.js";

/*
 * API Gateway de Revishop (puerto 4000): la única puerta que conoce el navegador.
 *
 *   /api/ai/**  → servicio de IA (3001)
 *   /api/**     → API de la tienda (3000)
 *
 * Aquí viven CORS y los logs de entrada. La API y la IA siguen escuchando en sus puertos, y la IA sigue hablando
 * directamente con la API (sesión y productos) sin pasar por aquí. Si un servicio se cae, el gateway responde
 * 502/504 con el formato de siempre y el otro sigue funcionando.
 */
const app = express();

app.use(helmet());
// CORS en un solo sitio: si también lo pusieran la API o la IA, la cabecera saldría dos veces y el navegador
// rechazaría la respuesta. Las preflight (OPTIONS) se contestan aquí mismo.
app.use(cors({ origin: [...env.corsOrigins], credentials: true }));
app.use(morgan("dev"));

/** El gateway está vivo (no pregunta a los servicios: cada uno tiene su propio health). */
app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", routes: { "/api/ai": env.aiUrl, "/api": env.apiUrl } } });
});

// Orden: primero la IA (es más concreta) y después el resto de /api.
app.use(
  serviceProxy({
    name: "ia",
    target: env.aiUrl,
    matches: isAiPath,
    timeoutMs: env.AI_PROXY_TIMEOUT_MS,
    messages: {
      down: "El asistente no está disponible ahora mismo. Inténtalo de nuevo en un rato",
      slow: "El asistente ha tardado demasiado en responder. Prueba de nuevo",
    },
  }),
);
app.use(
  serviceProxy({
    name: "api",
    target: env.apiUrl,
    matches: isApiPath,
    timeoutMs: env.API_PROXY_TIMEOUT_MS,
    messages: {
      down: "La tienda no responde ahora mismo. Inténtalo de nuevo en unos segundos",
      slow: "La tienda ha tardado demasiado en responder. Inténtalo de nuevo",
    },
  }),
);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Lo inesperado (no debería pasar: el gateway no lee bodies ni tiene lógica): se registra y 500 sin detalles.
app.use((err, req, res, _next) => {
  console.error(`[500] ${req.method} ${req.originalUrl}`, err);
  if (!res.headersSent) res.status(500).json({ success: false, message: "Error interno del gateway" });
});

// ── Arranque y apagado ──

const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

const server = app.listen(env.PORT, () => {
  console.log(`Gateway running on port ${env.PORT} · /api/ai → ${env.aiUrl} · /api → ${env.apiUrl}`);
});
server.on("error", (err) => {
  console.error(err.code === "EADDRINUSE" ? `El puerto ${env.PORT} ya está en uso` : "Error del servidor HTTP:", err.message);
  process.exit(1);
});

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  console.log(`Cerrando el gateway (${reason})…`);
  setTimeout(() => {
    console.error("El cierre ordenado tarda demasiado: se fuerza la salida");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
  server.close(() => console.log("Gateway cerrado"));
  server.closeIdleConnections();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => console.error("Promesa rechazada sin capturar:", reason));
process.on("uncaughtException", (err) => {
  console.error("Excepción no capturada:", err);
  shutdown("excepción no capturada", 1);
});
