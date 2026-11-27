import mongoose from "mongoose";
import { QUESTION_ANSWER_MAX, QUESTION_TEXT } from "../constants/question.constants.js";

const answerSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: QUESTION_ANSWER_MAX },
    answeredAt: { type: Date, required: true },
    // El vendedor, o un admin que responde por él.
    answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

/**
 * Question: una pregunta pública en un anuncio y, cuando llega, la respuesta del vendedor.
 *
 * Colección `questions`. Relaciones: N Question → 1 Product · N Question → 1 User (quien pregunta).
 * `sellerId` es una copia del vendedor del producto al preguntar: así "preguntas sin responder" y "suele responder
 * en…" se consultan sin cruzar con los productos.
 *
 * - `hiddenAt`: el vendedor oculta las que no aportan, o un admin las denunciadas. Se puede deshacer.
 * - `deletedAt`: quien preguntó la borra mientras no tenga respuesta. Sin el plugin de soft delete (no se restaura
 *   ni tiene papelera): solo se filtra.
 */
const questionSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    askerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── Datos ──
    text: { type: String, required: true, trim: true, minlength: QUESTION_TEXT.MIN, maxlength: QUESTION_TEXT.MAX },
    answer: { type: answerSchema, default: null },

    // ── Visibilidad ──
    hiddenAt: { type: Date, default: null },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    hiddenReason: { type: String, trim: true, maxlength: 300, default: null },
    deletedAt: { type: Date, default: null },
  },
  { collection: "questions", timestamps: true, id: false },
);

// ── Índices ──
// La ficha: las de un producto, sin borradas ni ocultas.
questionSchema.index({ productId: 1, deletedAt: 1, hiddenAt: 1, createdAt: -1 });
// "Tienes N preguntas sin responder" y el tiempo de respuesta del vendedor.
questionSchema.index({ sellerId: 1, "answer.answeredAt": -1 });

export const Question = mongoose.model("Question", questionSchema);
