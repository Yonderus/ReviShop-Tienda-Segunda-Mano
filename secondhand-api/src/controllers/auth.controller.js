import { authService } from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { sendNoContent, sendSuccess } from "../utils/response.js";
import { clearAuthCookies, refreshToken, setAuthCookies } from "../utils/sessionCookie.js";

/*
 * Los tokens van SIEMPRE en cookies `httpOnly` (JavaScript nunca los ve). El cuerpo solo lleva el usuario y
 * `accessExpiresAt` (cuándo caduca el access, que no es secreto): con él, el front renueva antes de tiempo.
 */

const userAgentOf = (req) => req.get("User-Agent") ?? null;

export const login = async (req, res, next) => {
  try {
    const { accessToken, refresh, user } = await authService.login(req.body, { userAgent: userAgentOf(req) });
    const accessExpiresAt = setAuthCookies(res, { accessToken, refresh });
    sendSuccess(res, { user, accessExpiresAt });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambia el refresh de la cookie por uno nuevo y da un access nuevo. Si el refresh ya no vale (401), se borran las
 * dos cookies: no sirven para nada. Si es el 409 de dos pestañas a la vez, NO se borran: el navegador ya tiene las
 * buenas, las que puso la otra pestaña.
 */
export const refresh = async (req, res, next) => {
  try {
    const { accessToken, refresh: renewed, user } = await authService.refresh(refreshToken(req), { userAgent: userAgentOf(req) });
    const accessExpiresAt = setAuthCookies(res, { accessToken, refresh: renewed });
    sendSuccess(res, { user, accessExpiresAt });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) clearAuthCookies(res);
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

/** Idempotente: revoca lo que haya (access y sesión de refresh) y en todos los casos borra las dos cookies. */
export const logout = async (req, res, next) => {
  try {
    await authService.logout({ user: req.user ?? null, auth: req.auth ?? null, refreshToken: refreshToken(req) });
    clearAuthCookies(res);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

/** Cierra la sesión en todos los dispositivos. */
export const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user, req.auth);
    clearAuthCookies(res);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};
