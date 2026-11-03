import { authService } from "../services/auth.service.js";
import { sendNoContent, sendSuccess } from "../utils/response.js";
import { clearSessionCookie, setSessionCookie } from "../utils/sessionCookie.js";

/** El token va en la cookie `httpOnly`; el cuerpo solo lleva el usuario (JavaScript nunca ve el token). */
export const login = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body);
    setSessionCookie(res, token);
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    sendSuccess(res, await authService.me(req.user.id));
  } catch (error) {
    next(error);
  }
};

/** Idempotente: si la sesión es válida, revoca el token (blacklist); en todos los casos borra la cookie. */
export const logout = async (req, res, next) => {
  try {
    if (req.user) await authService.logout(req.user, req.auth);
    clearSessionCookie(res);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};
