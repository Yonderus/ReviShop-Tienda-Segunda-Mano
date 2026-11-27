import {
  REVIEW_CRITERIA,
  REVIEW_MESSAGES,
  REVIEWEE_ROLE,
} from "../constants/review.constants.js";
import { SALE_MESSAGES, SALE_STATE } from "../constants/sale.constants.js";
import { reviewRepository } from "../repositories/review.repository.js";
import { saleRepository } from "../repositories/sale.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { paginationOf, skipFor } from "../utils/pagination.js";
import { publicAuthor } from "../utils/publicAuthor.js";
import { questionService } from "./question.service.js";

const sameId = (a, b) => String(a) === String(b);
const round1 = (value) => (value === null || value === undefined ? null : Math.round(value * 10) / 10);

/**
 * Los criterios que tocan según a quién se valora: todos los de ese lado y ninguno más (al comprador no se le
 * pregunta si el producto estaba "como se anunciaba"). El error va en el campo exacto: `criteria.punctuality`.
 */
function assertCriteria(role, criteria = {}) {
  const expected = REVIEW_CRITERIA[role];
  const errors = [
    ...expected.filter((key) => criteria[key] === undefined).map((key) => ({ field: `criteria.${key}`, message: "Puntúa este apartado de 1 a 5" })),
    ...Object.keys(criteria)
      .filter((key) => !expected.includes(key))
      .map((key) => ({ field: `criteria.${key}`, message: "Este apartado no se valora en esta venta" })),
  ];
  if (errors.length) throw new ValidationError(undefined, errors);
}

/** Una valoración tal como se enseña en público. Nunca emails ni ids internos de la venta. */
export function toPublicReview(review) {
  return {
    _id: review._id,
    revieweeRole: review.revieweeRole,
    rating: review.rating,
    criteria: review.criteria,
    comment: review.comment,
    reply: review.reply,
    product: { title: review.snapshot.productTitle, slug: review.snapshot.productSlug },
    reviewer: publicAuthor(review.reviewerId),
    publishedAt: review.visibleAt,
  };
}

/** Lo que ve quien la escribió (antes de que se publique, también): su nota y cuándo saldrá. */
export function toOwnReview(review, now = new Date()) {
  return {
    _id: review._id,
    rating: review.rating,
    criteria: review.criteria,
    comment: review.comment,
    reply: review.reply,
    visibleAt: review.visibleAt,
    isPublished: review.visibleAt <= now,
    createdAt: review.createdAt,
  };
}

/** Medias de un papel, con valores por defecto cuando aún no hay ninguna. */
function toSummary(row, role) {
  const criteria = Object.fromEntries(REVIEW_CRITERIA[role].map((key) => [key, round1(row?.[key])]));
  return {
    average: round1(row?.average),
    count: row?.count ?? 0,
    distribution: Object.fromEntries([5, 4, 3, 2, 1].map((star) => [star, row?.[`s${star}`] ?? 0])),
    criteria,
  };
}

async function findPublicUser(slug) {
  const user = await userRepository.findPublicBySlug(slug);
  if (!user) throw new NotFoundError(REVIEW_MESSAGES.SELLER_NOT_FOUND);
  return user;
}

export const reviewService = {
  /**
   * Valorar a la otra parte de una venta. Reglas:
   * - solo las dos partes (al resto, 404: las ventas son privadas);
   * - la venta está confirmada y dentro de su ventana (409 si no);
   * - una por venta y lado, y no se edita (409);
   * - los criterios del lado que toca (422) y comentario obligatorio con nota baja (lo comprueba Zod).
   *
   * **Sistema ciego:** se guarda con `visibleAt` = fin de la ventana. Si el otro ya había valorado, las dos se
   * publican ahora mismo (`revealSale`). Se cuenta DESPUÉS de guardar: si los dos valoran a la vez, al menos uno
   * de los dos verá las dos y las publicará.
   */
  async create(saleId, { rating, criteria, comment }, actor) {
    const now = new Date();
    const sale = await saleRepository.findRawById(saleId);
    const isBuyer = sale && sameId(sale.buyerId, actor.id);
    const isSeller = sale && sameId(sale.sellerId, actor.id);
    if (!isBuyer && !isSeller) throw new NotFoundError(SALE_MESSAGES.NOT_FOUND);
    if (sale.status !== SALE_STATE.CONFIRMED) throw new ConflictError(REVIEW_MESSAGES.SALE_NOT_CONFIRMED);
    if (sale.reviewWindowEndsAt <= now) throw new ConflictError(REVIEW_MESSAGES.WINDOW_CLOSED);

    // El comprador valora al vendedor y el vendedor al comprador.
    const revieweeRole = isBuyer ? REVIEWEE_ROLE.SELLER : REVIEWEE_ROLE.BUYER;
    assertCriteria(revieweeRole, criteria);

    let review;
    try {
      review = await reviewRepository.create({
        saleId: sale._id,
        reviewerId: actor.id,
        revieweeId: isBuyer ? sale.sellerId : sale.buyerId,
        revieweeRole,
        rating,
        criteria,
        comment: comment || null,
        snapshot: { productTitle: sale.snapshot.title, productSlug: sale.snapshot.slug },
        visibleAt: sale.reviewWindowEndsAt,
      });
    } catch (error) {
      if (error?.code === 11000) throw new ConflictError(REVIEW_MESSAGES.ALREADY_REVIEWED);
      throw error;
    }

    if ((await reviewRepository.countBySale(sale._id)) === 2) await reviewRepository.revealSale(sale._id, now);
    return toOwnReview(await reviewRepository.findRawById(review._id), now);
  },

  /** La respuesta del valorado: una sola, y solo cuando la valoración ya es pública (antes no la puede ver). */
  async reply(reviewId, text, actor) {
    const now = new Date();
    const review = await reviewRepository.findRawById(reviewId);
    if (!review || review.hiddenAt) throw new NotFoundError(REVIEW_MESSAGES.NOT_FOUND);
    if (!sameId(review.revieweeId, actor.id)) throw new ForbiddenError(REVIEW_MESSAGES.ONLY_REVIEWEE_REPLIES);
    if (review.visibleAt > now) throw new ConflictError(REVIEW_MESSAGES.NOT_VISIBLE_YET);
    const updated = await reviewRepository.setReplyIfNone(reviewId, { text, createdAt: now });
    if (!updated) throw new ConflictError(REVIEW_MESSAGES.ALREADY_REPLIED);
    return toPublicReview({ ...updated, reviewerId: (await userRepository.findRawById(updated.reviewerId)) ?? null });
  },

  /**
   * Moderación a mano (admin): ocultar una valoración (sale de lo público y de las medias) o volver a mostrarla.
   * Ocultar no la borra: se puede deshacer. Quien la escribió la sigue viendo en Mi actividad (es suya); el valorado,
   * no (como el resto de la gente).
   */
  async setHidden(reviewId, { hidden, reason }) {
    const review = await reviewRepository.setHidden(reviewId, hidden, reason, new Date());
    if (!review) throw new NotFoundError(REVIEW_MESSAGES.NOT_FOUND);
    return { _id: review._id, hiddenAt: review.hiddenAt, hiddenReason: review.hiddenReason };
  },

  // ── Público: perfil y valoraciones de un usuario ──

  /** El perfil público: quién es, desde cuándo, cuántas ventas ha cerrado y sus medias como vendedor y comprador. */
  async publicProfile(slug) {
    const now = new Date();
    const user = await findPublicUser(slug);
    const [asSeller, asBuyer, salesCount, responseMinutes] = await Promise.all([
      reviewRepository.summaryFor(user._id, REVIEWEE_ROLE.SELLER, now),
      reviewRepository.summaryFor(user._id, REVIEWEE_ROLE.BUYER, now),
      saleRepository.countConfirmedAsSeller(user._id),
      questionService.responseMinutes(user._id),
    ]);
    return {
      _id: user._id,
      name: user.name,
      slug: user.slug,
      ...(user.profile?.avatar ? { avatarUrl: user.profile.avatar.url } : {}),
      ...(user.profile?.location ? { location: user.profile.location } : {}),
      ...(user.profile?.bio ? { bio: user.profile.bio } : {}),
      memberSince: user.createdAt,
      salesCount,
      // "Suele responder en…": mediana de sus últimas respuestas a preguntas (null si aún no ha respondido ninguna).
      responseMinutes,
      ratings: { asSeller: toSummary(asSeller, REVIEWEE_ROLE.SELLER), asBuyer: toSummary(asBuyer, REVIEWEE_ROLE.BUYER) },
    };
  },

  /** Las valoraciones públicas de un usuario en un papel, paginadas, las más recientes primero. */
  async listPublic(slug, { role, rating, page, limit }) {
    const user = await findPublicUser(slug);
    const { items, total } = await reviewRepository.findPublicPage(user._id, role, { rating, skip: skipFor(page, limit), limit }, new Date());
    return { items: items.map(toPublicReview), pagination: paginationOf(total, page, limit) };
  },

  /** Para la tarjeta del vendedor en la ficha: `{ average, count }` como vendedor. */
  async sellerRating(userId) {
    const row = await reviewRepository.summaryFor(userId, REVIEWEE_ROLE.SELLER, new Date());
    return { average: round1(row?.average), count: row?.count ?? 0 };
  },
};
