import { z } from "zod";
import {
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  REVIEW_COMMENT,
  REVIEW_LOW_RATING,
  REVIEW_MESSAGES,
  REVIEW_PAGE,
  REVIEW_RATING,
  REVIEW_REPLY_MAX,
  REVIEWEE_ROLES,
} from "../constants/review.constants.js";

const stars = (label) =>
  z
    .number({ error: `${label} debe ser un número de ${REVIEW_RATING.MIN} a ${REVIEW_RATING.MAX}` })
    .int(`${label} debe ser un número entero`)
    .min(REVIEW_RATING.MIN, `${label}: como mínimo ${REVIEW_RATING.MIN}`)
    .max(REVIEW_RATING.MAX, `${label}: como máximo ${REVIEW_RATING.MAX}`);

/** Un texto opcional: vacío (o solo espacios) cuenta como "no lo ha escrito". */
const optionalText = (max, label) =>
  z
    .string({ error: `${label} debe ser un texto` })
    .trim()
    .max(max, `${label} no puede superar ${max} caracteres`)
    .optional()
    .transform((value) => value || undefined);

/**
 * Valorar una venta. Qué criterios tocan depende de a quién se valora (lo decide el service, que sabe si eres el
 * comprador o el vendedor); aquí solo su forma. El comentario es obligatorio con nota baja.
 */
export const createReviewSchema = z
  .object({
    rating: stars("La nota"),
    // Estricto: un apartado que no existe es un error, no algo que se ignora en silencio.
    criteria: z.strictObject(
      {
        asDescribed: stars("«Como se anunciaba»").optional(),
        communication: stars("«Trato y comunicación»").optional(),
        punctuality: stars("«Puntualidad»").optional(),
      },
      {
        error: (issue) =>
          issue.code === "unrecognized_keys"
            ? "criteria solo admite asDescribed, communication y punctuality"
            : "criteria debe ser un objeto con la nota de cada apartado",
      },
    ),
    comment: optionalText(REVIEW_COMMENT.MAX, "El comentario"),
  })
  .superRefine((data, ctx) => {
    if (data.rating <= REVIEW_LOW_RATING && (data.comment?.length ?? 0) < REVIEW_COMMENT.MIN_WHEN_LOW) {
      ctx.addIssue({ code: "custom", path: ["comment"], message: REVIEW_MESSAGES.COMMENT_REQUIRED });
    }
  });

export const replySchema = z.object({
  text: z
    .string({ error: "La respuesta es obligatoria" })
    .trim()
    .min(2, "Escribe la respuesta")
    .max(REVIEW_REPLY_MAX, `La respuesta no puede superar ${REVIEW_REPLY_MAX} caracteres`),
});

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, { error: `reason debe ser: ${REPORT_REASONS.join(", ")}` }),
  note: optionalText(REPORT_NOTE_MAX, "La nota"),
});

export const publicReviewsQuerySchema = z.object({
  role: z.enum(REVIEWEE_ROLES, { error: `role debe ser: ${REVIEWEE_ROLES.join(", ")}` }).default("seller"),
  rating: z.coerce.number({ error: "rating debe ser un número" }).int().min(REVIEW_RATING.MIN).max(REVIEW_RATING.MAX).optional(),
  page: z.coerce.number({ error: "page debe ser un número" }).int().min(1, "page empieza en 1").default(1),
  limit: z.coerce
    .number({ error: "limit debe ser un número" })
    .int()
    .min(1, "limit debe ser al menos 1")
    .max(REVIEW_PAGE.MAX_LIMIT, `limit no puede superar ${REVIEW_PAGE.MAX_LIMIT}`)
    .default(REVIEW_PAGE.DEFAULT_LIMIT),
});
