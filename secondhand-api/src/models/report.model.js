import mongoose from "mongoose";
import { REPORT_NOTE_MAX, REPORT_REASONS, REPORT_STATUS, REPORT_STATUSES, REPORT_TARGETS } from "../constants/review.constants.js";

/**
 * Report: un usuario denuncia una valoración (y, más adelante, una pregunta) para que la revise un admin.
 *
 * Colección `reports`. Polimórfica como Image: `targetType` + `targetId`. Cada usuario denuncia una vez la misma
 * cosa (índice único). Relaciones: N Report → 1 User (quien denuncia) · N Report → 1 Review/Question.
 *
 * Registro de moderación: sin isActive, soft delete ni slug. Lo que cambia es su `status`.
 */
const reportSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String, trim: true, maxlength: REPORT_NOTE_MAX, default: null },

    status: { type: String, enum: REPORT_STATUSES, default: REPORT_STATUS.OPEN },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { collection: "reports", timestamps: true, id: false },
);

reportSchema.index({ targetType: 1, targetId: 1, reporterId: 1 }, { unique: true });
// El panel: las abiertas, las más antiguas primero.
reportSchema.index({ status: 1, createdAt: 1 });

export const Report = mongoose.model("Report", reportSchema);
