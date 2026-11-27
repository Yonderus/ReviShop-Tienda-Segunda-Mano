import { RESPONSE_TIME_SAMPLE } from "../constants/question.constants.js";
import { Question } from "../models/question.model.js";

const WITH_DELETED = { withDeleted: true };
// Quien preguntó: lo justo para decidir si se enseña su nombre (si su cuenta sigue en pie). Nunca el email.
const ASKER_POPULATE = { path: "askerId", select: "name slug isActive status deletedAt", options: WITH_DELETED };
const LIVE = { deletedAt: null };

export const questionRepository = {
  create(data) {
    return Question.create(data);
  },

  /** Con quien preguntó (para devolverla tal como se enseña). */
  findViewById(id) {
    return Question.findById(id).populate(ASKER_POPULATE).lean();
  },

  /** Incluye ocultas (el service decide quién las ve); las borradas, no. */
  findRawById(id) {
    return Question.findOne({ _id: id, ...LIVE }).lean();
  },

  /**
   * Las de un producto: las respondidas primero y, dentro de cada grupo, las más recientes. Con `includeHidden`
   * (el vendedor o un admin) también las ocultas, para poder volver a mostrarlas.
   */
  async findByProduct(productId, { includeHidden }) {
    const filter = { productId, ...LIVE, ...(includeHidden ? {} : { hiddenAt: null }) };
    const items = await Question.find(filter).sort({ createdAt: -1 }).populate(ASKER_POPULATE).lean();
    return items.sort((a, b) => Number(Boolean(b.answer)) - Number(Boolean(a.answer)));
  },

  /** La respuesta, una sola vez: solo se guarda si aún no había (aunque lleguen dos a la vez). Devuelve la pregunta o null. */
  setAnswerIfNone(id, answer) {
    return Question.findOneAndUpdate({ _id: id, ...LIVE, answer: null }, { answer }, { new: true }).populate(ASKER_POPULATE).lean();
  },

  setHidden(id, hidden, by, reason, now) {
    const changes = hidden ? { hiddenAt: now, hiddenBy: by, hiddenReason: reason ?? null } : { hiddenAt: null, hiddenBy: null, hiddenReason: null };
    return Question.findOneAndUpdate({ _id: id, ...LIVE }, changes, { new: true }).populate(ASKER_POPULATE).lean();
  },

  /** Borrar la suya, solo si sigue sin respuesta (en una sola operación). Devuelve la pregunta o null. */
  softDeleteIfUnanswered(id, now) {
    return Question.findOneAndUpdate({ _id: id, ...LIVE, answer: null }, { deletedAt: now }, { new: true }).lean();
  },

  /** Las que un vendedor tiene sin responder (visibles y no borradas), las más antiguas primero. */
  findUnansweredForSeller(sellerId) {
    return Question.find({ sellerId, ...LIVE, hiddenAt: null, answer: null })
      .sort({ createdAt: 1 })
      .populate({ path: "productId", select: "title slug", options: WITH_DELETED })
      .lean();
  },

  countUnansweredForSeller(sellerId) {
    return Question.countDocuments({ sellerId, ...LIVE, hiddenAt: null, answer: null });
  },

  /** Las últimas respondidas por un vendedor: solo las fechas, para el tiempo de respuesta. */
  findRecentAnswered(sellerId) {
    return Question.find({ sellerId, answer: { $ne: null } })
      .sort({ "answer.answeredAt": -1 })
      .limit(RESPONSE_TIME_SAMPLE)
      .select("createdAt answer.answeredAt")
      .lean();
  },

  /** Para el panel de denuncias: varias preguntas con quien preguntó y el producto. */
  findForModeration(ids) {
    return Question.find({ _id: { $in: ids } })
      .populate([ASKER_POPULATE, { path: "productId", select: "title slug sellerId", options: WITH_DELETED }])
      .lean();
  },
};
