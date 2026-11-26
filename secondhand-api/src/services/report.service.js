import { REPORT_TARGET, REVIEW_MESSAGES } from "../constants/review.constants.js";
import { reportRepository } from "../repositories/report.repository.js";
import { reviewRepository } from "../repositories/review.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/AppError.js";

const sameId = (a, b) => String(a) === String(b);

/**
 * Denuncias. De momento, de valoraciones (las de preguntas llegan con las preguntas, V7). La revisión la hace un
 * admin en el panel (V5).
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
};
