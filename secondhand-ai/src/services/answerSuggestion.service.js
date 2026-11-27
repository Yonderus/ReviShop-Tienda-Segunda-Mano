import { coreApi } from "../clients/coreApi.client.js";
import { AI_MESSAGES, ANSWER_MESSAGES } from "../constants/ai.constants.js";
import { ANSWER_SUGGESTION, CONDITION_LABELS } from "../constants/shop.constants.js";
import { complete } from "../llm/index.js";
import { ANSWER_ASSISTANT_PROMPT, answerUserMessage } from "../prompts/answer.prompt.js";
import { BadGatewayError, ConflictError, ForbiddenError, NotFoundError } from "../utils/AppError.js";
import { cleanDescription } from "./listing.service.js";

/*
 * Respuesta sugerida a una pregunta de un anuncio. Este servicio sigue SIN base de datos: el anuncio, sus variantes
 * y la pregunta los pide a la API pública (`/shop/products/:slug`, `/variants` y `/questions`). No publica nada: el
 * vendedor la revisa y la publica él (`POST /api/questions/:id/answer`).
 */

const sameId = (a, b) => String(a) === String(b);

/** "Talla M · Azul: 30 € (disponible)", para que el modelo pueda contestar sobre tallas, colores o precios. */
const variantLine = (variant, basePrice) => {
  const options = variant.options?.length ? variant.options.map((o) => `${o.key} ${o.value}`).join(" · ") : "Única";
  return `${options}: ${variant.price ?? basePrice} € (${variant.status})`;
};

export const answerSuggestionService = {
  /**
   * - El anuncio tiene que estar a la venta (404 lo dice la API).
   * - Solo su vendedor (o un admin): se comprueba con datos públicos (`product.sellerId`) y el usuario de la sesión,
   *   que ha validado la API con `/auth/me`. Si no → 403.
   * - La pregunta tiene que ser de ese anuncio, visible (404) y sin respuesta (409).
   */
  async suggest(questionId, { productSlug }, user, signal) {
    const product = await coreApi.getProduct(productSlug);
    const sellerId = product.sellerId ?? product.seller?._id;
    if (!sameId(sellerId, user.id) && user.role !== "admin") throw new ForbiddenError(ANSWER_MESSAGES.ONLY_SELLER);

    const [questions, variants] = await Promise.all([coreApi.productQuestions(productSlug), coreApi.getProductVariants(productSlug)]);
    const question = questions.find((item) => sameId(item._id, questionId));
    if (!question) throw new NotFoundError(ANSWER_MESSAGES.QUESTION_NOT_FOUND);
    if (question.answer) throw new ConflictError(ANSWER_MESSAGES.ALREADY_ANSWERED);

    const completion = await complete({
      messages: [
        { role: "system", content: ANSWER_ASSISTANT_PROMPT },
        {
          role: "user",
          content: answerUserMessage({
            title: product.title,
            description: String(product.description ?? "").slice(0, ANSWER_SUGGESTION.DESCRIPTION_MAX_LENGTH),
            conditionLabel: CONDITION_LABELS[product.condition] ?? product.condition,
            location: product.location,
            price: product.basePrice,
            variants: variants.length > 1 ? variants.map((variant) => variantLine(variant, product.basePrice)) : [],
            question: question.text,
          }),
        },
      ],
      signal,
      user,
    });

    // Lo mismo que la descripción de la A4: sin formato, enlaces, correos ni teléfonos, y recortada por una frase entera.
    const suggestion = cleanDescription(completion.content).slice(0, ANSWER_SUGGESTION.ANSWER_MAX_LENGTH);
    if (suggestion.length < ANSWER_SUGGESTION.ANSWER_MIN_LENGTH) throw new BadGatewayError(AI_MESSAGES.FAILED);
    return { suggestion };
  },
};
