import "dotenv/config";
import { z } from "zod";
import { AI_PROVIDERS } from "../constants/ai.constants.js";

const positiveInt = (fallback) => z.coerce.number().int().positive().default(fallback);

/*
 * A propósito, aquí no hay ninguna URI de base de datos: este servicio no tiene acceso a ella. Lo que sabe de la
 * tienda (la sesión y los datos públicos) lo pide a la API por HTTP (CORE_API_URL).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: positiveInt(3001),
  CORE_API_URL: z.url("CORE_API_URL debe ser una URL (p. ej. http://localhost:3000/api)").default("http://localhost:3000/api"),
  // Orígenes del front, separados por comas (CORS y comprobación de Origin). Obligatoria en producción.
  CORS_ORIGIN: z.string().optional(),

  AI_PROVIDER: z.enum(AI_PROVIDERS, { error: `AI_PROVIDER solo admite: ${AI_PROVIDERS.join(", ")}` }).default("openrouter"),
  // Opcionales: sin la del proveedor elegido el servicio arranca igual y el asistente responde 503.
  OPENROUTER_API_KEY: z.string().trim().optional(),
  XAI_API_KEY: z.string().trim().optional(),
  AI_MODEL: z.string().trim().optional(),

  AI_MAX_TOKENS: positiveInt(600),
  AI_TIMEOUT_MS: positiveInt(25_000),
  AI_MAX_TOOL_STEPS: positiveInt(4),
  AI_RATE_LIMIT_PER_HOUR: positiveInt(30),
  // Cuánto se espera a la API de la tienda antes de dar 503.
  CORE_API_TIMEOUT_MS: positiveInt(5_000),
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

const corsOrigins = (data.CORS_ORIGIN?.trim() || DEV_CORS_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const API_KEYS = { openrouter: data.OPENROUTER_API_KEY, xai: data.XAI_API_KEY, fake: "fake" };

export const env = Object.freeze({
  ...data,
  isProduction: data.NODE_ENV === "production",
  corsOrigins: Object.freeze(corsOrigins),
  // Sin barra final, para componer rutas con `${coreApiUrl}/auth/me`.
  coreApiUrl: data.CORE_API_URL.replace(/\/+$/, ""),
  /** La key del proveedor elegido (nunca se registra ni se devuelve). */
  aiApiKey: API_KEYS[data.AI_PROVIDER] || null,
  /** ¿Puede responder el asistente? El proveedor fake siempre; los reales, si tienen key y modelo. */
  aiEnabled: data.AI_PROVIDER === "fake" || Boolean(API_KEYS[data.AI_PROVIDER] && data.AI_MODEL),
});
