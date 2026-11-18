import { providerInfo } from "../llm/index.js";
import { chatService } from "../services/chat.service.js";
import { sendSuccess } from "../utils/response.js";

export const getHealth = (_req, res) => {
  sendSuccess(res, { status: "ok", ...providerInfo() });
};

export const postChat = async (req, res, next) => {
  try {
    sendSuccess(res, await chatService.reply(req.body.messages, req.user));
  } catch (error) {
    next(error);
  }
};
