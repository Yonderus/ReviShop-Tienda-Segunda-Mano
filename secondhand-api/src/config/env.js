import "dotenv/config";
import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "../constants/user.constants.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI es obligatoria"),
  // Orígenes del front, separados por comas: los únicos desde los que se aceptan escrituras (checkOrigin). CORS lo
  // pone el gateway. En desarrollo, por defecto el front de `ng serve`; en producción es obligatoria (abajo).
  CORS_ORIGIN: z.string().optional(),
  // Firma de los JWT: quien la conozca puede fabricar tokens válidos. Larga, aleatoria y fuera del repositorio.
  JWT_SECRET: z
    .string({ error: "JWT_SECRET es obligatoria (genera una con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")" })
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  // Duración del access token (formato de jsonwebtoken: 15m, 1h, 7d…). Corto a propósito: el front lo renueva solo
  // con el refresh token, así que si alguien lo roba le dura poco.
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(/^\d+(ms|s|m|h|d|w|y)$/, "JWT_ACCESS_EXPIRES_IN debe ser un número con unidad: 15m, 1h, 7d…")
    .default("15m"),
  // La duración de antes, cuando había un solo token. Ya no se usa (ver el aviso de abajo).
  JWT_EXPIRES_IN: z.string().optional(),
  // Refresh token: cuántos días vale cada uno, el tope de una sesión desde el login (rotar no lo alarga) y el margen
  // en el que reutilizar uno recién rotado no cuenta como robo (dos pestañas refrescando a la vez).
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number({ error: "REFRESH_TOKEN_TTL_DAYS debe ser un número" }).int().positive().default(7),
  REFRESH_SESSION_MAX_DAYS: z.coerce.number({ error: "REFRESH_SESSION_MAX_DAYS debe ser un número" }).int().positive().default(30),
  REFRESH_REUSE_GRACE_SECONDS: z.coerce.number({ error: "REFRESH_REUSE_GRACE_SECONDS debe ser un número" }).int().min(0).default(30),
  // Solo la usa el seed; el servidor arranca sin ella.
  SEED_DEFAULT_PASSWORD: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `SEED_DEFAULT_PASSWORD debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .optional(),
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

const corsOrigins = (parsed.data.CORS_ORIGIN?.trim() || DEV_CORS_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  /** Orígenes del front permitidos (comprobación de `Origin`), ya separados. */
  corsOrigins: Object.freeze(corsOrigins),
  /** Lo que dura el access token. */
  accessTokenExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
});

// Un .env de antes de los dos tokens: se avisa en vez de usarla (un access de 1 día anularía la ventaja del refresh).
if (parsed.data.JWT_EXPIRES_IN && !process.env.JWT_ACCESS_EXPIRES_IN) {
  console.warn(
    `JWT_EXPIRES_IN ya no se usa: el access token dura JWT_ACCESS_EXPIRES_IN (${env.accessTokenExpiresIn}) y el front lo ` +
      "renueva solo con el refresh token. Quita JWT_EXPIRES_IN del .env (o pon JWT_ACCESS_EXPIRES_IN si quieres otra duración).",
  );
}
