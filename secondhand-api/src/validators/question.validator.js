import { z } from "zod";
import { QUESTION_ANSWER_MAX, QUESTION_TEXT } from "../constants/question.constants.js";

export const askQuestionSchema = z.object({
  text: z
    .string({ error: "Escribe la pregunta" })
    .trim()
    .min(QUESTION_TEXT.MIN, `La pregunta debe tener al menos ${QUESTION_TEXT.MIN} caracteres`)
    .max(QUESTION_TEXT.MAX, `La pregunta no puede superar ${QUESTION_TEXT.MAX} caracteres`),
});

export const answerQuestionSchema = z.object({
  text: z
    .string({ error: "Escribe la respuesta" })
    .trim()
    .min(2, "Escribe la respuesta")
    .max(QUESTION_ANSWER_MAX, `La respuesta no puede superar ${QUESTION_ANSWER_MAX} caracteres`),
});

export const setQuestionHiddenSchema = z.object({
  hidden: z.boolean({ error: "hidden es obligatorio y debe ser true o false" }),
  reason: z.string().trim().max(300, "El motivo no puede superar 300 caracteres").optional(),
});
