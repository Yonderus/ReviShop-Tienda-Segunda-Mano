import "./config/zod.js";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { providerInfo } from "./llm/index.js";
import { checkOrigin } from "./middlewares/origin.middleware.js";
import aiRoutes from "./routes/ai.routes.js";
import { NotFoundError } from "./utils/AppError.js";
import { errorHandler } from "./utils/errorHandler.js";

/*
 * Servicio de IA de Revishop (puerto 3001). No tiene acceso a la base de datos: la sesión y los datos de la
 * tienda los pide a la API (CORE_API_URL).
 */
const app = express();

// Delante está el API Gateway (en la misma máquina): con esto, `req.ip` y `req.protocol` salen de
// X-Forwarded-For / X-Forwarded-Proto, pero solo si quien los pone es un proxy local.
app.set("trust proxy", "loopback");

app.use(helmet());
// CORS lo pone el gateway (si también lo pusiera este servicio, la cabecera saldría dos veces y el navegador
// rechazaría la respuesta). La comprobación de Origin (checkOrigin) sigue aquí.
// Un historial de 20 mensajes de 1000 caracteres cabe de sobra en 32 kB.
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/ai", checkOrigin);
app.use("/api/ai", aiRoutes);

app.use((req, _res, next) => next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`)));
app.use(errorHandler);

// ── Arranque y apagado ──

const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

const server = app.listen(env.PORT, () => {
  const { provider, model, enabled } = providerInfo();
  console.log(`AI service running on port ${env.PORT} · proveedor ${provider}${model ? ` (${model})` : ""}`);
  if (!enabled) console.warn("Asistente desactivado: falta la API key o AI_MODEL del proveedor. /chat responderá 503");
});
server.on("error", (err) => {
  console.error(err.code === "EADDRINUSE" ? `El puerto ${env.PORT} ya está en uso` : "Error del servidor HTTP:", err.message);
  process.exit(1);
});

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  console.log(`Cerrando el servicio de IA (${reason})…`);
  setTimeout(() => {
    console.error("El cierre ordenado tarda demasiado: se fuerza la salida");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
  server.close(() => console.log("Servicio de IA cerrado"));
  server.closeIdleConnections();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => console.error("Promesa rechazada sin capturar:", reason));
process.on("uncaughtException", (err) => {
  console.error("Excepción no capturada:", err);
  shutdown("excepción no capturada", 1);
});
