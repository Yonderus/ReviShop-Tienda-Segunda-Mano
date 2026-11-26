import { REPORT_STATUS, REPORT_VIEW } from "../constants/review.constants.js";
import { Report } from "../models/report.model.js";

const WITH_DELETED = { withDeleted: true };
// Quien denunció y quien resolvió: nombre y slug, nunca el email.
const PEOPLE_POPULATE = [
  { path: "reporterId", select: "name slug", options: WITH_DELETED },
  { path: "resolvedBy", select: "name slug", options: WITH_DELETED },
];

/** Abiertas = por revisar · resueltas = descartadas o con acción. */
const statusFilter = (view) => (view === REPORT_VIEW.OPEN ? { status: REPORT_STATUS.OPEN } : { status: { $ne: REPORT_STATUS.OPEN } });

export const reportRepository = {
  create(data) {
    return Report.create(data);
  },

  findRawById(id) {
    return Report.findById(id).lean();
  },

  /** El panel: las abiertas, las más antiguas primero (llevan más tiempo esperando); las resueltas, las últimas primero. */
  async findPage(view, { skip, limit }) {
    const filter = statusFilter(view);
    const sort = view === REPORT_VIEW.OPEN ? { createdAt: 1, _id: 1 } : { resolvedAt: -1, _id: -1 };
    const [items, total] = await Promise.all([
      Report.find(filter).sort(sort).skip(skip).limit(limit).populate(PEOPLE_POPULATE).lean(),
      Report.countDocuments(filter),
    ]);
    return { items, total };
  },

  /** Cuántas hay en cada pestaña (las pestañas y el contador del resumen). */
  async countByView() {
    const [open, resolved] = await Promise.all([
      Report.countDocuments(statusFilter(REPORT_VIEW.OPEN)),
      Report.countDocuments(statusFilter(REPORT_VIEW.RESOLVED)),
    ]);
    return { open, resolved };
  },

  /**
   * Resuelve una denuncia solo si sigue abierta, en una sola operación: si dos admins la resuelven a la vez, solo
   * gana uno. Devuelve la denuncia o null.
   */
  resolveIfOpen(id, status, by, now) {
    return Report.findOneAndUpdate({ _id: id, status: REPORT_STATUS.OPEN }, { status, resolvedBy: by, resolvedAt: now }, { new: true }).lean();
  },

  /** Al ocultar lo denunciado, el resto de denuncias abiertas de lo mismo quedan resueltas a la vez. */
  resolveOpenForTarget(targetType, targetId, status, by, now) {
    return Report.updateMany({ targetType, targetId, status: REPORT_STATUS.OPEN }, { status, resolvedBy: by, resolvedAt: now });
  },

  /** Cuántas denuncias tiene cada objetivo (para "3 denuncias" en el panel). */
  async countByTargets(targetIds) {
    const rows = await Report.aggregate([{ $match: { targetId: { $in: targetIds } } }, { $group: { _id: "$targetId", count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
  },
};
