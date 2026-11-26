import {
  REPORT_ACTION,
  REPORT_REASON_LABELS,
  REPORT_STATUS,
  REPORT_TARGET,
  REVIEW_MESSAGES,
} from "../constants/review.constants.js";
import { reportRepository } from "../repositories/report.repository.js";
import { reviewRepository } from "../repositories/review.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/AppError.js";
import { paginationOf, skipFor } from "../utils/pagination.js";

const sameId = (a, b) => String(a) === String(b);
const person = (user) => (user?.name ? { name: user.name, slug: user.slug } : null);

/** Lo denunciado, tal como lo ve el admin: el contenido completo, quién lo escribió, a quién y si ya está oculto. */
function toModerationReview(review) {
  return {
    _id: review._id,
    rating: review.rating,
    criteria: review.criteria,
    comment: review.comment,
    reply: review.reply,
    revieweeRole: review.revieweeRole,
    product: { title: review.snapshot.productTitle, slug: review.snapshot.productSlug },
    author: person(review.reviewerId),
    reviewee: person(review.revieweeId),
    publishedAt: review.visibleAt,
    hiddenAt: review.hiddenAt,
    hiddenReason: review.hiddenReason,
  };
}

/**
 * Denuncias: las hacen los usuarios (`reportReview`) y las resuelve un admin en el panel (`list`, `resolve`).
 * De momento, de valoraciones (las de preguntas llegan con las preguntas, V7).
 */
export const reportService = {
  /**
   * Denunciar una valoración. Solo las que se ven (publicadas y no ocultas): lo que nadie ve, nadie lo puede
   * denunciar. No la denuncia quien la escribió, y cada usuario una vez (409).
   */
  async reportReview(reviewId, { reason, note }, actor) {
    const review = await reviewRepository.findRawById(reviewId);
    if (!review || review.hiddenAt || review.visibleAt > new Date()) throw new NotFoundError(REVIEW_MESSAGES.NOT_FOUND);
    if (sameId(review.reviewerId, actor.id)) throw new ForbiddenError(REVIEW_MESSAGES.CANNOT_REPORT_OWN);

    try {
      const report = await reportRepository.create({
        targetType: REPORT_TARGET.REVIEW,
        targetId: review._id,
        reporterId: actor.id,
        reason,
        note: note || null,
      });
      return { _id: report._id, status: report.status };
    } catch (error) {
      if (error?.code === 11000) throw new ConflictError(REVIEW_MESSAGES.ALREADY_REPORTED);
      throw error;
    }
  },

  /**
   * El panel: una página de denuncias (abiertas o resueltas), cada una con lo denunciado completo y cuántas
   * denuncias tiene (varias personas pueden denunciar lo mismo), y cuántas hay en cada pestaña.
   */
  async list({ view, page, limit }) {
    const [{ items, total }, counts] = await Promise.all([
      reportRepository.findPage(view, { skip: skipFor(page, limit), limit }),
      reportRepository.countByView(),
    ]);
    const reviewIds = items.filter((r) => r.targetType === REPORT_TARGET.REVIEW).map((r) => r.targetId);
    const [reviews, reportCounts] = await Promise.all([
      reviewRepository.findForModeration(reviewIds),
      reportRepository.countByTargets(items.map((r) => r.targetId)),
    ]);
    const reviewById = new Map(reviews.map((review) => [String(review._id), review]));

    return {
      items: items.map((report) => {
        const review = reviewById.get(String(report.targetId));
        return {
          _id: report._id,
          targetType: report.targetType,
          reason: report.reason,
          reasonLabel: REPORT_REASON_LABELS[report.reason],
          note: report.note,
          status: report.status,
          reporter: person(report.reporterId),
          createdAt: report.createdAt,
          resolvedBy: person(report.resolvedBy),
          resolvedAt: report.resolvedAt,
          reportsOnTarget: reportCounts[String(report.targetId)] ?? 1,
          // null si lo denunciado ya no existe (solo se podrá descartar).
          target: review ? toModerationReview(review) : null,
        };
      }),
      pagination: paginationOf(total, page, limit),
      counts,
    };
  },

  /**
   * Resolver una denuncia abierta:
   * - `dismiss`: la valoración se queda; solo esta denuncia pasa a `dismissed`.
   * - `hide`: se oculta la valoración (fuera de lo público y de las medias, con el motivo) y TODAS sus denuncias
   *   abiertas pasan a `actioned`: no tiene sentido revisar otra vez algo ya oculto.
   * Ya resuelta (o la resolvió otro admin a la vez) → 409.
   */
  async resolve(id, action, admin) {
    const now = new Date();
    const report = await reportRepository.findRawById(id);
    if (!report) throw new NotFoundError(REVIEW_MESSAGES.REPORT_NOT_FOUND);
    if (report.status !== REPORT_STATUS.OPEN) throw new ConflictError(REVIEW_MESSAGES.REPORT_ALREADY_RESOLVED);

    if (action === REPORT_ACTION.HIDE) {
      const review = await reviewRepository.findRawById(report.targetId);
      if (!review) throw new ConflictError(REVIEW_MESSAGES.TARGET_GONE);
      const resolved = await reportRepository.resolveIfOpen(id, REPORT_STATUS.ACTIONED, admin.id, now);
      if (!resolved) throw new ConflictError(REVIEW_MESSAGES.REPORT_ALREADY_RESOLVED);
      if (!review.hiddenAt) await reviewRepository.setHidden(review._id, true, REPORT_REASON_LABELS[report.reason], now);
      await reportRepository.resolveOpenForTarget(report.targetType, report.targetId, REPORT_STATUS.ACTIONED, admin.id, now);
      return { _id: id, status: REPORT_STATUS.ACTIONED };
    }

    const resolved = await reportRepository.resolveIfOpen(id, REPORT_STATUS.DISMISSED, admin.id, now);
    if (!resolved) throw new ConflictError(REVIEW_MESSAGES.REPORT_ALREADY_RESOLVED);
    return { _id: id, status: REPORT_STATUS.DISMISSED };
  },
};
