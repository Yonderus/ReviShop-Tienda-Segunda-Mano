import { coreApi } from "../clients/coreApi.client.js";
import { AI_MESSAGES, SESSION_COOKIE_NAME } from "../constants/ai.constants.js";
import { UnauthorizedError } from "../utils/AppError.js";

/**
 * Solo con sesión: cada mensaje al asistente cuesta dinero y el límite va por usuario.
 * Sin la cookie ni se pregunta a la API. Con ella, decide la API (`GET /auth/me`): si el token está caducado,
 * revocado o el usuario suspendido, responde 401/403 y aquí se devuelve lo mismo.
 */
export const requireSession = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return next(new UnauthorizedError(AI_MESSAGES.LOGIN_REQUIRED));

  try {
    req.user = await coreApi.me(token);
    next();
  } catch (error) {
    // Un 401 de la API ("token caducado", "sesión cerrada"…) se traduce al mensaje del asistente.
    next(error instanceof UnauthorizedError ? new UnauthorizedError(AI_MESSAGES.LOGIN_REQUIRED) : error);
  }
};
