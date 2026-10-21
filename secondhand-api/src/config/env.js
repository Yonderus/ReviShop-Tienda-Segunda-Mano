import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI es obligatoria"),
  CORS_ORIGIN: z.string().optional(),
  // Solo la usa el seed; el servidor arranca sin ella.
  SEED_DEFAULT_PASSWORD: z.string().min(8, "SEED_DEFAULT_PASSWORD debe tener al menos 8 caracteres").optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  console.error(`Configuración de entorno no válida:\n${problems.join("\n")}`);
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
});
