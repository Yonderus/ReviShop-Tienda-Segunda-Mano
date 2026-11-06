import "./config/zod.js";
import { createWriteStream, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { swaggerSpec } from "./config/swagger.js";
import { checkOrigin } from "./middlewares/origin.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import { productVariantRoutes, productVariantsOfProductRoutes } from "./routes/productVariant.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import roleRoutes from "./routes/role.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import userRoutes, { sellerRoutes } from "./routes/user.routes.js";
import { NotFoundError } from "./utils/AppError.js";
import { errorHandler } from "./utils/errorHandler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet());
// La sesión va en una cookie: solo los orígenes del front (CORS_ORIGIN) y con `credentials`, también en
// desarrollo. Con un origen abierto (`*`), el navegador no enviaría la cookie.
app.use(cors({ origin: [...env.corsOrigins], credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(morgan("dev"));
// logs/ está en .gitignore: en un clon nuevo no existe y, sin ella, el stream fallaría y tumbaría el proceso.
const logsDir = join(__dirname, "..", "logs");
mkdirSync(logsDir, { recursive: true });
const accessLogStream = createWriteStream(join(logsDir, "access.log"), { flags: "a" });
accessLogStream.on("error", (err) => console.error("No se puede escribir en logs/access.log:", err.message));
app.use(morgan("combined", { stream: accessLogStream }));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "Revishop API" }));
// Escrituras solo desde el front o la propia API (defensa contra CSRF, junto con SameSite=Strict).
app.use("/api", checkOrigin);
// Quién puede usar cada ruta lo dice su archivo de rutas (authenticate, adminOnly). Lo que no lo pone es público.
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/products/:id/variants", productVariantsOfProductRoutes);
app.use("/api/products", productRoutes);
app.use("/api/variants", productVariantRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
// Tienda pública (Home y Shop), separada del CRUD de productos.
app.use("/api/shop", shopRoutes);

app.use((req, _res, next) => next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`)));

app.use(errorHandler);

// ── Arranque y apagado ──

// Si el cierre ordenado se atasca (una petición que no termina), se fuerza la salida.
const SHUTDOWN_TIMEOUT_MS = 10_000;
let server = null;
let shuttingDown = false;

/**
 * Deja de aceptar peticiones, espera a las que están en curso y cierra la conexión con MongoDB. Después el
 * proceso termina solo, con `exitCode`: llamar a `process.exit()` mientras las conexiones aún se cierran
 * hace fallar a Node en Windows (assertion UV_HANDLE_CLOSING).
 */
function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  console.log(`Cerrando la API (${reason})…`);
  // Red de seguridad, `unref`: no mantiene vivo el proceso si todo se cierra a tiempo.
  setTimeout(() => {
    console.error("El cierre ordenado tarda demasiado: se fuerza la salida");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  const closeServer = server
    ? new Promise((resolve) => {
        server.close(resolve);
        server.closeIdleConnections(); // las keep-alive sin petición en curso no tienen por qué esperar
      })
    : Promise.resolve();
  closeServer
    .then(() => disconnectDB())
    .then(() => console.log("API cerrada"))
    .catch((err) => {
      console.error("Error al cerrar:", err);
      process.exitCode = 1;
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
// Una promesa rechazada sin catch: se registra (con su traza) y la API sigue atendiendo.
process.on("unhandledRejection", (reason) => console.error("Promesa rechazada sin capturar:", reason));
// Una excepción fuera de cualquier petición deja el proceso en un estado desconocido: se registra y se cierra.
process.on("uncaughtException", (err) => {
  console.error("Excepción no capturada:", err);
  shutdown("excepción no capturada", 1);
});

connectDB()
  .then(() => {
    server = app.listen(env.PORT, () => console.log(`API running on port ${env.PORT}`));
    server.on("error", (err) => {
      console.error(err.code === "EADDRINUSE" ? `El puerto ${env.PORT} ya está en uso` : "Error del servidor HTTP:", err.message);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });
