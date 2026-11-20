import "dotenv/config";
import { z } from "zod";

const positiveInt = (fallback) => z.coerce.number().int().positive().default(fallback);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: positiveInt(4000),
  // Adónde reparte. Sin barra final ni /api: el gateway reenvía la ruta tal cual llega (/api/...).
  API_URL: z.url("API_URL debe ser una URL (p. ej. http://localhost:3000)").default("http://localhost:3000"),
  AI_URL: z.url("AI_URL debe ser una URL (p. ej. http://localhost:3001)").default("http://localhost:3001"),
  // Orígenes del front, separados por comas. CORS vive SOLO aquí (la API y la IA ya no lo ponen).
  CORS_ORIGIN: z.string().optional(),
  // Cuánto se espera a cada servicio. La IA más: una respuesta con herramientas puede llevar varias llamadas al
  // modelo, y el front ya corta a los 35 s.
  API_PROXY_TIMEOUT_MS: positiveInt(30_000),
  AI_PROXY_TIMEOUT_MS: positiveInt(45_000),
});

const DEV_CORS_ORIGIN = "http://localhost:4200";

const parsed = envSchema
  .refine((data) => data.NODE_ENV !== "production" || data.CORS_ORIGIN?.trim(), {
    path: ["CORS_ORIGIN"],
    message: "CORS_ORIGIN es obligatoria en producción (los orígenes del front, separados por comas)",
  })
  .safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  console.error(`Configuración de entorno no válida:\n${problems.join("\n")}`);
  process.exit(1);
}

const data = parsed.data;
const trimSlash = (url) => url.replace(/\/+$/, "");

export const env = Object.freeze({
  ...data,
  isProduction: data.NODE_ENV === "production",
  apiUrl: trimSlash(data.API_URL),
  aiUrl: trimSlash(data.AI_URL),
  corsOrigins: Object.freeze(
    (data.CORS_ORIGIN?.trim() || DEV_CORS_ORIGIN)
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
});
