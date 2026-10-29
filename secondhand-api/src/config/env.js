import "dotenv/config";
import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "../constants/user.constants.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI es obligatoria"),
  CORS_ORIGIN: z.string().optional(),
  // Firma de los JWT: quien la conozca puede fabricar tokens válidos. Larga, aleatoria y fuera del repositorio.
  JWT_SECRET: z
    .string({ error: "JWT_SECRET es obligatoria (genera una con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")" })
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  // Formato de jsonwebtoken: 15m, 1h, 7d…
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+(ms|s|m|h|d|w|y)$/, "JWT_EXPIRES_IN debe ser un número con unidad: 15m, 1h, 7d…")
    .default("1d"),
  // Solo la usa el seed; el servidor arranca sin ella.
  SEED_DEFAULT_PASSWORD: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `SEED_DEFAULT_PASSWORD debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .optional(),
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
