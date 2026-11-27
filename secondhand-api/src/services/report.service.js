import {
  REPORT_ACTION,
  REPORT_REASON_LABELS,
  REPORT_STATUS,
  REPORT_TARGET,
  REVIEW_MESSAGES,
} from "../constants/review.constants.js";
import { QUESTION_MESSAGES } from "../constants/question.constants.js";
import { questionRepository } from "../repositories/question.repository.js";
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

/** Una pregunta denunciada, tal como la ve el admin: el texto, la respuesta, quién preguntó y en qué anuncio. */
function toModerationQuestion(question) {
  return {
    _id: question._id,
    text: question.text,
    answer: question.answer ? { text: question.answer.text, answeredAt: question.answer.answeredAt } : null,
    product: question.productId ? { title: question.productId.title, slug: question.productId.slug } : null,
    author: person(question.askerId),
    createdAt: question.createdAt,
    hiddenAt: question.hiddenAt,
    hiddenReason: question.hiddenReason,
  };
}

/** Guarda una denuncia (una por usuario y objetivo: el índice único da 409 la segunda vez). */
async function createReport(targetType, targetId, { reason, note }, actor) {
  try {
    const report = await reportRepository.create({ targetType, targetId, reporterId: actor.id, reason, note: note || null });
    return { _id: report._id, status: report.status };
  } catch (error) {
    if (error?.code === 11000) throw new ConflictError(REVIEW_MESSAGES.ALREADY_REPORTED);
    throw error;
  }
}

/**
 * Denuncias de valoraciones y de preguntas: las hacen los usuarios (`reportReview`, `reportQuestion`) y las
 * resuelve un admin en el panel (`list`, `resolve`).
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
    return createReport(REPORT_TARGET.REVIEW, review._id, { reason, note }, actor);
  },

  /** Denunciar una pregunta: las mismas reglas (que se vea, que no sea tuya, una vez). */
  async reportQuestion(questionId, { reason, note }, actor) {
    const question = await questionRepository.findRawById(questionId);
    if (!question || question.hiddenAt) throw new NotFoundError(QUESTION_MESSAGES.NOT_FOUND);
    if (sameId(question.askerId, actor.id)) throw new ForbiddenError(REVIEW_MESSAGES.CANNOT_REPORT_OWN);
    return createReport(REPORT_TARGET.QUESTION, question._id, { reason, note }, actor);
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
    const idsOf = (type) => items.filter((r) => r.targetType === type).map((r) => r.targetId);
    const [reviews, questions, reportCounts] = await Promise.all([
      reviewRepository.findForModeration(idsOf(REPORT_TARGET.REVIEW)),
      questionRepository.findForModeration(idsOf(REPORT_TARGET.QUESTION)),
      reportRepository.countByTargets(items.map((r) => r.targetId)),
    ]);
    // Lo denunciado, ya en la forma del panel, por su id (los ids de valoraciones y preguntas no se repiten).
    const targetById = new Map([
      ...reviews.map((review) => [String(review._id), toModerationReview(review)]),
      ...questions.map((question) => [String(question._id), toModerationQuestion(question)]),
    ]);

    return {
      items: items.map((report) => {
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
          target: targetById.get(String(report.targetId)) ?? null,
        };
      }),
      pagination: paginationOf(total, page, limit),
      counts,
    };
  },

  /**
   * Resolver una denuncia abierta:
   * - `dismiss`: lo denunciado se queda; solo esta denuncia pasa a `dismissed`.
   * - `hide`: se oculta lo denunciado (una valoración sale de lo público y de las medias; una pregunta, de la ficha)
   *   con el motivo, y TODAS sus denuncias abiertas pasan a `actioned`: no tiene sentido revisar otra vez algo oculto.
   * Ya resuelta (o la resolvió otro admin a la vez) → 409.
   */
  async resolve(id, action, admin) {
    const now = new Date();
    const report = await reportRepository.findRawById(id);
    if (!report) throw new NotFoundError(REVIEW_MESSAGES.REPORT_NOT_FOUND);
    if (report.status !== REPORT_STATUS.OPEN) throw new ConflictError(REVIEW_MESSAGES.REPORT_ALREADY_RESOLVED);

    if (action === REPORT_ACTION.HIDE) {
      const isQuestion = report.targetType === REPORT_TARGET.QUESTION;
      const target = isQuestion ? await questionRepository.findRawById(report.targetId) : await reviewRepository.findRawById(report.targetId);
      if (!target) throw new ConflictError(REVIEW_MESSAGES.TARGET_GONE);
      const resolved = await reportRepository.resolveIfOpen(id, REPORT_STATUS.ACTIONED, admin.id, now);
      if (!resolved) throw new ConflictError(REVIEW_MESSAGES.REPORT_ALREADY_RESOLVED);
      const reason = REPORT_REASON_LABELS[report.reason];
      if (!target.hiddenAt) {
        if (isQuestion) await questionRepository.setHidden(target._id, true, admin.id, reason, now);
        else await reviewRepository.setHidden(target._id, true, reason, now);
      }
      await reportRepository.resolveOpenForTarget(report.targetType, report.targetId, REPORT_STATUS.ACTIONED, admin.id, now);
      return { _id: id, status: REPORT_STATUS.ACTIONED };
    }

    const resolved = await reportRepository.resolveIfOpen(id, REPORT_STATUS.DISMISSED, admin.id, now);
    if (!resolved) throw new ConflictError(REVIEW_MESSAGES.REPORT_ALREADY_RESOLVED);
    return { _id: id, status: REPORT_STATUS.DISMISSED };
  },
};
