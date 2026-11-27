import { providerInfo } from "../llm/index.js";
import { answerSuggestionService } from "../services/answerSuggestion.service.js";
import { chatService } from "../services/chat.service.js";
import { listingService } from "../services/listing.service.js";
import { reviewSummaryService } from "../services/reviewSummary.service.js";
import { sendSuccess } from "../utils/response.js";

export const getHealth = (_req, res) => {
  sendSuccess(res, { status: "ok", ...providerInfo() });
};

/**
 * Señal que se aborta si el cliente se va (cierra el chat o la pestaña) antes de recibir la respuesta: así no
 * se sigue pagando una respuesta que nadie va a leer. Se escucha el `close` de la respuesta (el de `req` salta
 * en cuanto se ha leído el body).
 */
function abortOnDisconnect(res) {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}

export const postChat = async (req, res, next) => {
  try {
    sendSuccess(res, await chatService.reply(req.body.messages, req.user, abortOnDisconnect(res)));
  } catch (error) {
    next(error);
  }
};

export const postListingDraft = async (req, res, next) => {
  try {
    sendSuccess(res, await listingService.draft(req.body, req.user, abortOnDisconnect(res)));
  } catch (error) {
    next(error);
  }
};

/** Resumen de las valoraciones de un vendedor (público). `null` si aún no hay comentarios suficientes. */
export const getSellerSummary = async (req, res, next) => {
  try {
    sendSuccess(res, await reviewSummaryService.forSeller(req.params.slug));
  } catch (error) {
    next(error);
  }
};

/** Respuesta sugerida a una pregunta de un anuncio (solo su vendedor). No publica nada. */
export const postSuggestAnswer = async (req, res, next) => {
  try {
    sendSuccess(res, await answerSuggestionService.suggest(req.params.id, req.body, req.user, abortOnDisconnect(res)));
  } catch (error) {
    next(error);
  }
};
