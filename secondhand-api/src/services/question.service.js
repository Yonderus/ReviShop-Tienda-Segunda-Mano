import { QUESTION_MESSAGES } from "../constants/question.constants.js";
import { productRepository } from "../repositories/product.repository.js";
import { questionRepository } from "../repositories/question.repository.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { isOwnerOrAdmin } from "../utils/access.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/AppError.js";
import { publicAuthor } from "../utils/publicAuthor.js";

const sameId = (a, b) => String(a) === String(b);
const MINUTE_MS = 60 * 1000;

/**
 * Una pregunta tal como se enseña. `viewer` decide lo que puede hacer con ella (lo calcula la API para que el front
 * no repita las reglas): responder y ocultar el vendedor (o un admin), borrar quien la hizo si sigue sin respuesta,
 * denunciar el resto de usuarios con sesión.
 */
function toView(question, viewer) {
  const isSellerOrAdmin = Boolean(viewer) && isOwnerOrAdmin(viewer, question.sellerId);
  const isAsker = Boolean(viewer) && sameId(question.askerId?._id ?? question.askerId, viewer.id);
  return {
    _id: question._id,
    text: question.text,
    asker: publicAuthor(question.askerId),
    createdAt: question.createdAt,
    answer: question.answer ? { text: question.answer.text, answeredAt: question.answer.answeredAt } : null,
    hidden: Boolean(question.hiddenAt),
    can: {
      answer: isSellerOrAdmin && !question.answer,
      hide: isSellerOrAdmin,
      delete: isAsker && !question.answer,
      // El vendedor no denuncia en su anuncio: ya puede ocultarla.
      report: Boolean(viewer) && !isAsker && !isSellerOrAdmin && !question.hiddenAt,
    },
  };
}

/** Una pregunta viva, o 404. */
async function findQuestion(id) {
  const question = await questionRepository.findRawById(id);
  if (!question) throw new NotFoundError(QUESTION_MESSAGES.NOT_FOUND);
  return question;
}

/** La mediana: con un número impar, la del medio; con par, la media de las dos del medio. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export const questionService = {
  /**
   * Las preguntas de un producto a la venta (respondidas primero). El vendedor y los admin ven también las ocultas,
   * marcadas, para poder volver a mostrarlas. 404 si el producto no está a la venta (como su ficha).
   */
  async listForProduct(slug, viewer = null) {
    const productId = await shopRepository.findOnSaleIdBySlug(slug);
    if (!productId) throw new NotFoundError(QUESTION_MESSAGES.PRODUCT_NOT_FOUND);
    const product = await productRepository.findRawById(productId);
    const includeHidden = Boolean(viewer) && isOwnerOrAdmin(viewer, product.sellerId);
    const questions = await questionRepository.findByProduct(productId, { includeHidden });
    return questions.map((question) => toView(question, viewer));
  },

  /** Preguntar en un anuncio a la venta. El vendedor no pregunta en lo suyo (403). */
  async ask(productId, text, actor) {
    const product = await productRepository.findRawById(productId);
    if (!product || product.deletedAt || !product.isActive) throw new NotFoundError(QUESTION_MESSAGES.PRODUCT_NOT_FOUND);
    if (sameId(product.sellerId, actor.id)) throw new ForbiddenError(QUESTION_MESSAGES.OWN_PRODUCT);
    const question = await questionRepository.create({ productId, sellerId: product.sellerId, askerId: actor.id, text });
    return toView(await questionRepository.findViewById(question._id), actor);
  },

  /** Responder: el vendedor del producto (o un admin), una sola vez (409 si ya tenía respuesta). */
  async answer(id, text, actor) {
    const question = await findQuestion(id);
    if (!isOwnerOrAdmin(actor, question.sellerId)) throw new ForbiddenError(QUESTION_MESSAGES.ONLY_SELLER_ANSWERS);
    const updated = await questionRepository.setAnswerIfNone(id, { text, answeredAt: new Date(), answeredBy: actor.id });
    if (!updated) throw new ConflictError(QUESTION_MESSAGES.ALREADY_ANSWERED);
    return toView(updated, actor);
  },

  /** Ocultar o volver a mostrar: el vendedor del producto o un admin. */
  async setHidden(id, hidden, actor, reason = null) {
    const question = await findQuestion(id);
    if (!isOwnerOrAdmin(actor, question.sellerId)) throw new ForbiddenError(QUESTION_MESSAGES.ONLY_SELLER_HIDES);
    return toView(await questionRepository.setHidden(id, hidden, actor.id, reason, new Date()), actor);
  },

  /** Borrar la tuya mientras no tenga respuesta (409 si ya la tiene). */
  async remove(id, actor) {
    const question = await findQuestion(id);
    if (!sameId(question.askerId, actor.id)) throw new ForbiddenError(QUESTION_MESSAGES.ONLY_ASKER_DELETES);
    if (!(await questionRepository.softDeleteIfUnanswered(id, new Date()))) throw new ConflictError(QUESTION_MESSAGES.ANSWERED_CANNOT_DELETE);
  },

  /** Las que tengo sin responder en mis anuncios (Mi actividad). Un admin, las de sus propios anuncios. */
  async unansweredFor(actor) {
    const questions = await questionRepository.findUnansweredForSeller(actor.id);
    return questions.map((question) => ({
      _id: question._id,
      text: question.text,
      createdAt: question.createdAt,
      product: question.productId ? { title: question.productId.title, slug: question.productId.slug } : null,
    }));
  },

  countUnansweredFor(userId) {
    return questionRepository.countUnansweredForSeller(userId);
  },

  /**
   * "Suele responder en…": la mediana, en minutos, de lo que tardó en contestar sus últimas preguntas (null si aún no
   * ha respondido ninguna). La mediana y no la media: una pregunta contestada al cabo de una semana no lo estropea.
   */
  async responseMinutes(sellerId) {
    const answered = await questionRepository.findRecentAnswered(sellerId);
    if (!answered.length) return null;
    return Math.max(1, Math.round(median(answered.map((q) => q.answer.answeredAt - q.createdAt)) / MINUTE_MS));
  },
};
