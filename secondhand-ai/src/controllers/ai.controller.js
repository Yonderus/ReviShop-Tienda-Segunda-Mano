import { providerInfo } from "../llm/index.js";
import { chatService } from "../services/chat.service.js";
import { listingService } from "../services/listing.service.js";
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
